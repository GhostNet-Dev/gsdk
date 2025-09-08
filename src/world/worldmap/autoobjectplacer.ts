// ObjectPlacer.ts
import * as THREE from 'three';
import { PlaneGeometry } from 'three';

/* ------------------------------ Public Types ------------------------------ */

export interface PlacementInfo {
  position: THREE.Vector3;
  scale: number;
  rotation: THREE.Euler;
  kind: number;
}

export type PlacementPattern = 'tree' | 'plant' | 'flower' | 'rock' | 'uniform' | 'waterplant';

export interface SingleObjectPlacementOptions {
  seed: number;
  pattern: PlacementPattern;
  density: number;
  minRadius: number;
  numKinds: number;
  scaleMin: number;
  scaleRange: number;
  
  /** 물 높이(수위) — "월드 Y" 기준입니다. 기본값 0. */
  waterLevel?: number;
  greenThresholds: [number, number];
  sameKindBoostAlpha?: number;
  sameKindBoostRadius?: number;
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

// Gate 함수의 타입 정의: 이제 월드 좌표(pWorld)도 인자로 받음
type GateFn = (metrics: { gness: number; exg: number; ndi: number }, pWorld: THREE.Vector3) => boolean;
type ProbFn = (g: number) => number;


/* --------------------------------- Module --------------------------------- */

export class ObjectPlacer {

  constructor() { }

  public generate(
    groundMesh: THREE.Mesh,
    dataTexture?: THREE.DataTexture,
    opts?: Partial<SingleObjectPlacementOptions>,
  ): { placements: PlacementInfo[], occupiedUVs: PlacedUV[] } {
    if (!(groundMesh.geometry instanceof PlaneGeometry)) {
      throw new Error('Input mesh must be THREE.PlaneGeometry.');
    }

    const geometry = groundMesh.geometry as PlaneGeometry;

    const defaults: SingleObjectPlacementOptions = {
      seed: 12345,
      pattern: 'plant',
      density: 10,
      minRadius: 1.5,
      numKinds: 5,
      scaleMin: 0.8,
      scaleRange: 0.4,
      waterLevel: -0.2, // 월드 Y좌표 기준, 기본값 0
      greenThresholds: [0.35, 0.6],
      sameKindBoostAlpha: 0.35,
      sameKindBoostRadius: 2.0,
      occupiedUVs: [],
    };

    const options: SingleObjectPlacementOptions = { ...defaults, ...(opts ?? {}) };
    const worldWaterLevel = options.waterLevel!;

    const colorSource = dataTexture ?? geometry.getAttribute('color');
    if (!colorSource) throw new Error('A color source is required.');

    const { width, height } = geometry.parameters;
    const area = width * height;
    const rnd = this.xorshift32(options.seed);

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
    const toLinear = (col: THREE.Color) => new THREE.Color().copy(col).convertSRGBToLinear();
    const metrics = (colLin: THREE.Color) => {
      const { r, g, b } = colLin;
      const sum = r + g + b + 1e-6;
      return { gness: g / sum, exg: 2 * g - r - b, ndi: (g - r) / (g + r + 1e-6) };
    };

    // 샘플링 함수: 월드 좌표를 계산하되, 수면 체크는 여기서 하지 않음
    const trySample = (u: number, v: number) => {
      const sp = this.sampleByUv(u, v, geometry, colorSource as any);
      if (!sp) return null;
      const pWorld = sp.pLocal.clone().applyMatrix4(groundMesh.matrixWorld);
      return { ...sp, pWorld };
    };

    const chooseKind = () => Math.floor(rnd() * Math.max(1, options.numKinds));

    /* ---------- Pattern-based Configuration ---------- */
    
    // Gate 함수 정의
    const [thrLow, thrHigh] = options.greenThresholds;
    const checkBareSoil = (m: { gness: number; exg: number; ndi: number }) => (m.gness < (thrLow * 0.92)) || (m.ndi < -0.05 && m.exg < 0.12);
    
    // 위치 기반 Gate 함수
    const isAboveWater = (_m: any, pWorld: THREE.Vector3) => pWorld.y > worldWaterLevel;
    const isBelowWater = (_m: any, pWorld: THREE.Vector3) => pWorld.y <= worldWaterLevel;

    // 조합된 Gate 함수
    const gateVegetatedAboveWater = (m: any, pWorld: THREE.Vector3) => !checkBareSoil(m) && isAboveWater(m, pWorld);
    const gateBareSoilAboveWater = (m: any, pWorld: THREE.Vector3) => checkBareSoil(m) && isAboveWater(m, pWorld);

    let gate: GateFn;
    let probFromG: ProbFn;
    let useHierarchicalCluster = false;
    let clusterParams: any = {};
    let useSprinklePass = false;

    // 확률 함수들
    const treeProb = (g: number) => clamp01(((g >= thrHigh) ? 1.0 : (g >= thrLow ? 0.35 : 0.0)) * (options.density / 100) * 1.3);
    const plantProb = (g: number) => {
        const mid = 0.5 * (thrLow + thrHigh);
        const widthTri = Math.max(1e-6, (thrHigh - thrLow));
        const tri = Math.max(0, 1 - Math.abs(g - mid) / (0.5 * widthTri));
        return tri * (0.4 + 0.6 * clamp01(options.density / 100));
    };
    const flowerProb = (g: number) => {
        const up = clamp01((g - (0.8 * thrLow)) / Math.max(1e-6, (thrHigh - 0.8 * thrLow)));
        const down = clamp01((thrHigh - g) / Math.max(1e-6, (thrHigh - thrLow)));
        const bell = clamp01(0.6 * up + 0.4 * down);
        return bell * (0.4 + 0.6 * clamp01(options.density / 100));
    };

    switch (options.pattern) {
      case 'tree':
        useHierarchicalCluster = true;
        gate = gateVegetatedAboveWater;
        probFromG = treeProb;
        clusterParams = { nSuper: Math.max(6, Math.floor(area / 700)), parentsPerSuper: 3, sigmaSuperUV: 0.08, muChildren: Math.max(3, Math.round(5 * (1 + options.density / 20))), sigmaChildUV: 0.03 };
        break;
      case 'plant':
        useHierarchicalCluster = true;
        gate = gateVegetatedAboveWater;
        probFromG = plantProb;
        clusterParams = { nSuper: Math.max(10, Math.floor(area / 200)), parentsPerSuper: 4, sigmaSuperUV: 0.06, muChildren: Math.max(6, Math.round(8 * (1 + options.density / 20))), sigmaChildUV: 0.02 };
        break;
      case 'flower':
        useHierarchicalCluster = true; useSprinklePass = true;
        gate = gateVegetatedAboveWater;
        probFromG = flowerProb;
        clusterParams = { nSuper: Math.max(8, Math.floor(area / 280)), parentsPerSuper: 3, sigmaSuperUV: 0.05, muChildren: Math.max(4, Math.round(6 * (1 + options.density / 25))), sigmaChildUV: 0.018 };
        break;
      case 'rock':
        useHierarchicalCluster = false;
        gate = gateBareSoilAboveWater;
        probFromG = (_g) => clamp01(options.density / 100 + 0.05);
        break;
      //--- ✨ 새로운 Waterplant 패턴 정의 ---
      case 'waterplant':
        useHierarchicalCluster = true;
        gate = isBelowWater; // 조건: 수면 아래
        probFromG = (g) => plantProb(g) * 0.8; // 식물 확률을 재활용 (약간 낮춤)
        clusterParams = { nSuper: Math.max(8, Math.floor(area / 300)), parentsPerSuper: 5, sigmaSuperUV: 0.07, muChildren: Math.max(5, Math.round(7 * (1 + options.density / 20))), sigmaChildUV: 0.025 };
        break;
      case 'uniform':
      default:
        useHierarchicalCluster = false;
        gate = (_m, _p) => true; // 조건 없음
        probFromG = (_g) => clamp01(options.density / 100);
        break;
    }

    /* ---------- Pass Runners ---------- */
    const attempts = Math.max(1, Math.floor(area * 0.22));

    if (useHierarchicalCluster) {
      this.runHierClusterPassKinds({ ...clusterParams, ...options }, rnd, trySample, metrics, toLinear, gate, probFromG, chooseKind, pushIfFreeUv, results, { width, height });
    } else {
      this.runPassKinds(attempts, options, rnd, trySample, metrics, toLinear, gate, probFromG, chooseKind, pushIfFreeUv, results);
    }

    if (useSprinklePass) {
        const sprinkleTrials = Math.floor(attempts * 0.15);
        for (let t = 0; t < sprinkleTrials; t++) {
            const u = rnd(), v = rnd();
            const s = trySample(u, v); if (!s) continue;
            const m = metrics(toLinear(s.color));
            if (!gate(m, s.pWorld)) continue;
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

  // Gate 함수가 pWorld를 받도록 시그니처 수정
  private runPassKinds(
    trials: number, opts: SingleObjectPlacementOptions, rnd: () => number,
    trySample: (u: number, v: number) => (SampledPoint & { pWorld: THREE.Vector3 }) | null,
    metrics: (c: THREE.Color) => any, toLinear: (c: THREE.Color) => THREE.Color,
    gate: GateFn, probFromG: ProbFn, chooseKindFn: () => number,
    pushIfFreeUv: (u: number, v: number, r: number) => boolean, out: PlacementInfo[],
  ) {
    for (let k = 0; k < trials; k++) {
      const u = rnd(), v = rnd();
      const s = trySample(u, v); if (!s) continue;
      const m = metrics(toLinear(s.color));
      if (!gate(m, s.pWorld)) continue; // pWorld 전달
      const p = probFromG(m.gness);
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

  // Gate 함수가 pWorld를 받도록 시그니처 수정
  private runHierClusterPassKinds(
    opts: any, rnd: () => number,
    trySample: (u: number, v: number) => (SampledPoint & { pWorld: THREE.Vector3 }) | null,
    metrics: (c: THREE.Color) => any, toLinear: (c: THREE.Color) => THREE.Color,
    gate: GateFn, probFromG: ProbFn, chooseParentKind: () => number,
    pushIfFreeUv: (u: number, v: number, r: number) => boolean, out: PlacementInfo[],
    planeSize: { width: number, height: number },
  ) {
    const { nSuper, parentsPerSuper, sigmaSuperUV, muChildren, sigmaChildUV, sameKindBoostAlpha, sameKindBoostRadius, minRadius, scaleMin, scaleRange } = opts;
    const { width, height } = planeSize;
    const placedUvByKind = new Map<number, Array<{ u: number; v: number }>>();
    const rememberPlacedUvKind = (kind: number, u: number, v: number) => { const arr = placedUvByKind.get(kind) ?? []; arr.push({ u, v }); placedUvByKind.set(kind, arr); };
    const countNeighborsSameKind = (kind: number, u: number, v: number, rWorld: number) => {
      const arr = placedUvByKind.get(kind); if (!arr?.length) return 0;
      const r2 = rWorld * rWorld; let cnt = 0;
      for (const p of arr) { if (((u - p.u) * width) ** 2 + ((v - p.v) * height) ** 2 < r2) cnt++; }
      return cnt;
    };
    const drawPoisson = (mu: number) => { const L = Math.exp(-mu); let k = 0, p = 1; do { k++; p *= rnd(); } while (p > L); return Math.max(0, k - 1); };
    const randNorm = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd());
    const alpha = sameKindBoostAlpha ?? 0, boostR = sameKindBoostRadius ?? 0;

    for (let sIdx = 0; sIdx < nSuper; sIdx++) {
      const us = rnd(), vs = rnd();
      for (let pIdx = 0; pIdx < parentsPerSuper; pIdx++) {
        const up = us + sigmaSuperUV * randNorm(), vp = vs + sigmaSuperUV * randNorm();
        if (up < 0 || up > 1 || vp < 0 || vp > 1) continue;
        const parentKind = chooseParentKind();
        const nChildren = drawPoisson(muChildren);
        for (let j = 0; j < nChildren; j++) {
          const u = up + sigmaChildUV * randNorm(), v = vp + sigmaChildUV * randNorm();
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          const s = trySample(u, v); if (!s) continue;
          const m = metrics(toLinear(s.color));
          if (!gate(m, s.pWorld)) continue; // pWorld 전달
          const pBase = probFromG(m.gness);
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
  
  private xorshift32 = (seed: number) => { let x = seed | 0; return () => (x ^= x << 13, x ^= x >>> 17, x ^= x << 5, (x >>> 0) / 4294967296); }
  private clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  private sampleByUv = (u: number, v: number, geometry: PlaneGeometry, colorSource: THREE.DataTexture | THREE.BufferAttribute): SampledPoint | null => {
    const { widthSegments, heightSegments } = geometry.parameters;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    const gridX = Math.min(Math.floor(u * widthSegments), widthSegments - 1), gridY = Math.min(Math.floor(v * heightSegments), heightSegments - 1);
    const fu = u * widthSegments - gridX, fv = v * heightSegments - gridY;
    const vertsPerRow = widthSegments + 1;
    const idx = (ii: number, jj: number) => jj * vertsPerRow + ii;
    const ia = idx(gridX, gridY), ib = idx(gridX + 1, gridY), ic = idx(gridX + 1, gridY + 1), id = idx(gridX, gridY + 1);
    let wA = 0, wB = 0, wC = 0, wD = 0;
    if (fu + fv <= 1) { wA = 1 - fu - fv; wB = fu; wD = fv; } else { wB = 1 - fv; wC = fu + fv - 1; wD = 1 - fu; }
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const pLocal = new THREE.Vector3().fromBufferAttribute(pos, ia).multiplyScalar(wA).addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, ib), wB).addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, ic), wC).addScaledVector(new THREE.Vector3().fromBufferAttribute(pos, id), wD);
    const uvAttr = geometry.attributes.uv as THREE.BufferAttribute;
    const uv = new THREE.Vector2().fromBufferAttribute(uvAttr, ia).multiplyScalar(wA).addScaledVector(new THREE.Vector2().fromBufferAttribute(uvAttr, ib), wB).addScaledVector(new THREE.Vector2().fromBufferAttribute(uvAttr, ic), wC).addScaledVector(new THREE.Vector2().fromBufferAttribute(uvAttr, id), wD);
    const color = new THREE.Color();
    if (colorSource instanceof THREE.DataTexture) {
      const tex = colorSource, tw = tex.image.width, th = tex.image.height, data = tex.image.data;
      const tx = Math.floor(uv.x * (tw - 1)), ty = Math.floor(uv.y * (th - 1));
      const stride = tex.format === THREE.RGBAFormat ? 4 : 3;
      const base = (ty * tw + tx) * stride;
      const norm = (val: number) => (tex.type === THREE.FloatType || tex.type === (THREE as any).HalfFloatType ? val : val / 255);
      color.setRGB(norm(data[base]), norm(data[base + 1]), norm(data[base + 2]));
    } else {
      const col = colorSource as THREE.BufferAttribute;
      const ca = new THREE.Color().fromBufferAttribute(col, ia), cb = new THREE.Color().fromBufferAttribute(col, ib), cc = new THREE.Color().fromBufferAttribute(col, ic), cd = new THREE.Color().fromBufferAttribute(col, id);
      color.setRGB( ca.r * wA + cb.r * wB + cc.r * wC + cd.r * wD, ca.g * wA + cb.g * wB + cc.g * wC + cd.g * wD, ca.b * wA + cb.b * wB + cc.b * wC + cd.b * wD );
    }
    return { pLocal, color, uv };
  }
}