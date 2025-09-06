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
  castShadow: true,
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

// NEW: 단일 InstancedMesh와 그 자원을 묶는 타입
type BatchPart = {
  mesh: THREE.InstancedMesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  uniforms: WindUniforms;
};

// CHANGED: Batch가 BatchPart의 배열을 갖도록 구조 변경
type Batch = {
  parts: BatchPart[];
  baseMatrices: Float32Array;
  clusters: ClusterInfo[];
  totalCount: number;
  ampSmooth?: number;
};

/* --------------------------------- Class --------------------------------- */

export class WindyInstancedVegetation implements IWorldMapObject, ILoop {
  public LoopId: number = 0;
  public Type: MapEntryType = MapEntryType.WindyInstancedVegetation;

  private cfg: WindyVegetationConfig;
  private time = 0;
  private frame = 0;

  private group: THREE.Group;
  private batches: Batch[] = [];

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
    if (dirXZ) {
      const normDir = dirXZ.clone().normalize();
      this.batches.forEach(b => b.parts.forEach(p => p.uniforms.uWindDir.value.copy(normDir)));
    }
    if (globalAmp !== undefined) {
        this.cfg.globalAmp = globalAmp;
        this.batches.forEach(b => b.parts.forEach(p => p.uniforms.uGlobalAmp.value = globalAmp));
    }
    if (bendExp !== undefined) {
        this.cfg.bendExp = bendExp;
        this.batches.forEach(b => b.parts.forEach(p => p.uniforms.uBendExp.value = bendExp));
    }
  }

  public SetPatterns(
    patAmp?: [number, number, number],
    patFreq?: [number, number, number],
    patPhase?: [number, number, number]
  ) {
    this.batches.forEach(b => {
      b.parts.forEach(p => {
        if (patAmp) p.uniforms.uPatAmp.value.set(patAmp);
        if (patFreq) p.uniforms.uPatFreq.value.set(patFreq);
        if (patPhase) p.uniforms.uPatPhase.value.set(patPhase);
      });
    });
  }
  
  async Loader(id: Char): Promise<THREE.Object3D> {
    const asset = this.loader.GetAssets(id);
    return await asset.CloneModel();
  }

  public async Create({
    transforms = [],
    id,
    config,
  }: { transforms?: TRS[]; id?: Char, config?: Partial<WindyVegetationConfig> } = {}
  ): Promise<THREE.Group> { // 1) 군집 확장
    this.cfg = { ...DEFAULT_CONFIG, ...config };

    const expanded: TRS[] = [];
    const clusters: ClusterInfo[] = [];
    let runningStart = 0;

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
    if (totalCount === 0) return new THREE.Group();

    // --- 2) 지오메트리 / 머티리얼 (Group 또는 기본 Blade 기반으로 BatchPart 생성) ---
    const sourceObject = id ? await this.Loader(id) : this.makeDefaultBladeAsGroup();
    const parts = this._createBatchParts(sourceObject, totalCount);

    if (parts.length === 0) {
      console.warn("WindyInstancedVegetation: No meshes found in the loaded model or default geometry.");
      return new THREE.Group();
    }

    // --- 3) 각 Part의 InstancedMesh에 attributes 설정 ---
    const jitter = THREE.MathUtils.degToRad(this.cfg.jitterAngleDeg);
    const [sMin, sMax] = this.cfg.strengthRange;

    const iPattern = new Float32Array(totalCount);
    const iPhase = new Float32Array(totalCount);
    const iStrength = new Float32Array(totalCount);
    const iDir = new Float32Array(totalCount);

    for (let i = 0; i < totalCount; i++) {
        iPattern[i] = i % this.cfg.patternCount;
        iPhase[i] = Math.random() * Math.PI * 2;
        iStrength[i] = THREE.MathUtils.lerp(sMin, sMax, Math.random());
        iDir[i] = THREE.MathUtils.lerp(-jitter, jitter, Math.random());
    }

    parts.forEach(p => {
        p.geometry.setAttribute("iPattern", new THREE.InstancedBufferAttribute(iPattern, 1, false));
        p.geometry.setAttribute("iPhase", new THREE.InstancedBufferAttribute(iPhase, 1, false));
        p.geometry.setAttribute("iStrength", new THREE.InstancedBufferAttribute(iStrength, 1, false));
        p.geometry.setAttribute("iDir", new THREE.InstancedBufferAttribute(iDir, 1, false));
    });

    // --- 4) 행렬 기록 ---
    const baseMatrices = new Float32Array(totalCount * 16);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const resultGroup = new THREE.Group();

    for (let i = 0; i < totalCount; i++) {
      const t = expanded[i];
      const pos = this.v3(t.position, p);
      const rot = this.euler(t.rotation);
      const scl = this.v3(t.scale, s);
      q.setFromEuler(rot);
      m.compose(pos, q, scl);
      m.toArray(baseMatrices, i * 16);
      
      parts.forEach(part => part.mesh.setMatrixAt(i, m));
    }

    parts.forEach(part => {
      part.mesh.instanceMatrix.needsUpdate = true;
      part.mesh.count = totalCount;
      resultGroup.add(part.mesh);
    });

    // --- 5) 그룹에 추가 + 내부 배열에 등록 ---
    this.group.add(resultGroup);
    const batch: Batch = { parts, baseMatrices, clusters, totalCount, ampSmooth: undefined };
    this.batches.push(batch);
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);

    return resultGroup;
  }

  public async CreateDone() {
    this.batches.forEach(b => this.applyCullLODInPlace(b, true));
  }

  public update(delta: number): void {
    this.time += delta;
    this.frame++;

    const doCull = this.cfg.culling.enabled && (this.frame % Math.max(1, this.cfg.culling.everyNFrames) === 0);

    for (const b of this.batches) {
      b.parts.forEach(p => p.uniforms.uTime.value = this.time);

      if (doCull || this.cfg.lod.enabled) this.applyCullLODInPlace(b, false);

      if (this.cfg.ampDistance.enabled && this.camera && b.clusters.length) {
        const center = new THREE.Vector3();
        for (const c of b.clusters) center.add(c.center);
        center.multiplyScalar(1 / b.clusters.length);

        const cam = new THREE.Vector3();
        this.camera.getWorldPosition(cam);
        const d = cam.distanceTo(center);

        const { near, far, minFactor } = this.cfg.ampDistance;
        let target = this.cfg.globalAmp;
        if (d >= far) target = this.cfg.globalAmp * minFactor;
        else if (d > near) {
          const t = (d - near) / Math.max(1e-6, (far - near));
          target = this.cfg.globalAmp * THREE.MathUtils.lerp(1.0, minFactor, t);
        }

        const tau = 0.15;
        b.ampSmooth = (b.ampSmooth ?? target) + (target - (b.ampSmooth ?? target)) * (1.0 - Math.exp(-delta / tau));
        b.parts.forEach(p => p.uniforms.uGlobalAmp.value = b.ampSmooth as number);
      }
    }
  }

  public Delete(target?: THREE.Object3D | number): void {
    if (target === undefined) {
      for (const b of this.batches) this.disposeBatch(b);
      this.batches = [];
      return;
    }

    if (typeof target === "number") {
      const b = this.batches[target];
      if (b) { this.disposeBatch(b); this.batches.splice(target, 1); }
      return;
    }

    const idx = this.batches.findIndex(b => b.parts.some(p => p.mesh === target || p.mesh.parent === target));
    if (idx >= 0) { this.disposeBatch(this.batches[idx]); this.batches.splice(idx, 1); }
  }

  public Show(): void { if (this.group) this.group.visible = true; }
  public Hide(): void { if (this.group) this.group.visible = false; }

  public Save() {
    // NOTE: This save implementation assumes all parts share the same instanced attributes.
    // It saves common data and reconstructs based on default geometry on Load.
    return this.batches.map(b => {
      if (b.parts.length === 0) return null;
      const firstPart = b.parts[0];
      const g = firstPart.geometry;
      const pick = (name: string) => (g.getAttribute(name) as THREE.InstancedBufferAttribute)?.array ?? null;

      return {
        count: b.totalCount,
        matrices: Array.from(b.baseMatrices),
        attributes: {
          iPattern: pick("iPattern") ? Array.from(pick("iPattern") as Float32Array) : null,
          iPhase: pick("iPhase") ? Array.from(pick("iPhase") as Float32Array) : null,
          iStrength: pick("iStrength") ? Array.from(pick("iStrength") as Float32Array) : null,
          iDir: pick("iDir") ? Array.from(pick("iDir")as Float32Array) : null,
        },
        cfg: this.cfg,
      };
    }).filter(item => item !== null);
  }

  public Load(data: any[], callback?: Function) {
    this.Delete();
    const arr = Array.isArray(data) ? data : [data];

    for (const item of arr) {
      if (!item) continue;
      const totalCount = item.count as number;
      
      const sourceObject = this.makeDefaultBladeAsGroup();
      const parts = this._createBatchParts(sourceObject, totalCount);
      if (parts.length === 0) continue;
      
      const baseMatrices = new Float32Array(item.matrices);
      const m = new THREE.Matrix4();
      
      for (let i = 0; i < totalCount; i++) {
          m.fromArray(baseMatrices, i * 16);
          parts.forEach(p => p.mesh.setMatrixAt(i, m));
      }

      const apply = (name: string, a: Float32Array | number[] | null, itemSize = 1) => {
        if (!a) return;
        const f = Array.isArray(a) ? new Float32Array(a) : a;
        parts.forEach(p => p.geometry.setAttribute(name, new THREE.InstancedBufferAttribute(f, itemSize, false)));
      };
      if (item.attributes) {
        apply("iPattern", item.attributes.iPattern);
        apply("iPhase", item.attributes.iPhase);
        apply("iStrength", item.attributes.iStrength);
        apply("iDir", item.attributes.iDir);
      }
      
      const resultGroup = new THREE.Group();
      parts.forEach(p => {
          p.mesh.instanceMatrix.needsUpdate = true;
          p.mesh.count = totalCount;
          resultGroup.add(p.mesh);
      });

      const clusters = this.estimateClustersFromMatrices(baseMatrices);
      
      this.group.add(resultGroup);
      this.batches.push({ parts, baseMatrices, clusters, totalCount, ampSmooth: undefined });
    }
    callback?.();
  }

  /* ------------------------------ Internals ------------------------------ */

  private applyCullLODInPlace(b: Batch, _initial: boolean) {
    if (!b || !b.baseMatrices || b.parts.length === 0) return;

    let frustum: THREE.Frustum | null = null;
    const camPos = new THREE.Vector3();
    if (this.camera) {
      this.camera.updateMatrixWorld();
      const vp = new THREE.Matrix4().multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
      frustum = new THREE.Frustum().setFromProjectionMatrix(vp);
      this.camera.getWorldPosition(camPos);
    }

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

      for (let j = 0; j < c.count; j++) {
        const idx = c.start + j;
        const keep = !culled && (hash01(idx) <= density);
        if (keep) {
          m.fromArray(b.baseMatrices, idx * 16);
        } else {
          m.copy(kill);
        }
        b.parts.forEach(p => p.mesh.setMatrixAt(idx, m));
      }
    }
    
    b.parts.forEach(p => {
        p.mesh.count = b.totalCount;
        p.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  private _createBatchParts(source: THREE.Object3D, totalCount: number): BatchPart[] {
    const parts: BatchPart[] = [];
    
    source.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            const geometry = child.geometry.clone();
            const material = child.material instanceof THREE.Material 
                ? child.material.clone() as THREE.MeshStandardMaterial 
                : new THREE.MeshStandardMaterial();

            if (!('vertexColors' in material)) {
                (material as any).vertexColors = true;
            } else {
                 material.vertexColors = true;
            }

            const maxY = this.getGeometryHeightY(geometry) || this.cfg.defaultBlade.height;

            const uniforms: WindUniforms = {
                uTime: { value: 0 },
                uWindDir: { value: this.cfg.windDir.clone().normalize() },
                uPatAmp: { value: new Float32Array(this.cfg.patAmp) },
                uPatFreq: { value: new Float32Array(this.cfg.patFreq) },
                uPatPhase: { value: new Float32Array(this.cfg.patPhase) },
                uGlobalAmp: { value: this.cfg.globalAmp },
                uMaxY: { value: maxY },
                uBendExp: { value: this.cfg.bendExp },
            };
            this.installWindOnBeforeCompile(material, uniforms);

            const inst = new THREE.InstancedMesh(geometry, material, totalCount);
            inst.frustumCulled = this.cfg.frustumCulled;
            inst.castShadow = this.cfg.castShadow;
            inst.receiveShadow = this.cfg.receiveShadow;
            inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            
            parts.push({ mesh: inst, geometry, material, uniforms });
        }
    });

    return parts;
  }
  
  private makeDefaultBladeAsGroup(): THREE.Group {
      const { geometry, material } = this.makeDefaultBladeGeometryAndMaterial();
      const mesh = new THREE.Mesh(geometry, material);
      const group = new THREE.Group();
      group.add(mesh);
      return group;
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
          #include <begin_vertex>
          float h = max(uMaxY, 1e-4);
          float k = clamp(position.y / h, 0.0, 1.0);
          k = pow(k, uBendExp);

          vec2 dir = normalize(uWindDir);
          float ca = cos(iDir), sa = sin(iDir);
          mat2 rot = mat2(ca, -sa, sa, ca);
          dir = rot * dir;

          int patternIdx = int(iPattern);
          float amp, freq, phs;
          if (patternIdx == 0) { amp = uPatAmp[0]; freq = uPatFreq[0]; phs = uPatPhase[0]; }
          else if (patternIdx == 1) { amp = uPatAmp[1]; freq = uPatFreq[1]; phs = uPatPhase[1]; }
          else { amp = uPatAmp[2]; freq = uPatFreq[2]; phs = uPatPhase[2]; }

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

      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uWindDir = uniforms.uWindDir;
      shader.uniforms.uPatAmp = uniforms.uPatAmp;
      shader.uniforms.uPatFreq = uniforms.uPatFreq;
      shader.uniforms.uPatPhase = uniforms.uPatPhase;
      shader.uniforms.uGlobalAmp = uniforms.uGlobalAmp;
      shader.uniforms.uMaxY = uniforms.uMaxY;
      shader.uniforms.uBendExp = uniforms.uBendExp;

      (material as any).userData.shader = shader;
    };
    material.needsUpdate = true;
  }
  
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
        col[i * 3 + 0] = tipColor.r; col[i * 3 + 1] = tipColor.g; col[i * 3 + 2] = tipColor.b;
      } else {
        const t = THREE.MathUtils.clamp((y - minY) / Math.max(1e-6, (maxY - minY)), 0, 1);
        const c = colBottom.clone().lerp(colTop, t);
        col[i * 3 + 0] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
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
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    return bb ? (bb.max.y - bb.min.y) || 0 : 0;
  }

  private estimateClustersFromMatrices(arr: Float32Array): ClusterInfo[] {
    const clusters: ClusterInfo[] = [];
    const m = new THREE.Matrix4(), p = new THREE.Vector3();
    const total = arr.length / 16;
    const GROUP = 12; // Heuristic for grouping instances into a cluster
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
    b.parts.forEach(p => {
        // Find parent and remove mesh from it. The parent could be a group created in Create(), which is a child of this.group
        p.mesh.parent?.remove(p.mesh);
        p.geometry.dispose();
        p.material.dispose();
    });
  }

  public GetMeshes(): readonly THREE.InstancedMesh[] {
    return this.batches.flatMap(b => b.parts.map(p => p.mesh));
  }

  public GetBatchCount(): number { return this.batches.length; }
}