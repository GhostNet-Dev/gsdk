// ObjectPlacer.ts
import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { PlaneGeometry } from 'three';

/* ------------------------------ Public Types ------------------------------ */
// PlacementInfo: kind 추가
export interface PlacementInfo {
  position: THREE.Vector3;  // 월드 좌표
  scale: number;
  rotation: THREE.Euler;         // 월드 Y축 기준 yaw (rad)
  kind: number;             // 0..(numKinds_* - 1)
}

// PlacementOptions: 각 그룹의 종 개수 추가 (기본 5)

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

  numKinds_tree: number;    // 기본 5
  numKinds_rock: number;    // 기본 5
  numKinds_plant: number;   // 기본 5
  numKinds_flower: number;  // 기본 5

  sameKindBoostAlpha?: number;   // 동종 근접 보너스 계수 (기본 0.35 권장)
  sameKindBoostRadius?: number;  // 보너스 반경(월드 단위, 기본 2.0 권장)
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

  constructor() { }

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

    /* ---------- Options / defaults (includes kind & clustering knobs) ---------- */
    const defaults: PlacementOptions = {
      seed: 12345,
      waterLevel: 0,     // 로컬 Y 기준 (아래서 auto 보정)
      shoreBand: 1.5,    // (현재 로직에선 사용 안 함)
      treeDensity: 8,
      rockDensity: 1.0,
      plantDensity: 2.8,
      flowerDensity: 5.5,
      minR_tree: 2.5,
      minR_rock: 2.8,
      minR_plant: 1.1,
      minR_flower: 0.8,
      greenThresholds: [0.35, 0.6],
      // ★ 종 종류 수 (각 5종 기본)
      numKinds_tree: 15 as any,
      numKinds_rock: 5 as any,
      numKinds_plant: 5 as any,
      numKinds_flower: 5 as any,
      // ★ 동종 근접 보너스
      sameKindBoostAlpha: 0.35 as any,   // 근처 같은 종 1개마다 +35% 가중
      sameKindBoostRadius: 2.0 as any,   // 보너스 반경(월드)
    } as unknown as PlacementOptions;

    const options: PlacementOptions = { ...defaults, ...(opts ?? {}) };

    // 색상 소스 (DataTexture 우선)
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    const colorSource: THREE.DataTexture | THREE.BufferAttribute | undefined =
      dataTexture ?? colorAttr;
    if (!colorSource) throw new Error('A color source (DataTexture or vertex colors) is required.');

    // 수면 자동 보정: waterLevel 미지정 시 minLocalY - ε
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const autoWaterLevel =
      opts && Object.prototype.hasOwnProperty.call(opts, 'waterLevel')
        ? options.waterLevel
        : (bb.min.y - 1e-4);

    const { width, height } = geometry.parameters;
    const area = width * height;
    const rnd = this.xorshift32(options.seed);

    /* ---------- Results + shared collision (UV-space hard-core) ---------- */
    const results: PlacementResult = { trees: [], rocks: [], plants: [], flowers: [] };
    const uvOccupied: Array<{ u: number; v: number; rWorld: number }> = [];

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

    /* ---------- Helpers: color metrics (Linear), masks, random, etc. ---------- */
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const srgbToLinear = (c: number) => (c <= 0.04045) ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const toLinear = (col: THREE.Color) =>
      new THREE.Color(srgbToLinear(col.r), srgbToLinear(col.g), srgbToLinear(col.b));
    const metrics = (colLin: THREE.Color) => {
      const r = colLin.r, g = colLin.g, b = colLin.b;
      const sum = r + g + b + 1e-6;
      const gness = g / sum;                 // 녹색 비중 (Linear)
      const exg = 2 * g - r - b;             // Excess Green
      const ndi = (g - r) / (g + r + 1e-6);// NDI (G-R)/(G+R)
      return { gness, exg, ndi };
    };

    const [thrLow, thrHigh] = options.greenThresholds;
    // ★ 흙(맨흙/모래/황토) 마스크: 흙에서는 바위만 허용, 식생은 차단
    const isBareSoil = (m: { gness: number; exg: number; ndi: number }) => {
      // 예: thrLow가 0.5면, gness<0.46 또는 (ndi 낮고 exg 낮음) 조건에서 흙으로 분류
      return (m.gness < (thrLow * 0.92)) || (m.ndi < -0.05 && m.exg < 0.12);
    };

    // 샘플 얻기 (UV→표면/색상). 수면 아래 제외.
    const trySample = (u: number, v: number) => {
      const sp = this.sampleByUv(u, v, geometry, colorSource!);
      if (!sp) return null;
      const { pLocal, color, uv } = sp;
      if (pLocal.y < autoWaterLevel) return null;
      const pWorld = pLocal.clone(); groundMesh.localToWorld(pWorld);
      return { pLocal, pWorld, color, uv };
    };

    const chooseKind = (k: number) => Math.floor(rnd() * Math.max(1, k));
    const randNorm = () => {                 // Box–Muller
      const u1 = Math.max(1e-9, rnd()), u2 = rnd();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    // 동종 근접 보너스용 기록
    const placedUvByKind = new Map<number, Array<{ u: number; v: number }>>();
    const rememberPlacedUvKind = (kind: number, u: number, v: number) => {
      const arr = placedUvByKind.get(kind) ?? [];
      arr.push({ u, v });
      placedUvByKind.set(kind, arr);
    };
    const countNeighborsSameKind = (kind: number, u: number, v: number, rWorld: number) => {
      const arr = placedUvByKind.get(kind);
      if (!arr || !arr.length) return 0;
      const r2 = rWorld * rWorld;
      let cnt = 0;
      for (const p of arr) {
        const du = (u - p.u) * width;
        const dv = (v - p.v) * height;
        if (du * du + dv * dv < r2) cnt++;
      }
      return cnt;
    };

    /* ---------- Prob functions (no baseline in low green) ---------- */
    // g: Linear greeniness (0..1)
    const treeProb = (g: number) => {
      const base = (g >= thrHigh) ? 1.0 : (g >= thrLow ? 0.35 : 0.0);
      return clamp01(base * (options.treeDensity / 100) * 1.3);
    };
    const plantProb = (g: number) => {
      const mid = 0.5 * (thrLow + thrHigh);
      const widthTri = Math.max(1e-6, (thrHigh - thrLow));
      const tri = Math.max(0, 1 - Math.abs(g - mid) / (0.5 * widthTri)); // 0..1
      const dens = clamp01(options.plantDensity / 100);
      return tri * (0.4 + 0.6 * dens);   // tri=0이면 0
    };
    const flowerProb = (g: number) => {
      const up = clamp01((g - (0.8 * thrLow)) / Math.max(1e-6, (thrHigh - 0.8 * thrLow)));
      const down = clamp01((thrHigh - g) / Math.max(1e-6, (thrHigh - thrLow)));
      const bell = clamp01(0.6 * up + 0.4 * down);
      const dens = clamp01(options.flowerDensity / 100);
      return bell * (0.4 + 0.6 * dens);  // bell=0이면 0
    };

    /* ---------- Pass runners (uniform & hierarchical with same-kind boost) ---------- */
    // 균일(비클러스터) 패스: gate(흙/식생) → 확률/충돌 → 배치(+kind)
    const runPassKinds = (
      trials: number,
      gate: (m: { gness: number; exg: number; ndi: number }) => boolean,
      probFromG: (g: number) => number,
      rWorld: number,
      out: PlacementInfo[],
      sclMin: number, sclRnd: number,
      chooseKindFn: () => number,
    ) => {
      for (let k = 0; k < trials; k++) {
        const u = rnd(), v = rnd();
        const s = trySample(u, v); if (!s) continue;

        const m = metrics(toLinear(s.color));
        if (!gate(m)) continue;

        const g = m.gness;
        const p = clamp01(probFromG(g));
        if (rnd() > p) continue;

        if (!pushIfFreeUv(s.uv.x, s.uv.y, rWorld)) continue;
        out.push({
          position: s.pWorld.clone(),
          scale: sclMin + rnd() * sclRnd,
          rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'),
          kind: chooseKindFn(),
        });
      }
    };

    // 계층형(슈퍼→부모→자식) 클러스터: 부모단위 kind 고정 + 동종 근접 보너스
    const runHierClusterPassKinds = (
      nSuper: number,
      parentsPerSuper: number,
      sigmaSuperUV: number,
      muChildren: number,
      sigmaChildUV: number,
      gate: (m: { gness: number; exg: number; ndi: number }) => boolean,
      probFromG: (g: number) => number,
      rWorld: number,
      out: PlacementInfo[],
      sclMin: number, sclRnd: number,
      chooseParentKind: () => number,
    ) => {
      const drawPoisson = (mu: number) => {
        const L = Math.exp(-mu); let k = 0, p = 1;
        do { k++; p *= rnd(); } while (p > L);
        return Math.max(0, k - 1);
      };
      const alpha = options.sameKindBoostAlpha as unknown as number || 0;
      const boostR = options.sameKindBoostRadius as unknown as number || 0;

      for (let sIdx = 0; sIdx < nSuper; sIdx++) {
        const us = rnd(), vs = rnd(); // 슈퍼 중심
        for (let pIdx = 0; pIdx < parentsPerSuper; pIdx++) {
          const up = us + sigmaSuperUV * randNorm();
          const vp = vs + sigmaSuperUV * randNorm();
          if (up < 0 || up > 1 || vp < 0 || vp > 1) continue;

          const parentKind = chooseParentKind();
          const nChildren = drawPoisson(muChildren);

          for (let j = 0; j < nChildren; j++) {
            const u = up + sigmaChildUV * randNorm();
            const v = vp + sigmaChildUV * randNorm();
            if (u < 0 || u > 1 || v < 0 || v > 1) continue;

            const s = trySample(u, v); if (!s) continue;

            const m = metrics(toLinear(s.color));
            if (!gate(m)) continue;

            const g = m.gness;
            const pBase = clamp01(probFromG(g));

            let pFinal = pBase;
            if (alpha > 0 && boostR > 0) {
              const neigh = countNeighborsSameKind(parentKind, s.uv.x, s.uv.y, boostR);
              pFinal = clamp01(pBase * (1 + alpha * neigh)); // 동종 근접 보너스
            }
            if (rnd() > pFinal) continue;

            if (!pushIfFreeUv(s.uv.x, s.uv.y, rWorld)) continue;

            out.push({
              position: s.pWorld.clone(),
              scale: sclMin + rnd() * sclRnd,
              rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'),
              kind: parentKind,
            });
            rememberPlacedUvKind(parentKind, s.uv.x, s.uv.y);
          }
        }
      }
    };

    /* ---------- Pass ordering (rocks first, then vegetation) ---------- */
    const attempts = Math.max(1, Math.floor(area * 0.18));
    const T = attempts;

    // Gate functions
    const gateRock = (m: { gness: number; exg: number; ndi: number }) => isBareSoil(m);
    const gateVegetate = (m: { gness: number; exg: number; ndi: number }) => !isBareSoil(m);

    // 1) Rocks — 흙에서만, 먼저 선점 (kind 랜덤)
    runPassKinds(
      Math.floor(T * 0.9),
      gateRock,
      (_g) => clamp01(options.rockDensity / 100 + 0.05), // 약간 가산
      options.minR_rock,
      results.rocks,
      0.7, 0.8,
      () => chooseKind(options.numKinds_rock as unknown as number),
    );

    // 2) Trees — 계층형 클러스터 + 동종 보너스 (식생 구역만)
    runHierClusterPassKinds(
      Math.max(6, Math.floor(area / 700)),  // nSuper
      3,                                    // parents/super
      0.08,                                 // sigmaSuperUV
      Math.max(3, Math.round(5 * (1 + options.treeDensity / 20))),
      0.03,                                 // sigmaChildUV
      gateVegetate,
      treeProb,
      options.minR_tree,
      results.trees,
      0.9, 0.6,
      () => chooseKind(options.numKinds_tree as unknown as number),
    );

    // 3) Plants — 계층형 클러스터 (식생 구역만)
    runHierClusterPassKinds(
      Math.max(10, Math.floor(area / 200)),
      4,
      0.06,
      Math.max(6, Math.round(8 * (1 + options.plantDensity / 20))),
      0.02,
      gateVegetate,
      plantProb,
      options.minR_plant,
      results.plants,
      0.8, 0.6,
      () => chooseKind(options.numKinds_plant as unknown as number),
    );

    // 4) Flowers — 계층형 클러스터 (식생 구역만)
    runHierClusterPassKinds(
      Math.max(8, Math.floor(area / 280)),
      3,
      0.05,
      Math.max(4, Math.round(6 * (1 + options.flowerDensity / 25))),
      0.018,
      gateVegetate,
      flowerProb,
      options.minR_flower,
      results.flowers,
      0.7, 0.6,
      () => chooseKind(options.numKinds_flower as unknown as number),
    );

    // 5) Flowers sprinkle — 소량 균일(식생 구역만), 덩어리감 완화
    const sprinkleTrials = Math.floor(T * 0.15);
    for (let t = 0; t < sprinkleTrials; t++) {
      const u = rnd(), v = rnd();
      const s = trySample(u, v); if (!s) continue;

      const m = metrics(toLinear(s.color));
      if (!gateVegetate(m)) continue;

      const p = clamp01((options.flowerDensity / 100) * (0.4 + 0.6 * m.gness));
      if (rnd() > p) continue;
      if (!pushIfFreeUv(s.uv.x, s.uv.y, options.minR_flower)) continue;

      results.flowers.push({
        position: s.pWorld.clone(),
        scale: 0.7 + rnd() * 0.6,
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'),
        kind: chooseKind(options.numKinds_flower as unknown as number),
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
  backgreen = 0
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

    const ia = idx(gridX, gridY);
    const ib = idx(gridX + 1, gridY);
    const ic = idx(gridX + 1, gridY + 1);
    const id = idx(gridX, gridY + 1);

    // PlaneGeometry의 대각선 분할 규칙(a-b-d, b-c-d)에 맞춘 가중치
    let wA = 0, wB = 0, wC = 0, wD = 0;
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

        // ↓↓↓ DEBUG: 처음 8샘플 정도만 로그
        const r = color.r;
        const g = color.g;
        const b = color.b;
        const green = g / (r + g + b);
        if (this.backgreen != Number(green.toFixed(2))) {
          this.backgreen = Number(green.toFixed(2));
          console.log("[placer][texSample--]",
            {
              green, r, g, b, u, v, tx, ty, stride, base,
              raw: [data[base], data[base + 1], data[base + 2]],
              flipY: (colorSource as any).flipY
            }
          );
        }
        (this as any)._dbgTexSamples = ((this as any)._dbgTexSamples ?? 0);
        if ((this as any)._dbgTexSamples < 5) {
          (this as any)._dbgTexSamples++;
          console.log("[placer][texSample]",
            {
              green, r, g, b, u, v, tx, ty, stride, base,
              raw: [data[base], data[base + 1], data[base + 2]],
              flipY: (colorSource as any).flipY
            }
          );
        }
      }
    } else {
      const col = colorSource as THREE.BufferAttribute;
      const r = wA * col.getX(ia) + wB * col.getX(ib) + wC * col.getX(ic) + wD * col.getX(id);
      const g = wA * col.getY(ia) + wB * col.getY(ib) + wC * col.getY(ic) + wD * col.getY(id);
      const b = wA * col.getZ(ia) + wB * col.getZ(ib) + wC * col.getZ(ic) + wD * col.getZ(id);
      color.setRGB(r, g, b);
    }

    return { pLocal, color, uv };
  }
}
