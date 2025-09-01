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
    const defaults: PlacementOptions = {
      seed: 12345,
      waterLevel: 0,      // 로컬 Y 기준 (아래에서 자동 보정됨)
      shoreBand: 1.5,
      treeDensity: 1.8,
      rockDensity: 1.0,
      plantDensity: 2.8,
      flowerDensity: 5.5,
      minR_tree: 2.5,
      minR_rock: 2.8,
      minR_plant: 1.1,
      minR_flower: 0.8,
      greenThresholds: [0.35, 0.6],
    };
    const options: PlacementOptions = { ...defaults, ...(opts ?? {}) };

    // 색상 소스 결정 (DataTexture 우선)
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    const colorSource: THREE.DataTexture | THREE.BufferAttribute | undefined = dataTexture ?? colorAttr;
    if (!colorSource) throw new Error('A color source (DataTexture or vertex colors) is required.');

    // 수면 높이 자동 보정: waterLevel 미지정이면 minLocalY-ε 사용 (절반 컷 방지)
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const autoWaterLevel =
      opts && Object.prototype.hasOwnProperty.call(opts, 'waterLevel')
        ? options.waterLevel
        : (bb.min.y - 1e-4);

    const { width, height } = geometry.parameters;
    const rnd = this.xorshift32(options.seed);

    const results: PlacementResult = { trees: [], rocks: [], plants: [], flowers: [] };
    const uvOccupied: PlacedUV[] = [];

    // UV 공간에서의 충돌 판정 (반경은 월드 단위 → UV 스케일로 비교)
    const pushIfFreeUv = (u0: number, v0: number, rWorld: number): boolean => {
      for (const q of uvOccupied) {
        // UV를 plane의 실제 가로/세로 길이로 환산해 같은 단위로 비교
        const du = (q.u - u0) * width;
        const dv = (q.v - v0) * height;
        const rr = (q.rWorld + rWorld);
        if (du * du + dv * dv < rr * rr) return false;
      }
      uvOccupied.push({ u: u0, v: v0, rWorld });
      return true;
    };

    // 샘플 횟수 (면적 비례 기본값)
    const attempts = Math.floor(width * height * 0.18);

    for (let n = 0; n < attempts; n++) {
      const u = rnd();               // 0..1
      const v = rnd();               // 0..1
      const sp = this.sampleByUv(u, v, geometry, colorSource);
      if (!sp) continue;

      const { pLocal, color, uv } = sp;

      // 수면/해안 판정은 "메쉬 로컬 Y" 기준
      if (pLocal.y < autoWaterLevel) continue;
      const nearShoreLocal = (pLocal.y - autoWaterLevel) < options.shoreBand;

      // 최종 배치 좌표: 월드 좌표로 변환
      const pWorld = pLocal.clone();
      groundMesh.localToWorld(pWorld);

      // 식생/암반 판정용 녹색 비율
      const sum = Math.max(0.001, color.r + color.g + color.b);
      const greeniness = color.g / sum;

      // 공통 push
      const push = (minR_world: number, bucket: PlacementInfo[], sclMin: number, sclRnd: number) => {
        if (!pushIfFreeUv(uv.x, uv.y, minR_world)) return false;
        bucket.push({
          position: pWorld.clone(),
          scale: sclMin + rnd() * sclRnd,
          rotation: rnd() * Math.PI * 2,
        });
        return true;
      };

      // 해안가 꽃 약간 가중
      if (nearShoreLocal && rnd() < options.flowerDensity / 100) {
        push(options.minR_flower, results.flowers, 0.7, 0.6);
      }

      const [thrLow, thrHigh] = options.greenThresholds;
      if (greeniness >= thrHigh) {
        if (rnd() < (options.treeDensity / 100) * 1.2) {
          if (push(options.minR_tree, results.trees, 0.9, 0.6)) continue;
        }
      } else if (greeniness >= thrLow) {
        if (rnd() < options.plantDensity / 100) {
          if (push(options.minR_plant, results.plants, 0.8, 0.6)) continue;
        }
      } else {
        if (rnd() < options.rockDensity / 100) {
          if (push(options.minR_rock, results.rocks, 0.7, 0.8)) continue;
        }
      }
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
