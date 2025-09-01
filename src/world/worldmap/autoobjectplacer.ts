// ObjectPlacer.ts
import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { PlaneGeometry } from 'three';

/* ------------------------------ Public Types ------------------------------ */

export interface PlacementInfo {
  /** 월드 좌표로 반환합니다 (scene 루트에 직접 attach 가능) */
  position: THREE.Vector3;
  scale: number;
  /** 월드 Y축 기준 yaw (라디안) */
  rotation: number;
}

export interface PlacementResult {
  trees: PlacementInfo[];
  rocks: PlacementInfo[];
  plants: PlacementInfo[];
  flowers: PlacementInfo[];
}

export interface PlacementOptions {
  seed: number;

  /** 물 높이(수위) — "메쉬 로컬 Y" 기준입니다. 미지정 시 자동으로 (minLocalY - ε) 사용 */
  waterLevel: number;
  /** 해안 띠 두께 — "메쉬 로컬 Y" 기준 */
  shoreBand: number;

  /** % 확률 (0~100) */
  treeDensity: number;
  rockDensity: number;
  plantDensity: number;
  flowerDensity: number;

  /** 최소 간격 반경(월드 단위로 간주) */
  minR_tree: number;
  minR_rock: number;
  minR_plant: number;
  minR_flower: number;

  /** 식생 판정에 쓰는 녹색 비율 임계치 [low, high] */
  greenThresholds: [number, number];
}

/* ------------------------------ Internal Types ------------------------------ */

interface PlacedUV {
  u: number; v: number; rWorld: number;
}

interface SampledPoint {
  /** 메쉬 "로컬" 표면 좌표 (x,y,z 보간) */
  pLocal: THREE.Vector3;
  /** 색상 (DataTexture 또는 정점색 보간 결과) */
  color: THREE.Color;
  /** 보간된 정점 UV (0..1) */
  uv: THREE.Vector2;
}

/* --------------------------------- Module --------------------------------- */

export class ObjectPlacer {
  private gui: GUI | null = null;

  constructor() {}

  /**
   * 회전/이동/스케일된 Plane도 정확히 처리합니다.
   * - 샘플링은 UV 기반 (u,v∈[0,1))으로 수행
   * - 표면 위치는 정점(x,y,z) 보간으로 획득 → localToWorld로 월드 좌표 반환
   * - 색상은 정점 UV 보간 후 DataTexture를 그대로 CPU 샘플(뒤집기 없음)하거나, 정점색 보간 사용
   */
  public generate(
  groundMesh: THREE.Mesh,
  dataTexture?: THREE.DataTexture,
  opts?: Partial<PlacementOptions>,
): PlacementResult {
  if (!(groundMesh.geometry instanceof PlaneGeometry)) {
    throw new Error('Input mesh must be THREE.PlaneGeometry.');
  }

  const geometry = groundMesh.geometry as PlaneGeometry;

  /* ---------- 1) Options / inputs ---------- */
  const defaults: PlacementOptions = {
    seed: 12345,
    waterLevel: 0,       // (로컬 Y 기준) 미지정 시 아래에서 자동 보정
    shoreBand: 1.5,      // (현재 사용 안 함: 꽃에 해안 필수 제거)
    treeDensity: 1.8,    // % 확률 (pass별 thinning에 사용)
    rockDensity: 1.0,
    plantDensity: 2.8,
    flowerDensity: 5.5,
    minR_tree: 2.5,      // 월드 단위
    minR_rock: 2.8,
    minR_plant: 1.1,
    minR_flower: 0.8,
    greenThresholds: [0.35, 0.6],
  };
  const options: PlacementOptions = { ...defaults, ...(opts ?? {}) };

  // 색상 소스 (DataTexture 우선)
  const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
  const colorSource: THREE.DataTexture | THREE.BufferAttribute | undefined =
    dataTexture ?? colorAttr;
  if (!colorSource) {
    throw new Error('A color source (DataTexture or vertex colors) is required.');
  }

  // 수면 자동 보정 (로컬 Y 기준): 사용자가 waterLevel을 지정하지 않았다면, 최저면보다 살짝 아래로.
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const autoWaterLevel =
    opts && Object.prototype.hasOwnProperty.call(opts, 'waterLevel')
      ? options.waterLevel
      : (bb.min.y - 1e-4);

  const { width, height } = geometry.parameters;
  const rnd = this.xorshift32(options.seed);

  /* ---------- 2) Result + shared collision (UV-space Poisson disk) ---------- */
  const results: PlacementResult = { trees: [], rocks: [], plants: [], flowers: [] };
  const uvOccupied: Array<{ u: number; v: number; rWorld: number }> = [];

  // UV 공간 충돌 검사: rWorld(월드 단위)를 plane 폭/높이에 맞춰 비교
  const pushIfFreeUv = (u0: number, v0: number, rWorld: number): boolean => {
    for (const q of uvOccupied) {
      const du = (q.u - u0) * width;
      const dv = (q.v - v0) * height;
      const rr = q.rWorld + rWorld;
      if (du * du + dv * dv < rr * rr) return false;
    }
    uvOccupied.push({ u: u0, v: v0, rWorld });
    return true;
  };

  /* ---------- 3) Small helpers ---------- */
  const saturate = (x: number) => Math.max(0, Math.min(1, x));
  const sumRGB = (c: THREE.Color) => Math.max(0.001, c.r + c.g + c.b);
  const greeninessOf = (c: THREE.Color) => c.g / sumRGB(c);

  // UV 샘플 → 표면/색상(로컬), 수면 체크, 월드 좌표까지
  const trySample = (u: number, v: number) => {
    const sp = this.sampleByUv(u, v, geometry, colorSource!);
    if (!sp) return null;
    const { pLocal, color, uv } = sp;
    if (pLocal.y < autoWaterLevel) return null; // 로컬 수면 아래 제외
    const pWorld = pLocal.clone(); groundMesh.localToWorld(pWorld);
    return { pLocal, pWorld, color, uv };
  };

  // 일반(비클러스터) 패스: 균일 샘플→조건 통과→충돌→배치
  const runPass = (
    trials: number,
    accept: (g: number) => boolean,  // greeniness 기반 수락 조건
    rWorld: number,
    out: PlacementInfo[],
    sclMin: number, sclRnd: number,
    prob: number // 0..1 thinning 확률
  ) => {
    for (let k = 0; k < trials; k++) {
      const u = rnd(), v = rnd();
      const s = trySample(u, v); if (!s) continue;
      const g = greeninessOf(s.color);
      if (!accept(g)) continue;
      if (prob < 1 && rnd() >= prob) continue;
      if (!pushIfFreeUv(s.uv.x, s.uv.y, rWorld)) continue;

      out.push({
        position: s.pWorld.clone(),                 // 월드 좌표
        scale: sclMin + rnd() * sclRnd,
        rotation: rnd() * Math.PI * 2,              // 월드 Y 기준 yaw
      });
    }
  };

  // 정규분포(가우시안) 샘플러 (Box–Muller)
  const randNorm = () => {
    const u1 = Math.max(1e-9, rnd());
    const u2 = rnd();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  };

  // Thomas 클러스터 패스: 부모-자식 방식으로 군집 생성
  const runThomasClusterPass = (
    nParents: number,         // 부모(클러스터 중심) 수
    muChildren: number,       // 자식 평균 수 (Poisson 평균)
    sigmaUV: number,          // 자식 분산(가우시안) [UV 단위]
    rWorld: number,           // 충돌 반경(월드)
    out: PlacementInfo[],
    sclMin: number, sclRnd: number,
    probFromSample: (g: number) => number // 샘플 색상(greeniness) 기반 확률(0..1)
  ) => {
    // 포아송(μ) 난수
    const drawPoisson = (mu: number) => {
      // Knuth
      const L = Math.exp(-mu);
      let k = 0, p = 1.0;
      do { k++; p *= rnd(); } while (p > L);
      return Math.max(0, k - 1);
    };

    for (let i = 0; i < nParents; i++) {
      const uc = rnd(), vc = rnd();              // 부모 중심(균일)
      const nChildren = drawPoisson(muChildren); // 자식 수

      for (let j = 0; j < nChildren; j++) {
        // 부모 주변 가우시안 산포 (UV)
        const u = uc + sigmaUV * randNorm();
        const v = vc + sigmaUV * randNorm();
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;

        const s = trySample(u, v); if (!s) continue;
        const g = greeninessOf(s.color);
        const p = saturate(probFromSample(g));   // 0..1
        if (rnd() > p) continue;

        if (!pushIfFreeUv(s.uv.x, s.uv.y, rWorld)) continue;

        out.push({
          position: s.pWorld.clone(),
          scale: sclMin + rnd() * sclRnd,
          rotation: rnd() * Math.PI * 2,
        });
      }
    }
  };

  /* ---------- 4) Passes (order matters: 큰 반경 → 작은 반경) ---------- */
  const [thrLow, thrHigh] = options.greenThresholds;
  const attempts = Math.max(1, Math.floor(width * height * 0.18));
  const T = attempts;

  // (A) Trees — 억제(regular). 초록도 높음 우선 + 중간 구간 일부 허용.
  runPass(
    Math.floor(T * 0.8),
    (g) => g >= thrHigh || (g >= thrLow && rnd() < 0.35),
    options.minR_tree,
    results.trees,
    0.9, 0.6,
    Math.min(1, (options.treeDensity / 100) * 1.2)
  );

  // (B) Rocks — 초록도 낮은 곳
  runPass(
    Math.floor(T * 0.6),
    (g) => g < thrLow,
    options.minR_rock,
    results.rocks,
    0.7, 0.8,
    options.rockDensity / 100
  );

  // (C) Plants — 클러스터(Thomas). 중간 초록도 선호 (삼각형 가중).
  // 삼각형 가중: mid에서 1, 양끝에서 0
  const mid = 0.5 * (thrLow + thrHigh);
  const widthTri = Math.max(1e-6, (thrHigh - thrLow));
  const plantWeight = (g: number) => {
    const t = 1 - Math.abs(g - mid) / (0.5 * widthTri);
    const tri = saturate(t);                  // 0..1
    const dens = saturate(options.plantDensity / 100);
    return saturate(0.25 + 0.75 * tri) * (0.4 + 0.6 * dens); // 완만한 조절
  };
  runThomasClusterPass(
    /* nParents   */ Math.max(12, Math.floor((width * height) / 180)),
    /* muChildren */ Math.max(6, Math.round(8 * (1 + options.plantDensity / 20))),
    /* sigmaUV    */ 0.035,
    /* rWorld     */ options.minR_plant,
    /* out        */ results.plants,
    /* scale      */ 0.8, 0.6,
    /* prob(g)    */ plantWeight
  );

  // (D) Flowers — 클러스터 + 소량 균일 뿌리기. (해안 의존 제거)
  // 꽃은 중간~높은 초록도 선호를 약하게 부여
  const flowerWeight = (g: number) => {
    // 중간 이상에서 살짝 우대 (너무 높으면 나무 구간이므로 약화)
    const up = saturate((g - (0.5 * thrLow)) / Math.max(1e-6, (thrHigh - 0.5 * thrLow)));
    const down = saturate((thrHigh - g) / Math.max(1e-6, (thrHigh - thrLow)));
    const bell = 0.6 * up + 0.4 * down; // 0..1
    const dens = saturate(options.flowerDensity / 100);
    return saturate(0.3 + 0.7 * bell) * (0.4 + 0.6 * dens);
  };
  runThomasClusterPass(
    /* nParents   */ Math.max(10, Math.floor((width * height) / 260)),
    /* muChildren */ Math.max(4, Math.round(6 * (1 + options.flowerDensity / 25))),
    /* sigmaUV    */ 0.03,
    /* rWorld     */ options.minR_flower,
    /* out        */ results.flowers,
    /* scale      */ 0.7, 0.6,
    /* prob(g)    */ flowerWeight
  );

  // (E) Flowers sprinkle — 소량 균일 추가로 과도한 덩어리감 완화
  const sprinkleTrials = Math.floor(T * 0.15);
  for (let t = 0; t < sprinkleTrials; t++) {
    const u = rnd(), v = rnd();
    const s = trySample(u, v); if (!s) continue;
    const g = greeninessOf(s.color);
    const p = (options.flowerDensity / 100) * saturate(0.4 + 0.6 * g);
    if (rnd() > p) continue;
    if (!pushIfFreeUv(s.uv.x, s.uv.y, options.minR_flower)) continue;

    results.flowers.push({
      position: s.pWorld.clone(),
      scale: 0.7 + rnd() * 0.6,
      rotation: rnd() * Math.PI * 2,
    });
  }

  return results;
}


  /* ------------------------------ Debug GUI ------------------------------ */

  public createDebugGUI(initialOptions: PlacementOptions, onUpdate: (newOptions: PlacementOptions) => void): void {
    if (this.gui) this.gui.destroy();
    this.gui = new GUI();
    const options = { ...initialOptions };
    const regenerate = () => onUpdate(options);

    this.gui.add(options, 'seed', 1, 99999, 1).name('Seed').onFinishChange(regenerate);

    const fMap = this.gui.addFolder('Map');
    fMap.add(options, 'waterLevel', -10, 10, 0.1).name('Water Level (Local Y)').onChange(regenerate);
    fMap.add(options, 'shoreBand', 0, 5, 0.1).name('Shore Band (Local Y)').onChange(regenerate);

    const fD = this.gui.addFolder('Densities');
    fD.add(options, 'treeDensity', 0, 100, 0.1).name('Trees %').onChange(regenerate);
    fD.add(options, 'rockDensity', 0, 100, 0.1).name('Rocks %').onChange(regenerate);
    fD.add(options, 'plantDensity', 0, 100, 0.1).name('Plants %').onChange(regenerate);
    fD.add(options, 'flowerDensity', 0, 100, 0.1).name('Flowers %').onChange(regenerate);

    const fR = this.gui.addFolder('Min Radius (world)');
    fR.add(options, 'minR_tree', 0.1, 10, 0.1).name('Tree R').onChange(regenerate);
    fR.add(options, 'minR_rock', 0.1, 10, 0.1).name('Rock R').onChange(regenerate);
    fR.add(options, 'minR_plant', 0.05, 5, 0.05).name('Plant R').onChange(regenerate);
    fR.add(options, 'minR_flower', 0.05, 5, 0.05).name('Flower R').onChange(regenerate);

    this.gui.add({ regen: regenerate }, 'regen').name('Regenerate');
  }

  /* ------------------------------ Internals ------------------------------ */

  private xorshift32(seed: number): () => number {
    let x = seed | 0;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  /**
   * UV(0..1)에서 샘플:
   * - 정점(x,y,z) 보간 → pLocal
   * - 정점 UV 보간 → uv (GPU와 동일 기준)
   * - DataTexture인 경우 uv로 CPU 샘플(뒤집기/보정 없이 배열 그대로)
   * - 정점색인 경우 보간
   */
  private sampleByUv(
    u: number,
    v: number,
    geometry: PlaneGeometry,
    colorSource: THREE.DataTexture | THREE.BufferAttribute
  ): SampledPoint | null {
    const { widthSegments, heightSegments } = geometry.parameters;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;

    const gridX = Math.min(Math.floor(u * widthSegments), widthSegments - 1);
    const gridY = Math.min(Math.floor(v * heightSegments), heightSegments - 1);
    const fu = u * widthSegments - gridX;
    const fv = v * heightSegments - gridY;

    const vertsPerRow = widthSegments + 1;
    const idx = (ii: number, jj: number) => jj * vertsPerRow + ii;

    const ia = idx(gridX,     gridY    );
    const ib = idx(gridX + 1, gridY    );
    const ic = idx(gridX + 1, gridY + 1);
    const id = idx(gridX,     gridY + 1);

    // PlaneGeometry의 대각선 분할 규칙(a-b-d, b-c-d)에 맞춘 가중치
    let wA=0, wB=0, wC=0, wD=0;
    if (fu + fv <= 1) { wA = 1 - fu - fv; wB = fu; wD = fv; }
    else { wB = 1 - fv; wC = fu + fv - 1; wD = 1 - fu; }

    // 정점 위치 → pLocal
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const va = new THREE.Vector3(pos.getX(ia), pos.getY(ia), pos.getZ(ia));
    const vb = new THREE.Vector3(pos.getX(ib), pos.getY(ib), pos.getZ(ib));
    const vc = new THREE.Vector3(pos.getX(ic), pos.getY(ic), pos.getZ(ic));
    const vd = new THREE.Vector3(pos.getX(id), pos.getY(id), pos.getZ(id));
    const pLocal = new THREE.Vector3()
      .addScaledVector(va, wA)
      .addScaledVector(vb, wB)
      .addScaledVector(vc, wC)
      .addScaledVector(vd, wD);

    // 정점 UV → 보간된 uv
    const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;
    const uva = new THREE.Vector2(uvAttr.getX(ia), uvAttr.getY(ia));
    const uvb = new THREE.Vector2(uvAttr.getX(ib), uvAttr.getY(ib));
    const uvc = new THREE.Vector2(uvAttr.getX(ic), uvAttr.getY(ic));
    const uvd = new THREE.Vector2(uvAttr.getX(id), uvAttr.getY(id));
    const uv = new THREE.Vector2()
      .addScaledVector(uva, wA)
      .addScaledVector(uvb, wB)
      .addScaledVector(uvc, wC)
      .addScaledVector(uvd, wD);

    // 색상
    const color = new THREE.Color();
    if (colorSource instanceof THREE.DataTexture) {
      const tex = colorSource;
      const tw = (tex.image as any).width as number;
      const th = (tex.image as any).height as number;
      const data = (tex.image as any).data as ArrayLike<number>;
      if (!tw || !th || !data) {
        color.setRGB(0.5, 0.5, 0.5);
      } else {
        // CPU에서는 flipY 보정 없이 배열을 "있는 그대로" 읽습니다.
        const tx = Math.min(tw - 1, Math.max(0, Math.floor(uv.x * (tw - 1))));
        const ty = Math.min(th - 1, Math.max(0, Math.floor(uv.y * (th - 1))));

        const stride = tex.format === THREE.RGBAFormat ? 4 : 3;
        const base = (ty * tw + tx) * stride;

        const isFloatish = tex.type === THREE.FloatType || (THREE as any).HalfFloatType === tex.type;
        const norm = (val: number) => (isFloatish ? val : val / 255);

        color.setRGB(norm(data[base]), norm(data[base + 1]), norm(data[base + 2]));
      }
    } else {
      const col = colorSource as THREE.BufferAttribute;
      const r = wA*col.getX(ia) + wB*col.getX(ib) + wC*col.getX(ic) + wD*col.getX(id);
      const g = wA*col.getY(ia) + wB*col.getY(ib) + wC*col.getY(ic) + wD*col.getY(id);
      const b = wA*col.getZ(ia) + wB*col.getZ(ib) + wC*col.getZ(ic) + wD*col.getZ(id);
      color.setRGB(r, g, b);
    }

    return { pLocal, color, uv };
  }
}
