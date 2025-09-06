// ObjectPlacer.ts
import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { PlaneGeometry } from 'three';

/* ------------------------------ Public Types ------------------------------ */

export interface PlacementInfo {
  position: THREE.Vector3;
  scale: number;
  rotation: THREE.Euler;
  kind: number;
}

/**
 * 단일 객체 유형 배치를 위한 패턴 이름
 * 'tree': 녹지가 풍부한 곳에 큰 군집을 형성합니다.
 * 'plant': 녹지 전반에 걸쳐 중간 크기의 군집을 형성합니다.
 * 'flower': 녹지 경계 주변으로 작은 군집과 흩뿌려진 개체를 형성합니다.
 * 'rock': 식생이 없는 흙이나 모래 지역에만 배치됩니다.
 * 'uniform': 특정 조건 없이 지형 전체에 균일하게 배치하려고 시도합니다.
 */
export type PlacementPattern = 'tree' | 'plant' | 'flower' | 'rock' | 'uniform';

/**
 * 단일 객체 유형 배치를 위한 옵션
 */
export interface SingleObjectPlacementOptions {
  seed: number;
  pattern: PlacementPattern;

  /** 밀도 (%) (0~100) */
  density: number;
  /** 최소 간격 반경 (월드 단위) */
  minRadius: number;
  /** 생성할 객체의 종류 수 (예: 5종의 다른 나무 모델) */
  numKinds: number;
  
  /** 스케일 범위 [최소, 변동폭]. 최종 스케일 = scaleMin + rnd() * scaleRange */
  scaleMin: number;
  scaleRange: number;

  /** 물 높이(수위) — "메쉬 로컬 Y" 기준. 미지정 시 자동으로 계산됩니다. */
  waterLevel?: number;
  /** 식생 판정에 쓰는 녹색 비율 임계치 [low, high] */
  greenThresholds: [number, number];
  
  /** 동종 근접 보너스 계수 (기본 0.35 권장) */
  sameKindBoostAlpha?: number;
  /** 보너스 반경(월드 단위, 기본 2.0 권장) */
  sameKindBoostRadius?: number;

  /**
   * 이전에 배치된 객체들의 점유 공간 정보입니다.
   * 여러 종류의 객체를 순차적으로 배치할 때 충돌을 방지하기 위해 사용됩니다.
   * 첫 호출 시에는 빈 배열([])을 전달하고, 다음 호출부터는 이전 `generate` 호출의 반환값을 전달하세요.
   */
  occupiedUVs?: PlacedUV[];
}

/* ------------------------------ Internal Types ------------------------------ */

export interface PlacedUV {
  u: number; v: number; rWorld: number;
}

interface SampledPoint {
  pLocal: THREE.Vector3;
  color: THREE.Color;
  uv: THREE.Vector2;
}

/* --------------------------------- Module --------------------------------- */

export class ObjectPlacer {

  constructor() { }

  /**
   * 지정된 패턴과 옵션에 따라 단일 종류의 객체들을 지형에 배치합니다.
   * @param groundMesh PlaneGeometry를 사용하는 지형 메쉬
   * @param dataTexture 색상 정보로 사용할 데이터 텍스처 (또는 정점 색상)
   * @param opts 객체 배치 옵션
   * @returns 배치된 객체 정보 배열과 다음 배치를 위한 점유 공간 정보를 반환합니다.
   */
  public generate(
    groundMesh: THREE.Mesh,
    dataTexture?: THREE.DataTexture,
    opts?: Partial<SingleObjectPlacementOptions>,
  ): { placements: PlacementInfo[], occupiedUVs: PlacedUV[] } {
    if (!(groundMesh.geometry instanceof PlaneGeometry)) {
      throw new Error('Input mesh must be THREE.PlaneGeometry.');
    }

    const geometry = groundMesh.geometry as PlaneGeometry;

    /* ---------- Options / Defaults ---------- */
    const defaults: SingleObjectPlacementOptions = {
      seed: 12345,
      pattern: 'plant',
      density: 10,
      minRadius: 1.5,
      numKinds: 5,
      scaleMin: 0.8,
      scaleRange: 0.4,
      greenThresholds: [0.35, 0.6],
      sameKindBoostAlpha: 0.35,
      sameKindBoostRadius: 2.0,
      occupiedUVs: [],
    };

    const options: SingleObjectPlacementOptions = { ...defaults, ...(opts ?? {}) };

    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute | undefined;
    const colorSource = dataTexture ?? colorAttr;
    if (!colorSource) throw new Error('A color source (DataTexture or vertex colors) is required.');

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    const autoWaterLevel = opts && opts.waterLevel !== undefined ? opts.waterLevel : (bb.min.y - 1e-4);

    const { width, height } = geometry.parameters;
    const area = width * height;
    const rnd = this.xorshift32(options.seed);

    /* ---------- Results + Shared Collision ---------- */
    const results: PlacementInfo[] = [];
    const uvOccupied: PlacedUV[] = [...(options.occupiedUVs ?? [])];

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

    /* ---------- Helpers: Color, Masks, Random ---------- */
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const srgbToLinear = (c: number) => (c <= 0.04045) ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const toLinear = (col: THREE.Color) => new THREE.Color(srgbToLinear(col.r), srgbToLinear(col.g), srgbToLinear(col.b));
    const metrics = (colLin: THREE.Color) => {
      const r = colLin.r, g = colLin.g, b = colLin.b;
      const sum = r + g + b + 1e-6;
      const gness = g / sum;
      const exg = 2 * g - r - b;
      const ndi = (g - r) / (g + r + 1e-6);
      return { gness, exg, ndi };
    };

    const [thrLow, thrHigh] = options.greenThresholds;
    const isBareSoil = (m: { gness: number; exg: number; ndi: number }) => (m.gness < (thrLow * 0.92)) || (m.ndi < -0.05 && m.exg < 0.12);
    const isVegetated = (m: { gness: number; exg: number; ndi: number }) => !isBareSoil(m);
    const isAnything = (_m: any) => true;

    const trySample = (u: number, v: number) => {
      const sp = this.sampleByUv(u, v, geometry, colorSource!);
      if (!sp || sp.pLocal.y < autoWaterLevel) return null;
      const pWorld = sp.pLocal.clone(); groundMesh.localToWorld(pWorld);
      return { ...sp, pWorld };
    };

    const chooseKind = () => Math.floor(rnd() * Math.max(1, options.numKinds));
    const randNorm = () => {
      const u1 = Math.max(1e-9, rnd()), u2 = rnd();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    /* ---------- Pattern-based Configuration ---------- */
    type GateFn = (m: { gness: number; exg: number; ndi: number }) => boolean;
    type ProbFn = (g: number) => number;

    let gate: GateFn;
    let probFromG: ProbFn;
    let useHierarchicalCluster = false;
    let clusterParams: any = {};
    let useSprinklePass = false;

    // Define probability functions based on generic density
    const treeProb = (g: number) => {
        const base = (g >= thrHigh) ? 1.0 : (g >= thrLow ? 0.35 : 0.0);
        return clamp01(base * (options.density / 100) * 1.3);
    };
    const plantProb = (g: number) => {
        const mid = 0.5 * (thrLow + thrHigh);
        const widthTri = Math.max(1e-6, (thrHigh - thrLow));
        const tri = Math.max(0, 1 - Math.abs(g - mid) / (0.5 * widthTri));
        const dens = clamp01(options.density / 100);
        return tri * (0.4 + 0.6 * dens);
    };
    const flowerProb = (g: number) => {
        const up = clamp01((g - (0.8 * thrLow)) / Math.max(1e-6, (thrHigh - 0.8 * thrLow)));
        const down = clamp01((thrHigh - g) / Math.max(1e-6, (thrHigh - thrLow)));
        const bell = clamp01(0.6 * up + 0.4 * down);
        const dens = clamp01(options.density / 100);
        return bell * (0.4 + 0.6 * dens);
    };

    switch (options.pattern) {
      case 'tree':
        useHierarchicalCluster = true;
        gate = isVegetated;
        probFromG = treeProb;
        clusterParams = {
          nSuper: Math.max(6, Math.floor(area / 700)),
          parentsPerSuper: 3, sigmaSuperUV: 0.08,
          muChildren: Math.max(3, Math.round(5 * (1 + options.density / 20))),
          sigmaChildUV: 0.03,
        };
        break;
      case 'plant':
        useHierarchicalCluster = true;
        gate = isVegetated;
        probFromG = plantProb;
        clusterParams = {
          nSuper: Math.max(10, Math.floor(area / 200)),
          parentsPerSuper: 4, sigmaSuperUV: 0.06,
          muChildren: Math.max(6, Math.round(8 * (1 + options.density / 20))),
          sigmaChildUV: 0.02,
        };
        break;
      case 'flower':
        useHierarchicalCluster = true;
        useSprinklePass = true;
        gate = isVegetated;
        probFromG = flowerProb;
        clusterParams = {
          nSuper: Math.max(8, Math.floor(area / 280)),
          parentsPerSuper: 3, sigmaSuperUV: 0.05,
          muChildren: Math.max(4, Math.round(6 * (1 + options.density / 25))),
          sigmaChildUV: 0.018,
        };
        break;
      case 'rock':
        useHierarchicalCluster = false;
        gate = isBareSoil;
        probFromG = (_g) => clamp01(options.density / 100 + 0.05);
        break;
      case 'uniform':
      default:
        useHierarchicalCluster = false;
        gate = isAnything;
        probFromG = (_g) => clamp01(options.density / 100);
        break;
    }

    /* ---------- Pass Runners ---------- */
    const attempts = Math.max(1, Math.floor(area * 0.22));

    if (useHierarchicalCluster) {
      this.runHierClusterPassKinds(
        { ...clusterParams, ...options },
        rnd, trySample, metrics, toLinear,
        gate, probFromG, chooseKind,
        pushIfFreeUv, results,
        { width, height }
      );
    } else {
      this.runPassKinds(
        attempts, options,
        rnd, trySample, metrics, toLinear,
        gate, probFromG, chooseKind,
        pushIfFreeUv, results
      );
    }

    if (useSprinklePass) {
        const sprinkleTrials = Math.floor(attempts * 0.15);
        for (let t = 0; t < sprinkleTrials; t++) {
            const u = rnd(), v = rnd();
            const s = trySample(u, v); if (!s) continue;
            const m = metrics(toLinear(s.color));
            if (!gate(m)) continue;

            const p = clamp01((options.density / 100) * (0.4 + 0.6 * m.gness));
            if (rnd() > p) continue;
            if (!pushIfFreeUv(s.uv.x, s.uv.y, options.minRadius)) continue;

            results.push({
                position: s.pWorld.clone(),
                scale: options.scaleMin + rnd() * options.scaleRange,
                rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'),
                kind: chooseKind(),
            });
        }
    }

    return { placements: results, occupiedUVs: uvOccupied };
  }

  /* ------------------------------ Internals ------------------------------ */

  private runPassKinds(
    trials: number,
    opts: SingleObjectPlacementOptions,
    rnd: () => number,
    trySample: (u: number, v: number) => (SampledPoint & { pWorld: THREE.Vector3 }) | null,
    metrics: (c: THREE.Color) => any, toLinear: (c: THREE.Color) => THREE.Color,
    gate: (m: any) => boolean,
    probFromG: (g: number) => number,
    chooseKindFn: () => number,
    pushIfFreeUv: (u: number, v: number, r: number) => boolean,
    out: PlacementInfo[],
  ) {
    for (let k = 0; k < trials; k++) {
      const u = rnd(), v = rnd();
      const s = trySample(u, v); if (!s) continue;

      const m = metrics(toLinear(s.color));
      if (!gate(m)) continue;

      const p = this.clamp01(probFromG(m.gness));
      if (rnd() > p) continue;

      if (!pushIfFreeUv(s.uv.x, s.uv.y, opts.minRadius)) continue;
      out.push({
        position: s.pWorld.clone(),
        scale: opts.scaleMin + rnd() * opts.scaleRange,
        rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'),
        kind: chooseKindFn(),
      });
    }
  }

  private runHierClusterPassKinds(
    opts: SingleObjectPlacementOptions & {
      nSuper: number, parentsPerSuper: number, sigmaSuperUV: number,
      muChildren: number, sigmaChildUV: number
    },
    rnd: () => number,
    trySample: (u: number, v: number) => (SampledPoint & { pWorld: THREE.Vector3 }) | null,
    metrics: (c: THREE.Color) => any, toLinear: (c: THREE.Color) => THREE.Color,
    gate: (m: any) => boolean,
    probFromG: (g: number) => number,
    chooseParentKind: () => number,
    pushIfFreeUv: (u: number, v: number, r: number) => boolean,
    out: PlacementInfo[],
    planeSize: { width: number, height: number },
  ) {
    const {
      nSuper, parentsPerSuper, sigmaSuperUV, muChildren, sigmaChildUV,
      sameKindBoostAlpha, sameKindBoostRadius, minRadius, scaleMin, scaleRange,
    } = opts;
    const { width, height } = planeSize;

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
    const drawPoisson = (mu: number) => {
      const L = Math.exp(-mu); let k = 0, p = 1;
      do { k++; p *= rnd(); } while (p > L);
      return Math.max(0, k - 1);
    };
    const randNorm = () => {
        const u1 = Math.max(1e-9, rnd()), u2 = rnd();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };
    const alpha = sameKindBoostAlpha ?? 0;
    const boostR = sameKindBoostRadius ?? 0;

    for (let sIdx = 0; sIdx < nSuper; sIdx++) {
      const us = rnd(), vs = rnd();
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

          const pBase = this.clamp01(probFromG(m.gness));
          let pFinal = pBase;
          if (alpha > 0 && boostR > 0) {
            const neigh = countNeighborsSameKind(parentKind, s.uv.x, s.uv.y, boostR);
            pFinal = this.clamp01(pBase * (1 + alpha * neigh));
          }
          if (rnd() > pFinal) continue;

          if (!pushIfFreeUv(s.uv.x, s.uv.y, minRadius)) continue;

          out.push({
            position: s.pWorld.clone(),
            scale: scaleMin + rnd() * scaleRange,
            rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'),
            kind: parentKind,
          });
          rememberPlacedUvKind(parentKind, s.uv.x, s.uv.y);
        }
      }
    }
  }
  
  private xorshift32(seed: number): () => number {
    let x = seed | 0;
    return () => {
      x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
      return (x >>> 0) / 4294967296;
    };
  }

  private clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  private sampleByUv(
    u: number, v: number,
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

    const ia = idx(gridX, gridY), ib = idx(gridX + 1, gridY),
          ic = idx(gridX + 1, gridY + 1), id = idx(gridX, gridY + 1);

    let wA = 0, wB = 0, wC = 0, wD = 0;
    if (fu + fv <= 1) { wA = 1 - fu - fv; wB = fu; wD = fv; }
    else { wB = 1 - fv; wC = fu + fv - 1; wD = 1 - fu; }

    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const va = new THREE.Vector3().fromBufferAttribute(pos, ia);
    const vb = new THREE.Vector3().fromBufferAttribute(pos, ib);
    const vc = new THREE.Vector3().fromBufferAttribute(pos, ic);
    const vd = new THREE.Vector3().fromBufferAttribute(pos, id);
    const pLocal = new THREE.Vector3().addScaledVector(va, wA).addScaledVector(vb, wB)
      .addScaledVector(vc, wC).addScaledVector(vd, wD);

    const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;
    const uva = new THREE.Vector2().fromBufferAttribute(uvAttr, ia);
    const uvb = new THREE.Vector2().fromBufferAttribute(uvAttr, ib);
    const uvc = new THREE.Vector2().fromBufferAttribute(uvAttr, ic);
    const uvd = new THREE.Vector2().fromBufferAttribute(uvAttr, id);
    const uv = new THREE.Vector2().addScaledVector(uva, wA).addScaledVector(uvb, wB)
      .addScaledVector(uvc, wC).addScaledVector(uvd, wD);
      
    const color = new THREE.Color();
    if (colorSource instanceof THREE.DataTexture) {
      const tex = colorSource;
      const tw = tex.image.width, th = tex.image.height;
      const data = tex.image.data;
      
      const tx = Math.floor(uv.x * (tw - 1));
      const ty = Math.floor(uv.y * (th - 1));

      const stride = tex.format === THREE.RGBAFormat ? 4 : 3;
      const base = (ty * tw + tx) * stride;

      const isFloatish = tex.type === THREE.FloatType || tex.type === (THREE as any).HalfFloatType;
      const norm = (val: number) => (isFloatish ? val : val / 255);

      color.setRGB(norm(data[base]), norm(data[base + 1]), norm(data[base + 2]));
    } else {
      const col = colorSource as THREE.BufferAttribute;
      const ca = new THREE.Color().fromBufferAttribute(col, ia);
      const cb = new THREE.Color().fromBufferAttribute(col, ib);
      const cc = new THREE.Color().fromBufferAttribute(col, ic);
      const cd = new THREE.Color().fromBufferAttribute(col, id);

      // 각 색상 채널(r, g, b)을 가중치(wA, wB, wC, wD)를 이용해 직접 계산합니다.
      const r = ca.r * wA + cb.r * wB + cc.r * wC + cd.r * wD;
      const g = ca.g * wA + cb.g * wB + cc.g * wC + cd.g * wD;
      const b = ca.b * wA + cb.b * wB + cc.b * wC + cd.b * wD;

      color.setRGB(r, g, b);
    }

    return { pLocal, color, uv };
  }
}
