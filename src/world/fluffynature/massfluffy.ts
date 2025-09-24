import * as THREE from "three";
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { Loader } from "@Glibs/loader/loader";
import { Char } from "@Glibs/types/assettypes";
import { EventTypes } from "@Glibs/types/globaltypes";

/**
 * WindyInstancedVegetation — 배치별 독립 설정(딥 스냅샷) + 거리 LOD + 프러스텀 컬링
 *  - Exclusion Zone 관련 로직 완전 제거
 *  - Create() 호출마다 cfgLocal(딥 클론/딥 머지) 생성 → Batch.cfg로 고정
 *  - update()/applyCullLODInPlace()는 Batch.cfg 기준으로 동작
 *  - 깜빡임 완화: alphaTest 기반 컷아웃 + polygonOffset + alphaToCoverage(옵션)
 */

export type TRS = {
  position: THREE.Vector3 | [number, number, number];
  rotation: THREE.Euler | [number, number, number]; // radians
  scale: number | THREE.Vector3 | [number, number, number];
};
export type PatternCount = 2 | 3;

export interface WindyVegetationConfig {
  windEnabled: boolean;
  windDir: THREE.Vector2;
  globalAmp: number;
  bendExp: number;
  patternCount: PatternCount;
  patAmp: [number, number, number];
  patFreq: [number, number, number];
  patPhase: [number, number, number];
  jitterAngleDeg: number;
  strengthRange: [number, number];
  roughness: number;
  metalness: number;
  doubleSide: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  frustumCulled: boolean;
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
  cluster: {
    enabled: boolean;
    countRange: [number, number];
    radius: number;
    distribution: "uniform";
    posJitterY: [number, number];
    rotJitterYDeg: number;
    scaleJitter: [number, number];
  };
  lod: {
    enabled: boolean;
    near: number;       // 이내: 밀도 1.0
    far: number;        // 이상: minDensity
    minDensity: number; // [0..1]
  };
  culling: {
    enabled: boolean;   // 프러스텀 컬링
    everyNFrames: number;
  };
  ampDistance: {
    enabled: boolean;
    near: number;
    far: number;
    minFactor: number;
  };
  hardMode?: {
    compactionEnabled: boolean;
    repackEveryNFrames?: number;
  };
}

const DEFAULT_CONFIG: WindyVegetationConfig = {
  windEnabled: true,
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
    bottomWidth: 0.1,
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
  hardMode: {
    compactionEnabled: false,
    repackEveryNFrames: 4,
  },
};

export type ClusterInfo = {
  center: THREE.Vector3; // 로컬 좌표
  radius: number;        // 로컬 반경(프러스텀 구 반경 산정에 사용)
  start: number;
  count: number;
};

type WindUniforms = {
  uWindEnabled: { value: boolean };
  uTime: { value: number };
  uWindDir: { value: THREE.Vector2 };
  uPatAmp: { value: THREE.Vector3 };
  uPatFreq: { value: THREE.Vector3 };
  uPatPhase: { value: THREE.Vector3 };
  uGlobalAmp: { value: number };
  uMaxY: { value: number };
  uBendExp: { value: number };
};

type BatchPart = {
  mesh: THREE.InstancedMesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
  uniforms: WindUniforms;
};

type Batch = {
  parts: BatchPart[];
  baseMatrices: Float32Array; // 16 * totalCount
  clusters: ClusterInfo[];
  totalCount: number;
  ampSmooth?: number;
  keepMask: Uint8Array; // 0 or 1
  modelId?: Char | null;
  rand?: Float32Array;
  cfg: WindyVegetationConfig;  // ← 배치 전용 스냅샷
};

/* ----------------------- 딥 클론/딥 머지 유틸 ----------------------- */
function cloneCfg(src: WindyVegetationConfig): WindyVegetationConfig {
  return {
    ...src,
    windDir: src.windDir.clone(),
    defaultBlade: { ...src.defaultBlade },
    cluster: { ...src.cluster },
    lod: { ...src.lod },
    culling: { ...src.culling },
    ampDistance: { ...src.ampDistance },
    hardMode: src.hardMode ? { ...src.hardMode } : undefined,
  };
}
function mergeCfg(base: WindyVegetationConfig, patch?: Partial<WindyVegetationConfig>): WindyVegetationConfig {
  if (!patch) return cloneCfg(base);
  const out = cloneCfg(base);
  Object.assign(out, patch);
  if (patch.windDir) {
    out.windDir = patch.windDir instanceof THREE.Vector2
      ? patch.windDir.clone()
      : new THREE.Vector2((patch.windDir as any).x, (patch.windDir as any).y);
  }
  if (patch.defaultBlade) out.defaultBlade = { ...out.defaultBlade, ...patch.defaultBlade };
  if (patch.cluster)      out.cluster      = { ...out.cluster,      ...patch.cluster };
  if (patch.lod)          out.lod          = { ...out.lod,          ...patch.lod };
  if (patch.culling)      out.culling      = { ...out.culling,      ...patch.culling };
  if (patch.ampDistance)  out.ampDistance  = { ...out.ampDistance,  ...patch.ampDistance };
  if (patch.hardMode)     out.hardMode     = { ...(out.hardMode ?? {}), ...patch.hardMode };
  return out;
}

export class WindyInstancedVegetation implements IWorldMapObject, ILoop {
  public LoopId = 0;
  public Type: MapEntryType = MapEntryType.WindyInstancedVegetation;

  /** 전역 기본값(템플릿) — 각 배치 생성 시 딥 클론되어 batch.cfg로 저장됩니다 */
  private cfg: WindyVegetationConfig;

  private time = 0;
  private frame = 0;
  private group: THREE.Group;
  private batches: Batch[] = [];
  private camera: THREE.Camera;

  private lastCamPos = new THREE.Vector3();
  private lastCamQuat = new THREE.Quaternion();
  private forceUpdate = false;

  constructor(
    private loader: Loader,
    private scene: THREE.Scene,
    private eventCtrl: IEventController,
    camera: THREE.Camera,
    config?: Partial<WindyVegetationConfig>
  ) {
    const merged = mergeCfg(DEFAULT_CONFIG, config);
    merged.patternCount = (Math.max(2, Math.min(3, merged.patternCount)) as PatternCount);
    if (!merged.hardMode) merged.hardMode = { compactionEnabled: false, repackEveryNFrames: merged.culling.everyNFrames };
    if (merged.hardMode.repackEveryNFrames == null) merged.hardMode.repackEveryNFrames = merged.culling.everyNFrames;
    this.cfg = merged;

    this.group = new THREE.Group();
    this.group.name = "WindyInstancedVegetation";
    this.scene.add(this.group);
    this.camera = camera;
  }

  /* ----------------------- 전역/배치 제어 API ----------------------- */
  /** 전역 템플릿 갱신 + 모든 배치 유니폼 반영 */
  public SetWindEnabled(enabled: boolean, batchIndex?: number) {
    if (batchIndex == null) {
      this.cfg.windEnabled = enabled;
      this.batches.forEach(b => {
        b.cfg.windEnabled = enabled;
        b.parts.forEach(p => { p.uniforms.uWindEnabled.value = enabled; });
      });
    } else {
      const b = this.batches[batchIndex];
      if (!b) return;
      b.cfg.windEnabled = enabled;
      b.parts.forEach(p => { p.uniforms.uWindEnabled.value = enabled; });
    }
  }

  /** 전역/배치: 바람 방향/진폭/곡률 */
  public SetWind(dirXZ: THREE.Vector2, globalAmp?: number, bendExp?: number, batchIndex?: number) {
    const apply = (b: Batch) => {
      if (dirXZ) {
        const norm = dirXZ.clone().normalize();
        b.cfg.windDir.copy(norm);
        b.parts.forEach(p => p.uniforms.uWindDir.value.copy(norm));
      }
      if (globalAmp !== undefined) {
        b.cfg.globalAmp = globalAmp;
        b.parts.forEach(p => p.uniforms.uGlobalAmp.value = globalAmp);
      }
      if (bendExp !== undefined) {
        b.cfg.bendExp = bendExp;
        b.parts.forEach(p => p.uniforms.uBendExp.value = bendExp);
      }
    };
    if (batchIndex == null) {
      apply({ cfg: this.cfg } as unknown as Batch);
      this.batches.forEach(apply);
    } else {
      const b = this.batches[batchIndex];
      if (b) apply(b);
    }
  }

  /** 전역/배치: 바람 패턴 파라미터 */
  public SetPatterns(
    patAmp?: [number, number, number],
    patFreq?: [number, number, number],
    patPhase?: [number, number, number],
    batchIndex?: number
  ) {
    const apply = (b: Batch) => {
      if (patAmp)  b.cfg.patAmp = patAmp;
      if (patFreq) b.cfg.patFreq = patFreq;
      if (patPhase) b.cfg.patPhase = patPhase;
      b.parts.forEach(p => {
        if (patAmp)  p.uniforms.uPatAmp.value.set(...patAmp);
        if (patFreq) p.uniforms.uPatFreq.value.set(...patFreq);
        if (patPhase) p.uniforms.uPatPhase.value.set(...patPhase);
      });
    };
    if (batchIndex == null) {
      apply({ cfg: this.cfg } as unknown as Batch);
      this.batches.forEach(apply);
    } else {
      const b = this.batches[batchIndex];
      if (b) apply(b);
    }
  }

  /* ----------------------- 로더 ----------------------- */
  async Loader(id: Char): Promise<THREE.Object3D> {
    const asset = this.loader.GetAssets(id);
    return await asset.CloneModel();
  }

  /* ----------------------- 생성 ----------------------- */
  public async Create({
    transforms = [],
    id,
    config,
  }: { transforms?: TRS[]; id?: Char, config?: Partial<WindyVegetationConfig> } = {}
  ): Promise<THREE.Group> {
    const cfgLocal = mergeCfg(this.cfg, config);
    cfgLocal.patternCount = (Math.max(2, Math.min(3, cfgLocal.patternCount)) as PatternCount);
    if (!cfgLocal.hardMode) cfgLocal.hardMode = { compactionEnabled: false, repackEveryNFrames: cfgLocal.culling.everyNFrames };
    if (cfgLocal.hardMode.repackEveryNFrames == null) cfgLocal.hardMode.repackEveryNFrames = cfgLocal.culling.everyNFrames;

    const normTRS = (t: Partial<TRS>): TRS => ({
      position: Array.isArray(t.position) ? t.position : (t.position ?? new THREE.Vector3()),
      rotation: Array.isArray(t.rotation) ? [t.rotation[0] ?? 0, t.rotation[1] ?? 0, t.rotation[2] ?? 0]
                                          : (t.rotation ?? new THREE.Euler(0,0,0,"YXZ")),
      scale:    typeof t.scale === 'number' ? [t.scale, t.scale, t.scale]
               : (Array.isArray(t.scale) ? [t.scale[0] ?? 1, t.scale[1] ?? 1, t.scale[2] ?? 1]
                                         : (t.scale ?? new THREE.Vector3(1,1,1))),
    });

    const expanded: TRS[] = [];
    const clusters: ClusterInfo[] = [];
    let runningStart = 0;

    for (const tRaw of transforms) {
      const t = normTRS(tRaw);
      const center = this.v3(t.position, new THREE.Vector3());
      const yaw = (Array.isArray(t.rotation) ? t.rotation[1] : t.rotation.y) || 0;
      const cCount = cfgLocal.cluster.enabled
        ? this.randInt(cfgLocal.cluster.countRange[0], cfgLocal.cluster.countRange[1])
        : 1;

      const cStart = runningStart;
      for (let i = 0; i < cCount; i++) {
        const r = cfgLocal.cluster.radius * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const off = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const offRot = new THREE.Vector3(off.x * cosY - off.z * sinY, 0, off.x * sinY + off.z * cosY);
        const jy = THREE.MathUtils.lerp(cfgLocal.cluster.posJitterY[0], cfgLocal.cluster.posJitterY[1], Math.random());
        const jYaw = THREE.MathUtils.degToRad(cfgLocal.cluster.rotJitterYDeg) * (Math.random() * 2 - 1);
        const rot = Array.isArray(t.rotation)
          ? [t.rotation[0], (t.rotation[1] ?? 0) + jYaw, t.rotation[2]]
          : [t.rotation.x, t.rotation.y + jYaw, t.rotation.z];
        const js = THREE.MathUtils.lerp(cfgLocal.cluster.scaleJitter[0], cfgLocal.cluster.scaleJitter[1], Math.random());
        const sc = this.v3(t.scale as THREE.Vector3 | [number,number,number], new THREE.Vector3()).multiplyScalar(js);
        expanded.push({ position: center.clone().add(offRot).add(new THREE.Vector3(0, jy, 0)), rotation: rot as [number,number,number], scale: sc.clone() });
      }
      const cCountFinal = expanded.length - cStart;
      clusters.push({ center: center.clone(), radius: cfgLocal.cluster.radius, start: cStart, count: cCountFinal });
      runningStart += cCountFinal;
    }

    const totalCount = expanded.length;
    if (totalCount === 0) return new THREE.Group();

    const sourceObject = id ? await this.Loader(id) : this.makeDefaultBladeAsGroup(cfgLocal);
    const parts = this._createBatchParts(sourceObject, totalCount, cfgLocal);
    if (parts.length === 0) {
      console.warn("WindyInstancedVegetation: No meshes found in the loaded model or default geometry.");
      return new THREE.Group();
    }

    const jitter = THREE.MathUtils.degToRad(cfgLocal.jitterAngleDeg);
    const [sMin, sMax] = cfgLocal.strengthRange;
    const iPattern = new Float32Array(totalCount);
    const iPhase = new Float32Array(totalCount);
    const iStrength = new Float32Array(totalCount);
    const iDir = new Float32Array(totalCount);
    for (let i = 0; i < totalCount; i++) {
      iPattern[i] = i % cfgLocal.patternCount;
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

    const baseMatrices = new Float32Array(totalCount * 16);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();

    const resultGroup = new THREE.Group();
    for (let i = 0; i < totalCount; i++) {
      const t = expanded[i];
      const pos = this.v3(t.position, p);
      pos.y += 0.005; // 지면과 미세 분리로 z-fighting 완화(스케일에 맞춰 조정 가능)
      const rot = this.euler(t.rotation);
      const scl = Array.isArray(t.scale) ? this.v3(t.scale as [number,number,number], s) : (t.scale as THREE.Vector3);
      q.setFromEuler(rot);
      m.compose(pos, q, scl);
      m.toArray(baseMatrices, i * 16);
      parts.forEach(part => part.mesh.setMatrixAt(i, m));
    }

    parts.forEach(part => {
      part.mesh.frustumCulled = false;
      part.mesh.castShadow = cfgLocal.castShadow;
      part.mesh.receiveShadow = cfgLocal.receiveShadow;
      part.mesh.count = totalCount;
      part.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      part.mesh.instanceMatrix.needsUpdate = true;
      resultGroup.add(part.mesh);
    });

    this.group.add(resultGroup);
    const keepMask = new Uint8Array(totalCount);

    const batch: Batch = {
      parts, baseMatrices, clusters, totalCount, keepMask, modelId: id ?? null, cfg: cfgLocal
    };
    this.buildRand(batch);
    this.batches.push(batch);

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);

    return resultGroup;
  }

  public async CreateDone() {
    this.camera.updateMatrixWorld();
    this.lastCamPos.copy(this.camera.position);
    this.lastCamQuat.copy(this.camera.quaternion);
    this.batches.forEach(b => this.applyCullLODInPlace(b, true));
  }

  /* ----------------------- 루프 ----------------------- */
  public update(delta: number): void {
    this.time += delta;
    this.frame++;

    const isDirty = this.isCameraDirty();
    // 배치별 everyNFrames 사용을 원하면 아래를 b.cfg 단위로 옮겨도 됩니다.
    const canUpdateLOD = (this.frame % Math.max(1, this.cfg.culling.everyNFrames) === 0);
    const needsUpdate = isDirty || this.forceUpdate;

    for (const b of this.batches) {
      if (b.cfg.windEnabled) {
        b.parts.forEach(p => p.uniforms.uTime.value = this.time);
      }

      if ((needsUpdate && canUpdateLOD) || this.forceUpdate) {
        this.applyCullLODInPlace(b, false);
      }

      if (needsUpdate && b.cfg.ampDistance.enabled && this.camera && b.clusters.length) {
        const cam = new THREE.Vector3();
        this.camera.getWorldPosition(cam);
        const dist = Math.min(...b.clusters.map(c => cam.distanceTo(c.center)));
        const { near, far, minFactor } = b.cfg.ampDistance;
        let target = b.cfg.globalAmp;
        if (dist >= far)      target = b.cfg.globalAmp * minFactor;
        else if (dist > near) target = b.cfg.globalAmp * THREE.MathUtils.lerp(1.0, minFactor, (dist - near) / Math.max(1e-6, (far - near)));
        b.ampSmooth = target;
        b.parts.forEach(p => p.uniforms.uGlobalAmp.value = b.ampSmooth as number);
      }
    }

    if (needsUpdate) {
      this.lastCamPos.copy(this.camera.position);
      this.lastCamQuat.copy(this.camera.quaternion);
      this.forceUpdate = false;
    }
  }

  /* ----------------------- 삭제 ----------------------- */
  public Delete(target?: THREE.Object3D | number): void {
    if (target === undefined) {
      for (const b of this.batches) this.disposeBatch(b);
      this.batches = [];
      this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
      return;
    }
    if (typeof target === "number") {
      const b = this.batches[target];
      if (b) { this.disposeBatch(b); this.batches.splice(target, 1); }
      if (this.batches.length === 0) this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
      return;
    }
    const idx = this.batches.findIndex(b => b.parts.some(p => p.mesh === target || p.mesh.parent === target));
    if (idx >= 0) { this.disposeBatch(this.batches[idx]); this.batches.splice(idx, 1); }
    if (this.batches.length === 0) this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
  }

  public Show(): void { if (this.group) this.group.visible = true; }
  public Hide(): void { if (this.group) this.group.visible = false; }

  /* ----------------------- 직렬화 ----------------------- */
  public Save() {
    return this.batches.map(b => {
      if (b.parts.length === 0) return null;
      const firstPart = b.parts[0];
      const g = firstPart.geometry;
      const pickArr = (name: string) => {
        const attr = g.getAttribute(name) as THREE.InstancedBufferAttribute | undefined;
        return attr ? Array.from(attr.array as Float32Array) : null;
      };
      const cfg = {
        ...b.cfg,
        windDir: { x: b.cfg.windDir.x, y: b.cfg.windDir.y } // Vector2 직렬화
      } as any;
      return {
        count: b.totalCount,
        matrices: Array.from(b.baseMatrices),
        attributes: {
          iPattern: pickArr("iPattern"),
          iPhase: pickArr("iPhase"),
          iStrength: pickArr("iStrength"),
          iDir: pickArr("iDir"),
        },
        cfg,
        modelId: b.modelId ?? null,
      };
    }).filter(item => item !== null);
  }

  public async Load(data: any[], callback?: Function) {
    this.Delete();
    const arr = Array.isArray(data) ? data : [data];

    for (const item of arr) {
      if (!item) continue;
      const totalCount = item.count as number;

      // 배치 전용 cfgLocal 복구
      const cfgLocal = (() => {
        const cfg = mergeCfg(DEFAULT_CONFIG, item.cfg);
        cfg.windDir = this.toVector2(item.cfg?.windDir ?? cfg.windDir);
        cfg.patternCount = (Math.max(2, Math.min(3, cfg.patternCount)) as PatternCount);
        if (!cfg.hardMode) cfg.hardMode = { compactionEnabled: false, repackEveryNFrames: cfg.culling.everyNFrames };
        if (cfg.hardMode.repackEveryNFrames == null) cfg.hardMode.repackEveryNFrames = cfg.culling.everyNFrames;
        return cfg;
      })();

      const sourceObject = item.modelId ? await this.Loader(item.modelId as Char) : this.makeDefaultBladeAsGroup(cfgLocal);
      const parts = this._createBatchParts(sourceObject, totalCount, cfgLocal);
      if (parts.length === 0) continue;

      const baseMatrices = new Float32Array(item.matrices);
      const m = new THREE.Matrix4();
      for (let i = 0; i < totalCount; i++) {
        m.fromArray(baseMatrices, i * 16);
        parts.forEach(p => p.mesh.setMatrixAt(i, m));
      }

      const applyAttr = (name: string, a: Float32Array | number[] | null, itemSize = 1) => {
        if (!a) return;
        const f = Array.isArray(a) ? new Float32Array(a) : a;
        parts.forEach(p => p.geometry.setAttribute(name, new THREE.InstancedBufferAttribute(f, itemSize, false)));
      };
      if (item.attributes) {
        applyAttr("iPattern", item.attributes.iPattern);
        applyAttr("iPhase", item.attributes.iPhase);
        applyAttr("iStrength", item.attributes.iStrength);
        applyAttr("iDir", item.attributes.iDir);
      }

      const resultGroup = new THREE.Group();
      parts.forEach(p => {
        p.mesh.instanceMatrix.needsUpdate = true;
        p.mesh.count = totalCount;
        p.mesh.frustumCulled = false;
        resultGroup.add(p.mesh);
      });

      const clusters = this.estimateClustersFromMatrices(baseMatrices, cfgLocal);
      const keepMask = new Uint8Array(totalCount);
      this.group.add(resultGroup);

      const batch: Batch = { parts, baseMatrices, clusters, totalCount, keepMask, modelId: item.modelId ?? null, cfg: cfgLocal };
      this.buildRand(batch);
      this.batches.push(batch);
    }

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
    callback?.();
  }

  /* ----------------------- 내부 로직 ----------------------- */
  private isCameraDirty(): boolean {
    const POS_THRESHOLD_SQ = 0.2 * 0.2;
    const ROT_THRESHOLD = 0.99999;
    const distSq = this.camera.position.distanceToSquared(this.lastCamPos);
    const dot = this.camera.quaternion.dot(this.lastCamQuat);
    return distSq > POS_THRESHOLD_SQ || Math.abs(dot) < ROT_THRESHOLD;
  }

  private buildRand(b: Batch): void {
    if (b.rand) return;
    const rand = new Float32Array(b.totalCount);
    for (let i = 0; i < b.totalCount; i++) {
      const s = Math.sin(i * 12.9898) * 43758.5453;
      rand[i] = s - Math.floor(s);
    }
    b.rand = rand;
  }

  /**
   * 프러스텀 컬링 + 거리 LOD 밀도 적용.
   *  - near 이내: density=1.0
   *  - far 이상: density=minDensity
   *  - 사이: 선형 보간
   *  - rand[idx] <= density → keep
   *  - 하드 모드: 주기적으로 컴팩션
   */
  private applyCullLODInPlace(b: Batch, initial: boolean) {
    if (!b || !b.baseMatrices || b.parts.length === 0) return;

    // Frustum
    let frustum: THREE.Frustum | null = null;
    const camPos = new THREE.Vector3();
    if (this.camera) {
      this.camera.updateMatrixWorld();
      const vp = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
      frustum = new THREE.Frustum().setFromProjectionMatrix(vp);
      this.camera.getWorldPosition(camPos);
    }

    // 배치 그룹의 matrixWorld
    const firstMesh = b.parts[0]?.mesh;
    const groupNode: THREE.Object3D | undefined = firstMesh?.parent ?? firstMesh;
    if (groupNode) groupNode.updateMatrixWorld();
    const groupMW = groupNode?.matrixWorld ?? new THREE.Matrix4();

    if (!b.rand) this.buildRand(b);
    const rand = b.rand!;

    const kill = new THREE.Matrix4().makeScale(0, 0, 0);
    const m = new THREE.Matrix4();

    let minTouched = Number.POSITIVE_INFINITY;
    let maxTouched = -1;
    const markTouched = (idx: number) => { if (idx < minTouched) minTouched = idx; if (idx > maxTouched) maxTouched = idx; };

    for (const c of b.clusters) {
      // 1) 프러스텀 컬링(클러스터 단위)
      let culled = false;
      if (b.cfg.culling.enabled && frustum) {
        const centerWorld = c.center.clone().applyMatrix4(groupMW);
        const radiusWorld = c.radius * 1.2;
        const sphere = new THREE.Sphere(centerWorld, radiusWorld);
        culled = !frustum.intersectsSphere(sphere);
      }

      // 2) 거리 LOD 밀도
      let density = 1.0;
      if (b.cfg.lod.enabled && this.camera) {
        const centerWorld = c.center.clone().applyMatrix4(groupMW);
        const d = camPos.distanceTo(centerWorld);
        const { near, far, minDensity } = b.cfg.lod;
        if (d <= near) density = 1.0;
        else if (d >= far) density = minDensity;
        else density = THREE.MathUtils.lerp(1.0, minDensity, (d - near) / Math.max(1e-6, (far - near)));

        // (옵션) 양자화/히스테리시스로 깜빡임 완화하려면 여기서 보간값 보정
        // density = Math.round(density * 10) / 10;
      }

      // 3) 인스턴스 유지/제거
      for (let j = 0; j < c.count; j++) {
        const idx = c.start + j;
        const keep = (!culled) && (rand[idx] <= density);

        const prev = b.keepMask[idx];
        const next = keep ? 1 : 0;

        if (initial || prev !== next) {
          if (keep) m.fromArray(b.baseMatrices, idx * 16);
          else m.copy(kill);
          b.parts.forEach(p => p.mesh.setMatrixAt(idx, m));
          b.keepMask[idx] = next;
          markTouched(idx);
        }
      }
    }

    // 하드 모드(컴팩션)
    const useCompaction = !!b.cfg.hardMode?.compactionEnabled;
    const repackN = b.cfg.hardMode?.repackEveryNFrames ?? b.cfg.culling.everyNFrames;
    const allowRepackNow = initial || this.forceUpdate || (this.frame % Math.max(1, repackN) === 0);
    if (useCompaction && allowRepackNow) {
      const alive: number[] = [];
      for (let i = 0; i < b.totalCount; i++) if (b.keepMask[i]) alive.push(i);
      const aliveCount = alive.length;

      const frontMat = new Float32Array(aliveCount * 16);
      for (let i = 0; i < aliveCount; i++) {
        const src = alive[i] * 16; const dst = i * 16;
        frontMat.set(b.baseMatrices.subarray(src, src + 16), dst);
      }
      b.baseMatrices.set(frontMat, 0);

      for (const part of b.parts) {
        this.reorderInstancedAttribute(part.geometry, "iPattern", alive, aliveCount);
        this.reorderInstancedAttribute(part.geometry, "iPhase",   alive, aliveCount);
        this.reorderInstancedAttribute(part.geometry, "iStrength",alive, aliveCount);
        this.reorderInstancedAttribute(part.geometry, "iDir",     alive, aliveCount);

        const tmp = new THREE.Matrix4();
        for (let i = 0; i < aliveCount; i++) {
          tmp.fromArray(b.baseMatrices, i * 16);
          part.mesh.setMatrixAt(i, tmp);
        }
        part.mesh.count = aliveCount;
        // @ts-ignore
        part.mesh.instanceMatrix.addUpdateRange(0, Math.max(1, aliveCount * 16))
        part.mesh.instanceMatrix.needsUpdate = true;
      }
      return;
    }

    // 부분 업로드
    if (minTouched !== Number.POSITIVE_INFINITY) {
      const offsetInstances = minTouched;
      const countInstances  = maxTouched - minTouched + 1;
      const offsetElems = offsetInstances * 16;
      const countElems  = countInstances  * 16;
      for (const p of b.parts) {
        // @ts-ignore
        p.mesh.instanceMatrix.addUpdateRange(offsetElems, countElems)
        p.mesh.instanceMatrix.needsUpdate = true;
        p.mesh.count = b.totalCount;
      }
    }
  }

  private reorderInstancedAttribute(geo: THREE.BufferGeometry, name: string, alive: number[], aliveCount: number) {
    const attr = geo.getAttribute(name) as THREE.InstancedBufferAttribute | undefined;
    if (!attr) return;
    const arr = attr.array as Float32Array; // itemSize = 1
    const temp = new Float32Array(aliveCount);
    for (let i = 0; i < aliveCount; i++) temp[i] = arr[alive[i]];
    arr.set(temp, 0);
    // @ts-ignore
    attr.addUpdateRange(0, Math.max(1, aliveCount))
    attr.needsUpdate = true;
  }

  /** 비표준 재질을 안전하게 MeshStandardMaterial로 승격(Clone) — TS 안전 버전 */
  private toStdMaterial(m: THREE.Material, cfg: WindyVegetationConfig): THREE.MeshStandardMaterial {
    const anyM: any = m;
    let std: THREE.MeshStandardMaterial;

    if ((anyM as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
      std = (m as THREE.MeshStandardMaterial).clone();
    } else {
      const color =
        (anyM.color && anyM.color.isColor) ? anyM.color.clone() : new THREE.Color(0xffffff);
      std = new THREE.MeshStandardMaterial({ color });
      std.map = anyM.map ?? null;
      std.normalMap = anyM.normalMap ?? null;
      std.roughnessMap = anyM.roughnessMap ?? null;
      std.metalnessMap = anyM.metalnessMap ?? null;
      std.alphaMap = anyM.alphaMap ?? null;
      if (typeof anyM.transparent === 'boolean') std.transparent = anyM.transparent;
      if (typeof anyM.opacity === 'number') std.opacity = anyM.opacity;
    }

    // 얇은 빌보드/풀에서 깜빡임 완화
    std.vertexColors = true;
    std.roughness = cfg.roughness;
    std.metalness = cfg.metalness;
    std.side = cfg.doubleSide ? THREE.DoubleSide : THREE.FrontSide;

    // ✨ 컷아웃 우선(투명 블렌딩 비사용)
    std.alphaTest = Math.max(std.alphaTest ?? 0.0, 0.4);
    std.transparent = false;
    std.depthWrite = true;
    std.depthTest  = true;

    // z-fighting 완화
    std.polygonOffset = true;
    std.polygonOffsetFactor = -1;
    std.polygonOffsetUnits  = 1;

    // MSAA 렌더러에서 경계 품질 개선(웹GL2에서만 효과)
    (std as any).alphaToCoverage = true;

    return std;
  }

  private _createBatchParts(source: THREE.Object3D, totalCount: number, cfg: WindyVegetationConfig): BatchPart[] {
    const parts: BatchPart[] = [];
    source.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry.clone();
        if (child.matrixAutoUpdate) child.updateMatrix();
        geometry.applyMatrix4(child.matrix);
        geometry.computeVertexNormals();

        const matRaw = child.material;

        let materials: THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
        if (Array.isArray(matRaw)) {
          materials = matRaw.map(m => this.toStdMaterial(m, cfg));
        } else {
          materials = this.toStdMaterial(matRaw as THREE.Material, cfg);
        }

        const maxY = this.getGeometryHeightY(geometry) || cfg.defaultBlade.height;
        const uniforms: WindUniforms = {
          uWindEnabled: { value: cfg.windEnabled },
          uTime: { value: 0 },
          uWindDir: { value: cfg.windDir.clone().normalize() },
          uPatAmp: { value: new THREE.Vector3(...cfg.patAmp) },
          uPatFreq: { value: new THREE.Vector3(...cfg.patFreq) },
          uPatPhase: { value: new THREE.Vector3(...cfg.patPhase) },
          uGlobalAmp: { value: cfg.globalAmp },
          uMaxY: { value: maxY },
          uBendExp: { value: cfg.bendExp },
        };

        if (Array.isArray(materials)) materials.forEach(m => this.installWindOnBeforeCompile(m, uniforms));
        else this.installWindOnBeforeCompile(materials, uniforms);

        const inst = new THREE.InstancedMesh(geometry, materials, totalCount);
        inst.frustumCulled = false;
        inst.castShadow = cfg.castShadow;
        inst.receiveShadow = cfg.receiveShadow;
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        parts.push({ mesh: inst, geometry, material: materials, uniforms });
      }
    });

    if (parts.length === 0) {
      const { geometry, material } = this.makeDefaultBladeGeometryAndMaterial(cfg);
      const maxY = this.getGeometryHeightY(geometry) || cfg.defaultBlade.height;
      const uniforms: WindUniforms = {
        uWindEnabled: { value: cfg.windEnabled },
        uTime: { value: 0 },
        uWindDir: { value: cfg.windDir.clone().normalize() },
        uPatAmp: { value: new THREE.Vector3(...cfg.patAmp) },
        uPatFreq: { value: new THREE.Vector3(...cfg.patFreq) },
        uPatPhase: { value: new THREE.Vector3(...cfg.patPhase) },
        uGlobalAmp: { value: cfg.globalAmp },
        uMaxY: { value: maxY },
        uBendExp: { value: cfg.bendExp },
      };
      this.installWindOnBeforeCompile(material, uniforms);
      const inst = new THREE.InstancedMesh(geometry, material, totalCount);
      inst.frustumCulled = false;
      inst.castShadow = cfg.castShadow;
      inst.receiveShadow = cfg.receiveShadow;
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      parts.push({ mesh: inst, geometry, material, uniforms });
    }

    return parts;
  }

  private makeDefaultBladeAsGroup(cfg: WindyVegetationConfig): THREE.Group {
    const { geometry, material } = this.makeDefaultBladeGeometryAndMaterial(cfg);
    const mesh = new THREE.Mesh(geometry, material);
    const group = new THREE.Group();
    group.add(mesh);
    return group;
  }

  private makeDefaultBladeGeometryAndMaterial(cfg: WindyVegetationConfig) {
    const g = this.makeTaperedBladeGeometry(cfg.defaultBlade.bottomWidth, cfg.defaultBlade.topWidth, cfg.defaultBlade.height, cfg.defaultBlade.segY);
    this.applyVerticalVertexColors(g, new THREE.Color(cfg.defaultBlade.colorBottom), new THREE.Color(cfg.defaultBlade.colorTop), cfg.defaultBlade.withTip ? new THREE.Color(cfg.defaultBlade.tipColor) : undefined);
    const mtl = this.toStdMaterial(new THREE.MeshStandardMaterial({ vertexColors: true }) as any, cfg);
    return { geometry: g, material: mtl };
  }

  private installWindOnBeforeCompile(material: THREE.MeshStandardMaterial, uniforms: WindUniforms) {
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          /* glsl */`
          #include <common>
          uniform bool uWindEnabled;
          uniform float uTime;
          uniform vec2  uWindDir;
          uniform vec3  uPatAmp;
          uniform vec3  uPatFreq;
          uniform vec3  uPatPhase;
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
          /* glsl */`
          #include <begin_vertex>
          if (uWindEnabled) {
            float h = max(uMaxY, 1e-4);
            float k = clamp(position.y / h, 0.0, 1.0);
            k = pow(k, uBendExp);

            vec2 dir = normalize(uWindDir);
            float ca = cos(iDir), sa = sin(iDir);
            mat2 rot = mat2(ca, -sa, sa, ca);
            dir = rot * dir;

            int patternIdx = int(iPattern);
            float amp  = (patternIdx == 0) ? uPatAmp.x  : ((patternIdx == 1) ? uPatAmp.y  : uPatAmp.z);
            float freq = (patternIdx == 0) ? uPatFreq.x : ((patternIdx == 1) ? uPatFreq.y : uPatFreq.z);
            float phs  = (patternIdx == 0) ? uPatPhase.x: ((patternIdx == 1) ? uPatPhase.y: uPatPhase.z);

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
          }
          `
        );

      (shader.uniforms as any).uWindEnabled = uniforms.uWindEnabled;
      (shader.uniforms as any).uTime        = uniforms.uTime;
      (shader.uniforms as any).uWindDir     = uniforms.uWindDir;
      (shader.uniforms as any).uPatAmp      = uniforms.uPatAmp;
      (shader.uniforms as any).uPatFreq     = uniforms.uPatFreq;
      (shader.uniforms as any).uPatPhase    = uniforms.uPatPhase;
      (shader.uniforms as any).uGlobalAmp   = uniforms.uGlobalAmp;
      (shader.uniforms as any).uMaxY        = uniforms.uMaxY;
      (shader.uniforms as any).uBendExp     = uniforms.uBendExp;

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

  private applyVerticalVertexColors(g: THREE.BufferGeometry, colBottom: THREE.Color, colTop: THREE.Color, tipColor?: THREE.Color) {
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

  /* ----------------------- 유틸 ----------------------- */
  private toVector2(v: any): THREE.Vector2 {
    if (v instanceof THREE.Vector2) return v;
    if (v && typeof v.x === 'number' && typeof v.y === 'number') return new THREE.Vector2(v.x, v.y);
    const d = (this.cfg?.windDir ?? DEFAULT_CONFIG.windDir);
    return new THREE.Vector2(d.x, d.y);
  }

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

  private estimateClustersFromMatrices(arr: Float32Array, cfg: WindyVegetationConfig): ClusterInfo[] {
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
      clusters.push({ center, radius: cfg.cluster.radius, start, count });
    }
    return clusters;
  }

  private disposeBatch(b: Batch) {
    b.parts.forEach(p => {
      p.mesh.parent?.remove(p.mesh);
      p.mesh.dispose();
    });
  }

  public GetMeshes(): readonly THREE.InstancedMesh[] {
    return this.batches.flatMap(b => b.parts.map(p => p.mesh));
  }
  public GetBatchCount(): number { return this.batches.length; }
}
