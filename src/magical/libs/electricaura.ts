// ElectricAura.ts — Three.js r160 (no scene/camera dependency)
// API: new ElectricAura(options?).attachTo(target); aura.update(delta); aura.detach(); aura.dispose();

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* --------------------------- Public Types & Options --------------------------- */

export type DistributionMode = 'area' | 'uniform' | 'even';

export interface ElectricAuraOptions {
  // Aura
  auraColor?: string | number;   // default '#7cc8ff'
  auraIntensity?: number;        // default 2.4
  auraThickness?: number;        // default 0.08 (Aura 쉘 거리)
  noiseScale?: number;           // default 2.2
  noiseSpeed?: number;           // default 1.7
  ridgeThreshold?: number;       // default 0.65
  rimIntensity?: number;         // default 0.35
  rimPower?: number;             // default 2.0
  fieldBoost?: number;           // alpha multiplier, default 1.2

  // Bolts
  boltCount?: number;            // default 10
  boltOffset?: number;           // ⚡️ NEW! default 0.08 (볼트 생성 거리)
  boltRadius?: number;           // default 0.022
  boltJitter?: number;           // default 0.35
  boltLifetime?: number;         // seconds, default 0.42
  spawnRate?: number;            // per-frame probability, default 0.12
  boltGlow?: number;             // 0..1 opacity for glow tube, default 0.35

  // Sampling
  distribution?: DistributionMode; // default 'area'
  evenMinDistance?: number;      // default 0.25
}

/* --------------------------------- Internals --------------------------------- */

const DEFAULTS: Required<ElectricAuraOptions> = {
  // Aura
  auraColor: '#7cc8ff',
  auraIntensity: 2.4,
  auraThickness: 0.08,
  noiseScale: 2.2,
  noiseSpeed: 1.7,
  ridgeThreshold: 0.65,
  rimIntensity: 0.35,
  rimPower: 2.0,
  fieldBoost: 1.2,

  // Bolts
  boltCount: 16,
  boltOffset: 0.4, // ⚡️ NEW!
  boltRadius: 0.06,
  boltJitter: 0.85,
  boltLifetime: 0.42,
  spawnRate: 0.30,
  boltGlow: 0.35,

  // Sampling
  distribution: 'area',
  evenMinDistance: 0.25,
};

function mergeDefaults(o?: ElectricAuraOptions): Required<ElectricAuraOptions> {
  return { ...DEFAULTS, ...(o ?? {}) };
}

/* -------------------------------- Aura Shader -------------------------------- */

const AuraShader = {
  uniforms: {
    uTime:          { value: 0 },
    uColor:         { value: new THREE.Color(DEFAULTS.auraColor as string) },
    uIntensity:     { value: DEFAULTS.auraIntensity },
    uThickness:     { value: DEFAULTS.auraThickness },
    uNoiseScale:    { value: DEFAULTS.noiseScale },
    uNoiseSpeed:    { value: DEFAULTS.noiseSpeed },
    uRidgeThreshold:{ value: DEFAULTS.ridgeThreshold },
    uRimIntensity:  { value: DEFAULTS.rimIntensity },
    uRimPower:      { value: DEFAULTS.rimPower },
    uAlphaBoost:    { value: DEFAULTS.fieldBoost }
  },
  vertexShader: /* glsl */`
    precision highp float;
    uniform float uThickness;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;
    void main() {
      vec3 displaced = position + normal * uThickness; // ⚡️ 여기가 auraThickness가 작동하는 곳
      vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
      vWorldPos = worldPos.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: /* glsl */`
    precision highp float;
    uniform float uTime;
    uniform vec3  uColor;
    uniform float uIntensity;
    uniform float uNoiseScale;
    uniform float uNoiseSpeed;
    uniform float uRidgeThreshold;
    uniform float uRimIntensity;
    uniform float uRimPower;
    uniform float uAlphaBoost;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;

    // ... (snoise, ridged 함수 동일) ...
    vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

    float snoise(vec3 v){
      const vec2  C = vec2(1.0/6.0, 1.0/3.0);
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute( permute( permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3  ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    float ridged(vec3 p) { return 1.0 - abs(snoise(p)); }

    void main() {
      vec3 p = vWorldPos * uNoiseScale + vec3(0.0, uTime * uNoiseSpeed, 0.0);
      float r1 = ridged(p);
      float r2 = ridged(p + vec3(1.7, 3.1, 0.6) + uTime*0.5);
      float r  = max(r1, r2);
      float m  = smoothstep(uRidgeThreshold, uRidgeThreshold + 0.15, r);

      vec3 V = normalize(cameraPosition - vWorldPos);
      float rim = pow(max(0.0, 1.0 - dot(V, normalize(vWorldNormal))), uRimPower);
      float flicker = 0.85 + 0.15 * sin(uTime*50.0 + r2*20.0);

      vec3 col = uColor * (uIntensity * m * flicker);
      col += uColor * (uRimIntensity * rim);

      float alpha = max(m, rim) * 0.9 * uAlphaBoost;
      gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
    }
  `
};

/* ------------------------------ Sampling Helpers ------------------------------ */

type AreaTable = { tris: number[][]; cum: number[]; total: number };

function buildAreaTable(geometry: THREE.BufferGeometry): AreaTable {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const index = geometry.index ? (geometry.index.array as ArrayLike<number>) : null;
  const tris: number[][] = [];
  const cum: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();
  let total = 0;

  const triCount = (index ? index.length : pos.count) / 3;
  for (let t=0; t<triCount; t++) {
    const i0 = index ? index[t*3+0] : t*3+0;
    const i1 = index ? index[t*3+1] : t*3+1;
    const i2 = index ? index[t*3+2] : t*3+2;
    a.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
    b.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
    c.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2));
    ab.subVectors(b,a); ac.subVectors(c,a);
    const area = ab.cross(ac).length() * 0.5;
    total += area;
    tris.push([i0,i1,i2]);
    cum.push(total);
  }
  return { tris, cum, total };
}

function upperBound(arr: number[], x: number) {
  let lo=0, hi=arr.length;
  while (lo<hi) {
    const mid=(lo+hi)>>>1;
    if (x < arr[mid]) hi=mid; else lo=mid+1;
  }
  return lo;
}

// ⚡️ HELPER: 샘플링 시 노멀 벡터도 보간하여 가져옴
const _nA = new THREE.Vector3(), _nB = new THREE.Vector3(), _nC = new THREE.Vector3();
const _A = new THREE.Vector3(), _B = new THREE.Vector3(), _C = new THREE.Vector3();

// ⚡️ CHANGED: outPos, outNormal 인자 추가
function samplePointAreaLocal(
  geom: THREE.BufferGeometry,
  tab: AreaTable,
  outPos: THREE.Vector3,
  outNormal: THREE.Vector3
) {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const norm = geom.attributes.normal as THREE.BufferAttribute;
  const r = Math.random() * tab.total;
  const idx = upperBound(tab.cum, r);
  const tri = tab.tris[idx];
  const i0 = tri[0], i1 = tri[1], i2 = tri[2];

  _A.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
  _B.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
  _C.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

  _nA.set(norm.getX(i0), norm.getY(i0), norm.getZ(i0));
  _nB.set(norm.getX(i1), norm.getY(i1), norm.getZ(i1));
  _nC.set(norm.getX(i2), norm.getY(i2), norm.getZ(i2));

  const r1 = Math.random(), r2 = Math.random(), s = Math.sqrt(r1);
  const u = 1.0 - s, v = r2 * s, w = 1.0 - u - v;

  outPos.set(0,0,0).addScaledVector(_A,u).addScaledVector(_B,v).addScaledVector(_C,w);
  outNormal.set(0,0,0).addScaledVector(_nA,u).addScaledVector(_nB,v).addScaledVector(_nC,w).normalize();
  return outPos; // (outPos는 참조이므로 반환값은 편의상 유지)
}

// ⚡️ CHANGED: outPos, outNormal 인자 추가
function samplePointUniformLocal(
  geom: THREE.BufferGeometry,
  outPos: THREE.Vector3,
  outNormal: THREE.Vector3
) {
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const norm = geom.attributes.normal as THREE.BufferAttribute;
  const index = geom.index ? (geom.index.array as ArrayLike<number>) : null;
  const triCount = (index ? index.length : pos.count) / 3;
  const tri = Math.floor(Math.random()*triCount);
  const i0 = index ? index[tri*3+0] : tri*3+0;
  const i1 = index ? index[tri*3+1] : tri*3+1;
  const i2 = index ? index[tri*3+2] : tri*3+2;

  _A.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
  _B.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
  _C.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

  _nA.set(norm.getX(i0), norm.getY(i0), norm.getZ(i0));
  _nB.set(norm.getX(i1), norm.getY(i1), norm.getZ(i1));
  _nC.set(norm.getX(i2), norm.getY(i2), norm.getZ(i2));

  const r1 = Math.random(), r2 = Math.random(), s = Math.sqrt(r1);
  const u = 1.0 - s, v = r2 * s, w = 1.0 - u - v;

  outPos.set(0,0,0).addScaledVector(_A,u).addScaledVector(_B,v).addScaledVector(_C,w);
  outNormal.set(0,0,0).addScaledVector(_nA,u).addScaledVector(_nB,v).addScaledVector(_nC,w).normalize();
  return outPos; // (outPos는 참조이므로 반환값은 편의상 유지)
}

// ⚡️ CHANGED: outPos, outNormal 인자 추가
const _tempNormal = new THREE.Vector3(); // even 샘플링용 임시 노멀
function samplePointEvenLocal(
  geom: THREE.BufferGeometry,
  tab: AreaTable,
  cache: THREE.Vector3[],
  minDist: number,
  outPos: THREE.Vector3,
  outNormal: THREE.Vector3, // ⚡️
  maxTry = 24
) {
  for (let k=0; k<maxTry; k++) {
    samplePointAreaLocal(geom, tab, outPos, _tempNormal); // ⚡️ 임시 노멀에 저장
    let ok = true;
    for (let i=0;i<cache.length;i++) {
      if (outPos.distanceTo(cache[i]) < minDist) { ok=false; break; }
    }
    if (ok) {
      outNormal.copy(_tempNormal); // ⚡️ 성공 시 노멀 복사
      return outPos;
    }
  }
  outNormal.copy(_tempNormal); // ⚡️ 실패해도 마지막 노멀 복사
  return outPos;
}

/* ------------------------------- Lightning Bolt ------------------------------- */

class LightningBolt {
  private radius: number;
  private jitter: number;
  private lifetime: number;
  private color: THREE.Color;
  private offset: number; // ⚡️ NEW!

  private birth = performance.now()*0.001;

  private dir = new THREE.Vector3();
  private len = 1;
  private right = new THREE.Vector3();
  private up = new THREE.Vector3();

  private geom?: THREE.TubeGeometry;
  private geomGlow?: THREE.TubeGeometry;
  private coreObj?: THREE.Mesh;
  private glowObj?: THREE.Mesh;

  // endpoints (LOCAL to sampling mesh / effectRoot)
  private startLocal = new THREE.Vector3();
  private endLocal   = new THREE.Vector3();

  constructor(
    private readonly samplingMesh: THREE.Mesh,      // local space geometry
    private readonly parent: THREE.Object3D,        // effectRoot
    boltOpts: { radius: number; jitter: number; lifetime: number; color: THREE.Color; offset: number }, // ⚡️ offset 추가
    private readonly glowOpacity: number
  ) {
    this.radius = boltOpts.radius;
    this.jitter = boltOpts.jitter;
    this.lifetime = boltOpts.lifetime;
    this.color = boltOpts.color.clone();
    this.offset = boltOpts.offset; // ⚡️

    const geom = this.samplingMesh.geometry;
    const tab: AreaTable | undefined = (this.samplingMesh.userData.area as AreaTable | undefined);
    const dist: DistributionMode = this.samplingMesh.userData.distribution ?? 'area';
    const cache: THREE.Vector3[] = (this.samplingMesh.userData.evenCache ??= []);

    // ⚡️ 샘플링을 위한 임시 변수
    const pos = new THREE.Vector3();
    const nrm = new THREE.Vector3();

    // ⚡️ CHANGED: choose 함수가 pos, nrm을 모두 받도록 수정
    const choose = (outPos: THREE.Vector3, outNrm: THREE.Vector3) => {
      if (dist === 'uniform') return samplePointUniformLocal(geom, outPos, outNrm);
      if (dist === 'even')    return samplePointEvenLocal(geom, tab!, cache, this.samplingMesh.userData.evenMinDistance, outPos, outNrm);
      return samplePointAreaLocal(geom, tab!, outPos, outNrm);
    };

    // ⚡️ CHANGED: 샘플링 후 offset 적용
    choose(pos, nrm);
    this.startLocal.copy(pos).addScaledVector(nrm, this.offset); // 표면 위치 + (노멀 * offset)

    choose(pos, nrm);
    this.endLocal.copy(pos).addScaledVector(nrm, this.offset); // 표면 위치 + (노멀 * offset)
    
    // ⚡️ CHANGED: 'even' 모드 캐시는 *표면* 위치(pos) 기준이어야 함 (버그 수정)
    //    (위에서 choose가 pos를 덮어썼으므로, startLocal/endLocal에서 offset을 빼서 저장)
    if (dist === 'even') { 
        // offset을 적용하기 전의 '표면' 위치를 캐시해야 함
        // 이미 this.startLocal/endLocal은 offset이 적용됐으므로, 
        // choose 함수를 다시 호출하거나... 간단하게 그냥 offset 적용된 위치를 캐시.
        // (정확하려면 choose가 반환한 pos를 캐시해야 하지만, 이 코드에서는 pos가 재사용됨)
        // (간단한 수정을 위해, offset 적용된 위치를 캐시하도록 유지 - evenMinDistance가 offset 공간에서 계산됨)
        
        // choose 함수를 수정하지 않고 간단히 수정하려면...
        // 1. startLocal/startNormal 샘플링
        const startPos = new THREE.Vector3(); const startNrm = new THREE.Vector3();
        choose(startPos, startNrm);
        // 2. endLocal/endNormal 샘플링
        const endPos = new THREE.Vector3(); const endNrm = new THREE.Vector3();
        choose(endPos, endNrm);
        
        // 3. 'even' 모드일 경우 *표면* 위치를 캐시
        if (dist === 'even') { 
            cache.push(startPos.clone(), endPos.clone()); 
        }

        // 4. offset 적용
        this.startLocal.copy(startPos).addScaledVector(startNrm, this.offset);
        this.endLocal.copy(endPos).addScaledVector(endNrm, this.offset);
    }
    // (위 'even' 로직이 복잡해져서, 생성자 로직을 위 2~4번으로 대체합니다.)

    this.reframe();
    this.rebuild(0);
  }

  private reframe() {
    // LOCAL-SPACE frame (no world transforms)
    this.dir.copy(this.endLocal).sub(this.startLocal);
    this.len = Math.max(this.dir.length(), 1e-6);
    this.dir.normalize();

    const upBase = Math.abs(this.dir.y) < 0.99 ? new THREE.Vector3(0,1,0) : new THREE.Vector3(1,0,0);
    this.right.copy(new THREE.Vector3().crossVectors(this.dir, upBase).normalize());
    this.up.copy(new THREE.Vector3().crossVectors(this.right, this.dir).normalize());
  }

  private rebuild(tNorm: number) {
    const segments = 24;
    const pts: THREE.Vector3[] = [];
    for (let i=0;i<=segments;i++) {
      const f = i/segments;
      const p = new THREE.Vector3().copy(this.startLocal).lerp(this.endLocal, f);
      const bell = Math.sin(Math.PI * f);
      const s = (performance.now()*0.001) * 8.5 + f*10.0;
      const jx = (Math.sin(s*1.7)+Math.cos(s*2.3+1.7))*0.5;
      const jy = (Math.sin(s*1.2+2.1)+Math.cos(s*2.7))*0.5;
      const off = this.right.clone().multiplyScalar(jx * this.jitter * bell * this.len*0.08)
                    .add(this.up.clone().multiplyScalar(jy * this.jitter * bell * this.len*0.08));
      pts.push(p.add(off));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const tubularSegments = 64, radialSegments = 8;

    this.geom?.dispose();
    this.geom = new THREE.TubeGeometry(curve, tubularSegments, this.radius, radialSegments, false);

    this.geomGlow?.dispose();
    this.geomGlow = new THREE.TubeGeometry(curve, tubularSegments, this.radius*1.6, radialSegments, false);

    if (!this.coreObj) {
      const matCore = new THREE.MeshBasicMaterial({
        color: this.color, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      this.coreObj = new THREE.Mesh(this.geom, matCore);
      this.coreObj.frustumCulled = false;
      this.parent.add(this.coreObj);

      const matGlow = new THREE.MeshBasicMaterial({
        color: this.color, transparent: true, opacity: this.glowOpacity,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      this.glowObj = new THREE.Mesh(this.geomGlow, matGlow);
      this.glowObj.frustumCulled = false;
      this.glowObj.renderOrder = 998;
      this.parent.add(this.glowObj);
    } else {
      this.coreObj.geometry = this.geom;
      this.glowObj!.geometry = this.geomGlow;
      (this.glowObj!.material as THREE.MeshBasicMaterial).opacity = this.glowOpacity;
    }
  }

  public update(): boolean {
    this.reframe();

    const age = performance.now()*0.001 - this.birth;
    const t = age / this.lifetime;
    const fade = Math.max(0, 1 - t);
    if (this.coreObj) (this.coreObj.material as THREE.MeshBasicMaterial).opacity = 0.2 + 0.8*fade;

    this.rebuild(t);
    if (t >= 1) { this.dispose(); return false; }
    return true;
  }

  public dispose() {
    if (this.coreObj) {
      this.parent.remove(this.coreObj);
      this.coreObj.geometry?.dispose();
      (this.coreObj.material as THREE.Material).dispose();
      this.coreObj = undefined;
    }
    if (this.glowObj) {
      this.parent.remove(this.glowObj);
      this.glowObj.geometry?.dispose();
      (this.glowObj.material as THREE.Material).dispose();
      this.glowObj = undefined;
    }
    this.geom?.dispose(); this.geom = undefined;
    this.geomGlow?.dispose(); this.geomGlow = undefined;
  }
}

/* -------------------------------- Main Class -------------------------------- */

export class ElectricAura {
  private opts: Required<ElectricAuraOptions>;

  private targetRoot?: THREE.Object3D;
  private effectRoot?: THREE.Group;           // local group (child of target)
  private samplingMesh?: THREE.Mesh;          // merged geometry (hidden)
  private auraMesh?: THREE.Mesh;              // aura shell
  private bolts: LightningBolt[] = [];

  private elapsed = 0;

  constructor(options?: ElectricAuraOptions) {
    this.opts = mergeDefaults(options);
  }

  /** 대상 오브젝트(주로 Group/메시의 루트)에 효과 부착 */
  public attachTo(target: THREE.Object3D) {
    this.detach(); // clean previous

    this.targetRoot = target;
    this.effectRoot = new THREE.Group();
    target.add(this.effectRoot);

    // 1) merge geometry in target space
    target.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(target.matrixWorld).invert();
    const geos: THREE.BufferGeometry[] = [];

    target.traverse((o: any) => {
      if (o.isMesh && o.geometry) {
        const g = o.geometry.clone();
        const mw = o.matrixWorld.clone();
        const toLocal = new THREE.Matrix4().multiplyMatrices(inv, mw);
        g.applyMatrix4(toLocal);
        if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
        
        // ⚡️ 중요: 노멀이 없으면 계산 (샘플링에 필수)
        if (!g.attributes.normal) {
          g.computeVertexNormals();
        } else {
          g.normalizeNormals(); // 정규화 보장
        }
        
        geos.push(g);
      }
    });

    if (geos.length === 0) return;

    const merged = BufferGeometryUtils.mergeGeometries(geos, false);
    geos.forEach(g=>g.dispose());
    if (!merged) return;

    // 2) hidden sampling mesh (child of effectRoot)
    this.samplingMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ visible:false }));
    this.samplingMesh.userData.area = buildAreaTable(merged);
    this.samplingMesh.userData.evenCache = [];
    this.samplingMesh.userData.distribution = this.opts.distribution;
    this.samplingMesh.userData.evenMinDistance = this.opts.evenMinDistance;
    this.effectRoot.add(this.samplingMesh);

    // 3) aura shell (child of effectRoot)
    const auraMat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(AuraShader.uniforms),
      vertexShader: AuraShader.vertexShader,
      fragmentShader: AuraShader.fragmentShader,
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    (auraMat.uniforms.uColor.value as THREE.Color).set(this.opts.auraColor as any);
    auraMat.uniforms.uIntensity.value  = this.opts.auraIntensity;
    auraMat.uniforms.uThickness.value  = this.opts.auraThickness;
    auraMat.uniforms.uNoiseScale.value = this.opts.noiseScale;
    auraMat.uniforms.uNoiseSpeed.value = this.opts.noiseSpeed;
    auraMat.uniforms.uRidgeThreshold.value = this.opts.ridgeThreshold;
    auraMat.uniforms.uRimIntensity.value = this.opts.rimIntensity;
    auraMat.uniforms.uRimPower.value = this.opts.rimPower;
    auraMat.uniforms.uAlphaBoost.value = this.opts.fieldBoost;

    this.auraMesh = new THREE.Mesh(merged, auraMat);
    this.auraMesh.renderOrder = 999;
    this.effectRoot.add(this.auraMesh);

    // 4) initial bolts
    this.spawnBolts();
  }

  /** 효과 제거 & 리소스 정리 */
  public detach() {
    this.bolts.forEach(b=>b.dispose());
    this.bolts = [];

    if (this.auraMesh) {
      (this.auraMesh.material as THREE.Material).dispose();
      this.effectRoot?.remove(this.auraMesh);
      this.auraMesh = undefined;
    }

    if (this.samplingMesh) {
      this.effectRoot?.remove(this.samplingMesh);
      this.samplingMesh.geometry?.dispose();
      (this.samplingMesh.material as THREE.Material).dispose();
      this.samplingMesh = undefined;
    }

    if (this.effectRoot) {
      this.targetRoot?.remove(this.effectRoot);
      this.effectRoot = undefined;
    }

    this.targetRoot = undefined;
  }

  /** 옵션 런타임 업데이트 */
  public setOptions(patch: ElectricAuraOptions) {
    this.opts = { ...this.opts, ...patch };
    // aura uniforms 즉시 반영
    if (this.auraMesh) {
      const u = (this.auraMesh.material as THREE.ShaderMaterial).uniforms;
      if (patch.auraColor !== undefined) (u.uColor.value as THREE.Color).set(patch.auraColor as any);
      if (patch.auraIntensity !== undefined) u.uIntensity.value = patch.auraIntensity;
      if (patch.auraThickness !== undefined) u.uThickness.value = patch.auraThickness;
      if (patch.noiseScale !== undefined) u.uNoiseScale.value = patch.noiseScale;
      if (patch.noiseSpeed !== undefined) u.uNoiseSpeed.value = patch.noiseSpeed;
      if (patch.ridgeThreshold !== undefined) u.uRidgeThreshold.value = patch.ridgeThreshold;
      if (patch.rimIntensity !== undefined) u.uRimIntensity.value = patch.rimIntensity;
      if (patch.rimPower !== undefined) u.uRimPower.value = patch.rimPower;
      if (patch.fieldBoost !== undefined) u.uAlphaBoost.value = patch.fieldBoost;
    }
    
    // ⚡️ CHANGED: 분포 또는 *볼트 offset* 변경 시 볼트 재생성
    if (patch.distribution !== undefined || patch.evenMinDistance !== undefined || patch.boltOffset !== undefined) {
      if (this.samplingMesh) {
        this.samplingMesh.userData.distribution = this.opts.distribution;
        this.samplingMesh.userData.evenMinDistance = this.opts.evenMinDistance;
      }
      this.spawnBolts();
    }
  }

  /** 매 프레임 호출 (delta: seconds) */
  public update(delta: number) {
    if (!this.auraMesh || !this.samplingMesh) return;
    this.elapsed += delta;

    // aura time
    const u = (this.auraMesh.material as THREE.ShaderMaterial).uniforms;
    u.uTime.value = this.elapsed;

    // bolts update
    this.bolts = this.bolts.filter(b => b.update());

    // respawn
    if (this.bolts.length < this.opts.boltCount) {
      if (Math.random() < this.opts.spawnRate) {
        this.spawnOneBolt();
      }
    }
  }

  /** 현재 붙은 대상 조회 */
  public get target(): THREE.Object3D | undefined { return this.targetRoot; }

  /** 내부 리소스 모두 해제 */
  public dispose() { this.detach(); }

  /* -------------------------------- Internals -------------------------------- */

  private spawnBolts() {
    this.bolts.forEach(b=>b.dispose());
    this.bolts = [];
    if (!this.samplingMesh || !this.effectRoot) return;
    // even 초기화
    if (this.opts.distribution === 'even') this.samplingMesh.userData.evenCache = [];
    for (let i=0; i<this.opts.boltCount; i++) this.spawnOneBolt();
  }

  private spawnOneBolt() {
    if (!this.samplingMesh || !this.effectRoot) return;
    const bolt = new LightningBolt(
      this.samplingMesh,
      this.effectRoot,
      {
        radius: this.opts.boltRadius,
        jitter: this.opts.boltJitter,
        lifetime: this.opts.boltLifetime,
        color: new THREE.Color(this.opts.auraColor as any),
        offset: this.opts.boltOffset, // ⚡️ NEW: 옵션 전달
      },
      this.opts.boltGlow
    );
    this.bolts.push(bolt);
  }
}