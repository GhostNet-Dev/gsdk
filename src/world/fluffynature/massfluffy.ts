// WindyInstancedVegetation.ts
import * as THREE from "three";
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { Loader } from "@Glibs/loader/loader";
import { Char } from "@Glibs/types/assettypes";
import { EventTypes } from "@Glibs/types/globaltypes";


export type TRS = {
  position: THREE.Vector3 | [number, number, number];
  rotation: THREE.Euler | [number, number, number]; // radians
  scale: THREE.Vector3 | [number, number, number];
};

export type PatternCount = 2 | 3;
type Distribution = "uniform";

/* ------------------------------ Config Object ----------------------------- */

export interface WindyVegetationConfig {
  // Wind & bend
  windDir: THREE.Vector2;
  globalAmp: number;
  bendExp: number;

  // Patterns (2~3개)
  patternCount: PatternCount;
  patAmp: [number, number, number];
  patFreq: [number, number, number];
  patPhase: [number, number, number];

  // Per-instance jitter
  jitterAngleDeg: number;
  strengthRange: [number, number];

  // Material / draw
  roughness: number;
  metalness: number;
  doubleSide: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  frustumCulled: boolean;

  // Default blade geometry + vertex colors
  defaultBlade: {
    height: number;
    segY: number;
    bottomWidth: number;
    topWidth: number;
    withTip: boolean;
    colorBottom: THREE.ColorRepresentation;
    colorTop: THREE.ColorRepresentation;
    tipColor: THREE.ColorRepresentation;
  };

  // Cluster generation (per input TRS)
  cluster: {
    enabled: boolean;
    countRange: [number, number];
    radius: number;
    distribution: Distribution;
    posJitterY: [number, number];
    rotJitterYDeg: number;
    scaleJitter: [number, number];
  };

  // LOD (density reduction) — in-place 방식 (재패킹 없음)
  lod: {
    enabled: boolean;
    near: number;
    far: number;
    minDensity: number; // 0~1
  };

  // Frustum culling (cluster-level), throttled
  culling: {
    enabled: boolean;
    everyNFrames: number;
  };

  // Distance-based global amp (smoothed)
  ampDistance: {
    enabled: boolean;
    near: number;
    far: number;
    minFactor: number;
  };
}

// https://codepen.io/ghostwebservice/pen/EaVrVGe?editors=1001
const DEFAULT_CONFIG: WindyVegetationConfig = {
  windDir: new THREE.Vector2(1, 0),
  globalAmp: 0.2,
  bendExp: 1.5,

  patternCount: 3,
  patAmp: [0.6, 1.0, 1.3],
  patFreq: [0.9, 1.3, 1.7],
  patPhase: [0.0, 1.57, 3.14],

  jitterAngleDeg: 22,
  strengthRange: [0.65, 1.0],

  roughness: 0.95,
  metalness: 0.0,
  doubleSide: true,
  castShadow: false,
  receiveShadow: false,
  frustumCulled: true,

  defaultBlade: {
    height: 1.05,
    segY: 4,
    bottomWidth: 0.10,
    topWidth: 0.045,
    withTip: true,
    colorBottom: "#6fbf63",
    colorTop: "#b8f38a",
    tipColor: "#ffd6ef",
  },

  cluster: {
    enabled: true,
    countRange: [8, 16],
    radius: 1.0,
    distribution: "uniform",
    posJitterY: [0, 0.03],
    rotJitterYDeg: 20,
    scaleJitter: [0.9, 1.18],
  },

  lod: {
    enabled: true,
    near: 12,
    far: 80,
    minDensity: 0.3,
  },

  culling: {
    enabled: true,
    everyNFrames: 4,
  },

  ampDistance: {
    enabled: true,
    near: 10,
    far: 70,
    minFactor: 0.55,
  },
};

/* ---------------------------- Helper Structures --------------------------- */

type ClusterInfo = {
  center: THREE.Vector3;
  radius: number; // bounding sphere radius
  start: number; // first instance index in packed array
  count: number; // instances in this cluster
};

type WindUniforms = {
  uTime: { value: number };
  uWindDir: { value: THREE.Vector2 };
  uPatAmp: { value: Float32Array };
  uPatFreq: { value: Float32Array };
  uPatPhase: { value: Float32Array };
  uGlobalAmp: { value: number };
  uMaxY: { value: number };
  uBendExp: { value: number };
};

type Batch = {
  mesh: THREE.InstancedMesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  baseMatrices: Float32Array;
  clusters: ClusterInfo[];
  totalCount: number;
  uniforms: WindUniforms;
  ampSmooth?: number;
};

/* --------------------------------- Class --------------------------------- */

export class WindyInstancedVegetation implements IWorldMapObject, ILoop {
  public LoopId: number = 0;
  public Type: MapEntryType = MapEntryType.WindyInstancedVegetation;

  private cfg: WindyVegetationConfig;

  private time = 0;
  private frame = 0;

  private group: THREE.Group;       // 모든 배치의 부모
  private batches: Batch[] = [];    // 다중 Create 지원

  constructor(
    private loader: Loader,
    private scene: THREE.Scene, 
    private eventCtrl: IEventController,
    private camera: THREE.Camera,
    config?: Partial<WindyVegetationConfig>
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = "WindyInstancedVegetation";
    this.scene.add(this.group);
  }

  /* ------------------------------- Public API ------------------------------ */

  public SetCamera(cam: THREE.Camera) { this.camera = cam; }

  public SetWind(dirXZ: THREE.Vector2, globalAmp?: number, bendExp?: number) {
    if (dirXZ) this.batches.forEach(b => b.uniforms.uWindDir.value.copy(dirXZ.clone().normalize()));
    if (globalAmp !== undefined) { this.cfg.globalAmp = globalAmp; }
    if (bendExp   !== undefined) { this.batches.forEach(b => b.uniforms.uBendExp.value = bendExp); }
  }

  public SetPatterns(
    patAmp?: [number, number, number],
    patFreq?: [number, number, number],
    patPhase?: [number, number, number]
  ) {
    this.batches.forEach(b => {
      if (patAmp)   b.uniforms.uPatAmp.value.set(patAmp);
      if (patFreq)  b.uniforms.uPatFreq.value.set(patFreq);
      if (patPhase) b.uniforms.uPatPhase.value.set(patPhase);
    });
  }
  async Loader(id: Char) {
    const asset = this.loader.GetAssets(id)
    return (await asset.CloneModel()).children[0] as THREE.Mesh
  }
  /** 입력 TRS마다 군집을 만들어 전체 인스턴스를 배치합니다 (재패킹 없음). */
  public async Create(transforms: TRS[], id?: Char): Promise<THREE.InstancedMesh> {
    // 1) 군집 확장
    const expanded: TRS[] = [];
    const clusters: ClusterInfo[] = [];
    let runningStart = 0;
    const baseMesh = (id) ? await this.Loader(id) : undefined;

    for (const t of transforms) {
      if (typeof t.scale === 'number') t.scale = [t.scale, t.scale, t.scale];
      const center = this.v3(t.position, new THREE.Vector3());
      const yaw = (Array.isArray(t.rotation) ? t.rotation[1] : t.rotation.y) || 0;

      const cCount = this.randInt(this.cfg.cluster.countRange[0], this.cfg.cluster.countRange[1]);
      const cStart = runningStart;

      for (let i = 0; i < cCount; i++) {
        const r = this.cfg.cluster.radius * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const off = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);

        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const offRot = new THREE.Vector3(
          off.x * cosY - off.z * sinY,
          0,
          off.x * sinY + off.z * cosY
        );

        const jy = THREE.MathUtils.lerp(this.cfg.cluster.posJitterY[0], this.cfg.cluster.posJitterY[1], Math.random());
        const jYaw = THREE.MathUtils.degToRad(this.cfg.cluster.rotJitterYDeg) * (Math.random() * 2 - 1);

        const rot = Array.isArray(t.rotation)
          ? [t.rotation[0], t.rotation[1] + jYaw, t.rotation[2]]
          : [t.rotation.x, t.rotation.y + jYaw, t.rotation.z];

        const js = THREE.MathUtils.lerp(this.cfg.cluster.scaleJitter[0], this.cfg.cluster.scaleJitter[1], Math.random());
        const sc = this.v3(t.scale, new THREE.Vector3()).multiplyScalar(js);

        expanded.push({
          position: center.clone().add(offRot).add(new THREE.Vector3(0, jy, 0)),
          rotation: rot as [number, number, number],
          scale: sc.clone(),
        });
      }

      const cCountFinal = expanded.length - cStart;
      clusters.push({
        center: center.clone(),
        radius: this.cfg.cluster.radius,
        start: cStart,
        count: cCountFinal,
      });
      runningStart += cCountFinal;
    }

    const totalCount = expanded.length;

    // --- 2) 지오메트리 / 머티리얼 (배치별 고유 인스턴스 보장) ---
    const { geometry, material } = this.prepareGeomMatForBatch(baseMesh);
    const maxY = this.getGeometryHeightY(geometry) || this.cfg.defaultBlade.height;

    // 배치 전용 uniforms
    const uniforms: WindUniforms = {
      uTime:      { value: 0 },
      uWindDir:   { value: this.cfg.windDir.clone().normalize() },
      uPatAmp:    { value: new Float32Array(this.cfg.patAmp) },
      uPatFreq:   { value: new Float32Array(this.cfg.patFreq) },
      uPatPhase:  { value: new Float32Array(this.cfg.patPhase) },
      uGlobalAmp: { value: this.cfg.globalAmp },
      uMaxY:      { value: maxY },
      uBendExp:   { value: this.cfg.bendExp },
    };
    this.installWindOnBeforeCompile(material, uniforms);

    // --- 3) InstancedMesh & attributes ---
    const inst = new THREE.InstancedMesh(geometry, material, totalCount);
    inst.frustumCulled = this.cfg.frustumCulled;
    inst.castShadow = this.cfg.castShadow;
    inst.receiveShadow = this.cfg.receiveShadow;
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const iPattern  = new Float32Array(totalCount);
    const iPhase    = new Float32Array(totalCount);
    const iStrength = new Float32Array(totalCount);
    const iDir      = new Float32Array(totalCount);

    const jitter = THREE.MathUtils.degToRad(this.cfg.jitterAngleDeg);
    const [sMin, sMax] = this.cfg.strengthRange;

    for (let i = 0; i < totalCount; i++) {
      iPattern[i]  = i % this.cfg.patternCount;
      iPhase[i]    = Math.random() * Math.PI * 2;
      iStrength[i] = THREE.MathUtils.lerp(sMin, sMax, Math.random());
      iDir[i]      = THREE.MathUtils.lerp(-jitter, jitter, Math.random());
    }
    geometry.setAttribute("iPattern",  new THREE.InstancedBufferAttribute(iPattern, 1, false));
    geometry.setAttribute("iPhase",    new THREE.InstancedBufferAttribute(iPhase, 1, false));
    geometry.setAttribute("iStrength", new THREE.InstancedBufferAttribute(iStrength, 1, false));
    geometry.setAttribute("iDir",      new THREE.InstancedBufferAttribute(iDir, 1, false));

    // --- 4) 행렬 기록 (배치 내부 인덱스는 고정) ---
    const baseMatrices = new Float32Array(totalCount * 16);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();

    for (let i = 0; i < totalCount; i++) {
      const t = expanded[i];
      const pos = this.v3(t.position, p);
      const rot = this.euler(t.rotation);
      const scl = this.v3(t.scale, s);
      q.setFromEuler(rot);
      m.compose(pos, q, scl);
      m.toArray(baseMatrices, i * 16);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.count = totalCount; // 인덱스 고정

    // --- 5) 그룹에 추가 + 내부 배열에 등록 ---
    this.group.add(inst);
    const batch: Batch = { mesh: inst, geometry, material, baseMatrices, clusters, totalCount, uniforms, ampSmooth: undefined };
    this.batches.push(batch);
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)

    return inst;
  }

  /** in-place LOD/프러스텀 컬링 적용(재패킹 없음) */
  public async CreateDone() {
    this.batches.forEach(b => this.applyCullLODInPlace(b, true));
  }

  /** delta(sec)를 받아 시간/컬링/LOD/거리기반 Amp(스무딩)를 갱신합니다. */
  public update(delta: number): void {
    this.time += delta;
    this.frame++;

    const doCull = this.cfg.culling.enabled && (this.frame % Math.max(1, this.cfg.culling.everyNFrames) === 0);

    for (const b of this.batches) {
      // 시간 전달
      b.uniforms.uTime.value = this.time;

      // 컬링/LOD 적용
      if (doCull || this.cfg.lod.enabled) this.applyCullLODInPlace(b, false);

      // 배치 중심 기준 거리 Amp 스무딩
      if (this.cfg.ampDistance.enabled && this.camera && b.clusters.length) {
      const center = new THREE.Vector3();
        for (const c of b.clusters) center.add(c.center);
        center.multiplyScalar(1 / b.clusters.length);

      const cam = new THREE.Vector3();
      this.camera.getWorldPosition(cam);
      const d = cam.distanceTo(center);

      const { near, far, minFactor } = this.cfg.ampDistance;
      let target = this.cfg.globalAmp;
        if      (d >= far)  target = this.cfg.globalAmp * minFactor;
      else if (d > near) {
          const t = (d - near) / Math.max(1e-6, (far - near));
        target = this.cfg.globalAmp * THREE.MathUtils.lerp(1.0, minFactor, t);
      }

        const tau = 0.15;
        b.ampSmooth = (b.ampSmooth ?? target) + (target - (b.ampSmooth ?? target)) * (1.0 - Math.exp(-delta / tau));
        b.uniforms.uGlobalAmp.value = b.ampSmooth;
    }
  }
  }

  /** 특정 배치만 삭제: mesh 또는 인덱스를 넘길 수 있음. 인자 없으면 전체 삭제 */
  public Delete(target?: THREE.Object3D | number): void {
    if (target === undefined) {
      // 전체
      for (const b of this.batches) this.disposeBatch(b);
      this.batches = [];
      // 그룹은 남겨 Mesh 참조 보존
      return;
    }

    if (typeof target === "number") {
      const b = this.batches[target];
      if (b) { this.disposeBatch(b); this.batches.splice(target, 1); }
      return;
  }

    // mesh로 찾기
    const idx = this.batches.findIndex(b => b.mesh === target);
    if (idx >= 0) { this.disposeBatch(this.batches[idx]); this.batches.splice(idx, 1); }
  }

  public Show(): void { if (this.group) this.group.visible = true; }
  public Hide(): void { if (this.group) this.group.visible = false; }

  /** 다중 배치 저장 */
  public Save() {
    return this.batches.map(b => {
    const matrices: number[] = [];
    const m = new THREE.Matrix4();
      for (let i = 0; i < b.totalCount; i++) { b.mesh.getMatrixAt(i, m); matrices.push(...m.elements); }

      const g = b.geometry;
    const pick = (name: string) => (g.getAttribute(name) as THREE.InstancedBufferAttribute)?.array ?? null;

    return {
        count: b.totalCount,
      matrices,
      attributes: {
        iPattern: pick("iPattern"),
        iPhase: pick("iPhase"),
        iStrength: pick("iStrength"),
        iDir: pick("iDir"),
      },
        cfg: this.cfg, // 참고로 저장(전역 공통)
    };
    });
  }

  /** 다중 배치 로드 (Save() 반환 형태의 배열 지원) */
  public Load(data: any, callback?: Function) {
    // 기존 모두 제거
    this.Delete();

    const arr = Array.isArray(data) ? data : [data];
    for (const item of arr) {
      // 기본 지오메트리/머티리얼
      const { geometry, material } = this.prepareGeomMatForBatch(undefined);
      const uniforms: WindUniforms = {
        uTime: { value: 0 },
        uWindDir: { value: this.cfg.windDir.clone().normalize() },
        uPatAmp: { value: new Float32Array(this.cfg.patAmp) },
        uPatFreq: { value: new Float32Array(this.cfg.patFreq) },
        uPatPhase:{ value: new Float32Array(this.cfg.patPhase) },
        uGlobalAmp:{ value: this.cfg.globalAmp },
        uMaxY:{ value: this.getGeometryHeightY(geometry) || this.cfg.defaultBlade.height },
        uBendExp:{ value: this.cfg.bendExp },
      };
      this.installWindOnBeforeCompile(material, uniforms);

      const count = item.count as number;
    const inst = new THREE.InstancedMesh(geometry, material, count);
    inst.frustumCulled = this.cfg.frustumCulled;
    inst.castShadow = this.cfg.castShadow;
    inst.receiveShadow = this.cfg.receiveShadow;

      const fm = new Float32Array(item.matrices);
    const m = new THREE.Matrix4();
      for (let i = 0; i < count; i++) { m.fromArray(fm, i * 16); inst.setMatrixAt(i, m); }
    inst.instanceMatrix.needsUpdate = true;
      inst.count = count;

    // attributes 복원
      const g = inst.geometry;
    const apply = (name: string, a: Float32Array | number[] | null, itemSize = 1) => {
      if (!a) return;
      const f = Array.isArray(a) ? new Float32Array(a) : a;
      g.setAttribute(name, new THREE.InstancedBufferAttribute(f, itemSize, false));
    };
      if (item.attributes) {
        apply("iPattern",  item.attributes.iPattern);
        apply("iPhase",    item.attributes.iPhase);
        apply("iStrength", item.attributes.iStrength);
        apply("iDir",      item.attributes.iDir);
    }

      // 클러스터 추정(간단 묶음)
      const clusters = this.estimateClustersFromMatrices(fm);

      this.group.add(inst);
      this.batches.push({ mesh: inst, geometry, material, baseMatrices: fm, clusters, totalCount: count, uniforms, ampSmooth: undefined });
    }

    callback?.();
  }

  /* ------------------------------ Internals ------------------------------ */

  private applyCullLODInPlace(b: Batch, _initial: boolean) {
    if (!b || !b.baseMatrices) return;

    // frustum 준비
    let frustum: THREE.Frustum | null = null;
    const camPos = new THREE.Vector3();
    if (this.camera) {
      const vp = new THREE.Matrix4().multiplyMatrices(
        (this.camera as any).projectionMatrix,
        (this.camera as any).matrixWorldInverse
      );
      frustum = new THREE.Frustum().setFromProjectionMatrix(vp);
      this.camera.getWorldPosition(camPos);
    }

    // stable hash for selection
    const hash01 = (i: number) => {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      return s - Math.floor(s);
    };

    const kill = new THREE.Matrix4().makeScale(0, 0, 0);
    const m = new THREE.Matrix4();

    for (const c of b.clusters) {
      let culled = false;
      if (this.cfg.culling.enabled && frustum) {
        const sphere = new THREE.Sphere(c.center, c.radius);
        culled = !frustum.intersectsSphere(sphere);
      }

      let density = 1.0;
      if (this.cfg.lod.enabled && this.camera) {
        const d = camPos.distanceTo(c.center);
        const { near, far, minDensity } = this.cfg.lod;
        if (d <= near) density = 1.0;
        else if (d >= far) density = minDensity;
        else {
          const t = (d - near) / Math.max(1e-6, far - near);
          density = THREE.MathUtils.lerp(1.0, minDensity, t);
        }
      }

      // 인덱스 고정: keep 여부만 kill/restore
      for (let j = 0; j < c.count; j++) {
        const idx = c.start + j;
        const keep = !culled && (hash01(idx) <= density);
        if (keep) {
          m.fromArray(b.baseMatrices, idx * 16);
        } else {
          m.copy(kill);
        }
        b.mesh.setMatrixAt(idx, m);
      }
    }

    b.mesh.count = b.totalCount;
    b.mesh.instanceMatrix.needsUpdate = true;
  }

  private prepareGeomMatForBatch(baseMesh?: THREE.Mesh) {
    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshStandardMaterial;

    if (baseMesh) {
      // 지오메트리는 반드시 clone (인스턴스 속성 추가 때문)
      geometry = (baseMesh.geometry as THREE.BufferGeometry).clone();
      // 머티리얼은 clone 해서 배치별 uniforms 분리
      if (baseMesh.material instanceof THREE.MeshStandardMaterial) {
        material = baseMesh.material.clone();
        material.vertexColors = true;
      } else {
        material = new THREE.MeshStandardMaterial({ vertexColors: true });
      }
    } else {
      const pair = this.makeDefaultBladeGeometryAndMaterial();
      geometry = pair.geometry;
      material = pair.material;
    }
    return { geometry, material };
  }

  private makeDefaultBladeGeometryAndMaterial() {
    const g = this.makeTaperedBladeGeometry(
      this.cfg.defaultBlade.bottomWidth,
      this.cfg.defaultBlade.topWidth,
      this.cfg.defaultBlade.height,
      this.cfg.defaultBlade.segY
    );
    this.applyVerticalVertexColors(
      g,
      new THREE.Color(this.cfg.defaultBlade.colorBottom),
      new THREE.Color(this.cfg.defaultBlade.colorTop),
      this.cfg.defaultBlade.withTip ? new THREE.Color(this.cfg.defaultBlade.tipColor) : undefined
    );
    const mtl = new THREE.MeshStandardMaterial({
      roughness: this.cfg.roughness,
      metalness: this.cfg.metalness,
      side: this.cfg.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
      vertexColors: true,
    });
    return { geometry: g, material: mtl };
  }

  private installWindOnBeforeCompile(material: THREE.MeshStandardMaterial, uniforms: WindUniforms) {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `
          #include <common>
          uniform float uTime;
          uniform vec2  uWindDir;
          uniform float uPatAmp[3];
          uniform float uPatFreq[3];
          uniform float uPatPhase[3];
          uniform float uGlobalAmp;
          uniform float uMaxY;
          uniform float uBendExp;
          attribute float iPattern;
          attribute float iPhase;
          attribute float iStrength;
          attribute float iDir;

          // 0..1 hash from vec2
          float hash12(vec2 p){
            vec3 p3 = fract(vec3(p.xyx) * 0.1031);
            p3 += dot(p3, p3.yzx + 33.33);
            return fract((p3.x + p3.y) * p3.z);
          }
          `
        )
        .replace(
          "#include <begin_vertex>",
          `
          vec3 transformed = vec3(position);

          float h = max(uMaxY, 1e-4);
          float k = clamp(transformed.y / h, 0.0, 1.0);
          k = pow(k, uBendExp);

          vec2 dir = normalize(uWindDir);
          float ca = cos(iDir), sa = sin(iDir);
          mat2 rot = mat2(ca, -sa, sa, ca);
          dir = rot * dir;

          float p0 = 1.0 - step(0.5, iPattern);
          float p1 = step(0.5, iPattern) * (1.0 - step(1.5, iPattern));
          float p2 = step(1.5, iPattern);
          float amp  = uPatAmp[0]*p0 + uPatAmp[1]*p1 + uPatAmp[2]*p2;
          float freq = uPatFreq[0]*p0 + uPatFreq[1]*p1 + uPatFreq[2]*p2;
          float phs  = uPatPhase[0]*p0 + uPatPhase[1]*p1 + uPatPhase[2]*p2;

          // world-space phase seed (slot/LOD independent)
          #ifdef USE_INSTANCING
            vec3 iPos = (instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
          #else
            vec3 iPos = vec3(0.0);
          #endif
          vec3 wPos = (modelMatrix * vec4(iPos,1.0)).xyz;
          float phaseSeed = hash12(wPos.xz) * 6.2831853;

          float main = sin(uTime*freq + phs + iPhase + phaseSeed);
          float sway = amp * iStrength * uGlobalAmp * main;

          vec2 orth = vec2(-dir.y, dir.x);
          float jiggle = sin(uTime*(freq*1.7) + phs*1.3 + iPhase*2.1 + phaseSeed*1.7) * 0.35;

          transformed.xz += (dir * sway + orth * sway * jiggle) * k;
          `
        );

      (shader.uniforms as any).uTime      = uniforms.uTime;
      (shader.uniforms as any).uWindDir   = uniforms.uWindDir;
      (shader.uniforms as any).uPatAmp    = uniforms.uPatAmp;
      (shader.uniforms as any).uPatFreq   = uniforms.uPatFreq;
      (shader.uniforms as any).uPatPhase  = uniforms.uPatPhase;
      (shader.uniforms as any).uGlobalAmp = uniforms.uGlobalAmp;
      (shader.uniforms as any).uMaxY      = uniforms.uMaxY;
      (shader.uniforms as any).uBendExp   = uniforms.uBendExp;

      (material as any).userData.shader = shader;
    };
  }

  /* ------------------- Geometry utilities (colors/taper) ------------------ */

  private makeTaperedBladeGeometry(bottomW: number, topW: number, height: number, segY: number): THREE.BufferGeometry {
    const geo = new THREE.PlaneGeometry(bottomW, height, 1, segY);
    geo.translate(0, height / 2, 0);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i);
      const t = THREE.MathUtils.clamp(tmp.y / height, 0, 1);
      const half = THREE.MathUtils.lerp(bottomW * 0.5, topW * 0.5, t);
      const sx = Math.sign(tmp.x || 1);
      tmp.x = sx * half;
      pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }

  private applyVerticalVertexColors(
    g: THREE.BufferGeometry,
    colBottom: THREE.Color,
    colTop: THREE.Color,
    tipColor?: THREE.Color
  ) {
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    const minY = bb.min.y, maxY = bb.max.y;
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const tipStart = minY + (maxY - minY) * 0.95;

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (tipColor && y >= tipStart) {
        col[i*3+0] = tipColor.r; col[i*3+1] = tipColor.g; col[i*3+2] = tipColor.b;
      } else {
        const t = THREE.MathUtils.clamp((y - minY) / Math.max(1e-6, (maxY - minY)), 0, 1);
        const c = colBottom.clone().lerp(colTop, t);
        col[i*3+0] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
      }
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }

  /* -------------------------------- Utilities ----------------------------- */

  private v3(src: THREE.Vector3 | [number, number, number], out: THREE.Vector3) {
    return Array.isArray(src) ? out.set(src[0], src[1], src[2]) : out.copy(src);
  }
  private euler(src: THREE.Euler | [number, number, number]) {
    return Array.isArray(src) ? new THREE.Euler(src[0], src[1], src[2], "YXZ") : src;
  }
  private randInt(min: number, max: number) {
    return Math.floor(THREE.MathUtils.lerp(min, max + 1, Math.random()));
    }
  private getGeometryHeightY(geo: THREE.BufferGeometry) {
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    return bb ? (bb.max.y - bb.min.y) || 0 : 0;
  }

  private estimateClustersFromMatrices(arr: Float32Array): ClusterInfo[] {
    // 간단 그룹핑(고정 크기)
    const clusters: ClusterInfo[] = [];
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    const total = arr.length / 16;
    const GROUP = 12;
    for (let start = 0; start < total; start += GROUP) {
      const end = Math.min(total, start + GROUP);
      const center = new THREE.Vector3();
      for (let i = start; i < end; i++) { m.fromArray(arr, i * 16); p.setFromMatrixPosition(m); center.add(p); }
      const count = end - start;
      if (count > 0) center.multiplyScalar(1 / count);
      clusters.push({ center, radius: this.cfg.cluster.radius, start, count });
    }
    return clusters;
  }

  private disposeBatch(b: Batch) {
    // 지오메트리/어트리뷰트/머티리얼 정리
    const g = b.geometry;
    Object.values(g.attributes).forEach((a: any) => a?.dispose?.());
    g.dispose();
    b.material.dispose();

    this.group.remove(b.mesh);
  }

  /* -------------------------- Optional getters --------------------------- */

  /** 현재 생성된 InstancedMesh들을 반환 (읽기 전용) */
  public GetMeshes(): readonly THREE.InstancedMesh[] {
    return this.batches.map(b => b.mesh);
  }

  /** 배치 개수 */
  public GetBatchCount(): number { return this.batches.length; }
}
