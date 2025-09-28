import * as THREE from "three";
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { Loader } from "@Glibs/loader/loader";
import { Char } from "@Glibs/types/assettypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

/**
 * WindyInstancedVegetation — 안정화 통합본 (Focus-anchored 거리 LOD/culling)
 * - 프러스텀 컬링(클러스터 구체) + 거리 LOD
 * - iRand(인스턴스 고유 난수) + 히스테리시스(경계 떨림 억제)
 * - 조건부 컴팩션: 주기(repackEveryNFrames)/강제 시만 재배열, 그 외엔 부분 갱신
 * - 카메라/포커스 더티 즉시 재계산, aliveCount 로깅(디버그)
 * - 거리 기준 앵커(anchor): camera | focus (기본 focus)
 */

export type TRS = {
  position: THREE.Vector3 | [number, number, number];
  rotation: THREE.Euler | [number, number, number]; // radians
  scale: number | THREE.Vector3 | [number, number, number];
};
export type PatternCount = 2 | 3;

/* ----------------------- Debug 옵션 (cfg에 포함) ----------------------- */
export type DebugOptions = {
  enabled: boolean;
  logEveryNFrames: number;
  samplesPerBatch: number;
  sampleFirstInstanceOnly: boolean;
  logCamera: boolean;
  showAlive?: boolean; // aliveCount 요약 출력
};

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
    /** 거리 LOD 기준점: 'camera' | 'focus' (기본 'focus') */
    distanceAnchor?: 'camera' | 'focus';
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
    /** 진폭 감쇠 기준점: 'camera' | 'focus' (기본 'focus') */
    distanceAnchor?: 'camera' | 'focus';
  };
  hardMode?: {
    compactionEnabled: boolean;       // 유지(옵션), 기본은 조건부 컴팩션으로 동작
    repackEveryNFrames?: number;
  };

  /** 포커스 관련 설정(포커스 미지정 시 사용) */
  focus?: {
    /** focus 미지정 시 camera.forward * defaultDistance 지점 사용 */
    defaultDistance?: number; // 기본 10
  };

  // ✅ 디버그 옵션 통합
  debug: DebugOptions;
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
    distanceAnchor: 'focus',
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
    distanceAnchor: 'focus',
  },
  hardMode: {
    compactionEnabled: false,
    repackEveryNFrames: 6, // 컴팩션 주기 기본값
  },
  focus: {
    defaultDistance: 10,
  },
  debug: {
    enabled: false,
    logEveryNFrames: 30,
    samplesPerBatch: 3,
    sampleFirstInstanceOnly: true,
    logCamera: false,
    showAlive: true,
  },
};

export type ClusterInfo = {
  center: THREE.Vector3; // 로컬 좌표
  radius: number;        // 로컬 반경
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
  cfg: WindyVegetationConfig;  // 배치 스냅샷(디버그 포함)
  root: THREE.Object3D;        // 배치 루트
  _lastRootPos?: THREE.Vector3;
  _lastRootQuat?: THREE.Quaternion;
  _lastRootScale?: THREE.Vector3;
};

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
    focus: src.focus ? { ...src.focus } : undefined,
    debug: { ...src.debug },
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
  if (patch.focus)        out.focus        = { ...(out.focus ?? {}), ...patch.focus };
  if (patch.debug)        out.debug        = { ...out.debug, ...patch.debug };
  return out;
}

export class WindyInstancedVegetation implements IWorldMapObject, ILoop {
  public LoopId = 0;
  public Type: MapEntryType = MapEntryType.WindyInstancedVegetation;

  private cfg: WindyVegetationConfig;

  private time = 0;
  private frame = 0;
  private group: THREE.Group;
  private batches: Batch[] = [];
  private camera: THREE.Camera;

  private lastCamPos = new THREE.Vector3();
  private lastCamQuat = new THREE.Quaternion();
  private lastCamFov?: number;
  private lastCamZoom?: number;
  private lastCamNear?: number;
  private lastCamFar?: number;

  // ▼ 포커스 타겟 상태
  private focusTargetObj?: THREE.Object3D | null;
  private focusTargetPos?: THREE.Vector3 | null;
  private _lastFocusPoint?: THREE.Vector3;

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
    this.SetCamera(camera);
    this.eventCtrl.RegisterEventListener(EventTypes.CtrlObj, (obj: IPhysicsObject) => {
      this.SetFocusTarget(obj.Meshs)
    })
  }

  /* ----------------------- Focus API ----------------------- */
  /** 카메라가 바라보는 타겟을 설정
   *  - Object3D: 월드 좌표를 추적
   *  - Vector3 : 고정 포인트
   *  - null    : 카메라 forward * defaultDistance 지점 사용
   */
  public SetFocusTarget(t: THREE.Object3D | THREE.Vector3 | null) {
    if (t instanceof THREE.Object3D) {
      this.focusTargetObj = t;
      this.focusTargetPos = null;
    } else if (t instanceof THREE.Vector3) {
      this.focusTargetObj = undefined;
      this.focusTargetPos = t.clone();
    } else {
      this.focusTargetObj = undefined;
      this.focusTargetPos = null;
    }
    this.forceUpdate = true;
  }

  /** 현재 거리 기준 앵커 포인트(world)를 얻는다 */
  private getAnchorPoint(out = new THREE.Vector3()): THREE.Vector3 {
    if (this.focusTargetObj) {
      this.focusTargetObj.updateMatrixWorld(true);
      return this.focusTargetObj.getWorldPosition(out);
    }
    if (this.focusTargetPos) {
      return out.copy(this.focusTargetPos);
    }
    // fallback: 카메라 forward * defaultDistance
    const d = this.cfg.focus?.defaultDistance ?? 10;
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir); // normalized
    const cam = new THREE.Vector3();
    this.camera.getWorldPosition(cam);
    return out.copy(cam).add(dir.multiplyScalar(d));
  }

  private dlog(...args: any[]) {
    if (!this.cfg?.debug?.enabled) return;
    // eslint-disable-next-line no-console
    console.log("[WindyVeg]", ...args);
  }

  public SetCamera(cam: THREE.Camera) {
    this.camera = cam;
    this.camera.updateMatrixWorld(true);
    this.lastCamPos.copy(cam.position);
    this.lastCamQuat.copy(cam.quaternion);

    const anyCam: any = cam;
    this.lastCamFov  = typeof anyCam.fov  === 'number' ? anyCam.fov  : undefined;
    this.lastCamZoom = typeof anyCam.zoom === 'number' ? anyCam.zoom : undefined;
    this.lastCamNear = typeof anyCam.near === 'number' ? anyCam.near : undefined;
    this.lastCamFar  = typeof anyCam.far  === 'number' ? anyCam.far  : undefined;

    // 포커스 초기화용
    this._lastFocusPoint = this.getAnchorPoint(new THREE.Vector3()).clone();
  }

  public SetDebug(options: Partial<DebugOptions>, batchIndex?: number) {
    if (batchIndex == null) {
      this.cfg.debug = { ...this.cfg.debug, ...options };
      this.batches.forEach(b => { b.cfg.debug = { ...b.cfg.debug, ...options }; });
    } else {
      const b = this.batches[batchIndex];
      if (!b) return;
      b.cfg.debug = { ...b.cfg.debug, ...options };
    }
    this.forceUpdate = true;
  }

  public SetCullingForBatch(batchIndex: number, opts: Partial<WindyVegetationConfig["culling"]>) {
    const b = this.batches[batchIndex];
    if (!b) return;
    b.cfg.culling = { ...b.cfg.culling, ...opts };
    this.forceUpdate = true;
  }
  public SetLODForBatch(batchIndex: number, opts: Partial<WindyVegetationConfig["lod"]>) {
    const b = this.batches[batchIndex];
    if (!b) return;
    b.cfg.lod = { ...b.cfg.lod, ...opts };
    this.forceUpdate = true;
  }

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

    // matrices 먼저 구성
    const baseMatrices = new Float32Array(totalCount * 16);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), pTmp = new THREE.Vector3(), sTmp = new THREE.Vector3();
    const resultGroup = new THREE.Group(); // batch root
    for (let i = 0; i < totalCount; i++) {
      const t = expanded[i];
      const pos = this.v3(t.position, pTmp);
      pos.y += 0.005; // z-fighting 완화
      const rot = this.euler(t.rotation);
      const scl = Array.isArray(t.scale) ? this.v3(t.scale as [number,number,number], sTmp) : (t.scale as THREE.Vector3);
      q.setFromEuler(rot);
      m.compose(pos, q, scl);
      m.toArray(baseMatrices, i * 16);
      parts.forEach(part => part.mesh.setMatrixAt(i, m));
    }

    // per-instance attributes
    const jitter = THREE.MathUtils.degToRad(cfgLocal.jitterAngleDeg);
    const [sMin, sMax] = cfgLocal.strengthRange;
    const iPattern = new Float32Array(totalCount);
    const iPhase = new Float32Array(totalCount);
    const iStrength = new Float32Array(totalCount);
    const iDir = new Float32Array(totalCount);
    const iRand = new Float32Array(totalCount); // ★ 인스턴스 고유 난수

    const matForRand = new THREE.Matrix4();
    const posForRand = new THREE.Vector3();

    for (let i = 0; i < totalCount; i++) {
      iPattern[i] = i % cfgLocal.patternCount;
      iPhase[i] = Math.random() * Math.PI * 2;
      iStrength[i] = THREE.MathUtils.lerp(sMin, sMax, Math.random());
      iDir[i] = THREE.MathUtils.lerp(-jitter, jitter, Math.random());

      // 위치 기반 해시로 고정 난수 생성(인덱스/카메라 무관)
      matForRand.fromArray(baseMatrices, i * 16);
      posForRand.setFromMatrixPosition(matForRand);
      const h = Math.sin(posForRand.x * 12.9898 + posForRand.z * 78.233) * 43758.5453;
      iRand[i] = h - Math.floor(h);
    }
    parts.forEach(p => {
      p.geometry.setAttribute("iPattern", new THREE.InstancedBufferAttribute(iPattern, 1, false));
      p.geometry.setAttribute("iPhase", new THREE.InstancedBufferAttribute(iPhase, 1, false));
      p.geometry.setAttribute("iStrength", new THREE.InstancedBufferAttribute(iStrength, 1, false));
      p.geometry.setAttribute("iDir", new THREE.InstancedBufferAttribute(iDir, 1, false));
      p.geometry.setAttribute("iRand", new THREE.InstancedBufferAttribute(iRand, 1, false)); // ★
    });

    parts.forEach(part => {
      part.mesh.frustumCulled = false; // 메쉬 레벨 컬링 Off (인스턴스 단위로 처리)
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
      parts, baseMatrices, clusters, totalCount, keepMask,
      modelId: id ?? null, cfg: cfgLocal, root: resultGroup
    };
    this.batches.push(batch);

    // 초기 컬링/LOD 1회(조건부 컴팩션 포함)
    this.applyCullLODInPlace(batch, true);
    this.forceUpdate = true;

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
    return resultGroup;
  }

  public async CreateDone() {
    this.camera.updateMatrixWorld(true);
    this.lastCamPos.copy(this.camera.position);
    this.lastCamQuat.copy(this.camera.quaternion);
    // 포커스 더티 초기화
    this._lastFocusPoint = this.getAnchorPoint(new THREE.Vector3()).clone();
    this.batches.forEach(b => this.applyCullLODInPlace(b, true));
  }

  /* ----------------------- 루프 ----------------------- */
  public update(delta: number): void {
    this.time += delta;
    this.frame++;

    if (this.cfg.debug.enabled && this.cfg.debug.logCamera && (this.frame % this.cfg.debug.logEveryNFrames === 0)) {
      const cam: any = this.camera;
      const isPersp = cam && typeof cam.fov === 'number';
      this.dlog(
        `frame=${this.frame}`,
        "pos=",
        this.camera.position.toArray().map((v:number)=>Number(v).toFixed(3)),
        isPersp ? `fov=${cam.fov?.toFixed(2)}` : "",
        `zoom=${(cam.zoom !== undefined) ? cam.zoom : ""}`,
        `near=${cam.near ?? ""} far=${cam.far ?? ""}`
      );
    }

    const camDirty = this.isCameraDirty();
    const globalNeedsUpdate = camDirty || this.forceUpdate;

    for (const b of this.batches) {
      const batchMoved = this.isBatchRootDirty(b);

      // 움직이면 빠르게, 정지면 설정값
      const adaptiveEveryN = batchMoved ? Math.min(2, Math.max(1, b.cfg.culling.everyNFrames)) : b.cfg.culling.everyNFrames;
      const canUpdateLOD = (this.frame % Math.max(1, adaptiveEveryN) === 0);

      if (b.cfg.windEnabled) {
        b.parts.forEach(p => p.uniforms.uTime.value = this.time);
      }

      const anyFeatureOn = (b.cfg.culling.enabled || b.cfg.lod.enabled);
      const mustRunNow = camDirty;
      const shouldRunLOD = (canUpdateLOD || mustRunNow || batchMoved || globalNeedsUpdate) && anyFeatureOn;
      if (shouldRunLOD) this.applyCullLODInPlace(b, false);

      // Amp-distance (anchor 기준)
      if ((globalNeedsUpdate || batchMoved) && b.cfg.ampDistance.enabled && this.camera && b.clusters.length) {
        const cam = new THREE.Vector3();
        this.camera.getWorldPosition(cam);

        const anchor =
          ((b.cfg.ampDistance.distanceAnchor ?? this.cfg.ampDistance.distanceAnchor) === 'camera')
          ? cam
          : this.getAnchorPoint(new THREE.Vector3());

        b.root.updateMatrixWorld();
        const groupMW = b.root.matrixWorld;

        const dist = Math.min(...b.clusters.map(c => {
          const centerWorld = c.center.clone().applyMatrix4(groupMW);
          return anchor.distanceTo(centerWorld);
        }));

        const { near, far, minFactor } = b.cfg.ampDistance;
        let target = b.cfg.globalAmp;
        if (dist >= far)      target = b.cfg.globalAmp * minFactor;
        else if (dist > near) target = b.cfg.globalAmp * THREE.MathUtils.lerp(1.0, minFactor, (dist - near) / Math.max(1e-6, (far - near)));
        b.ampSmooth = target;
        b.parts.forEach(p => p.uniforms.uGlobalAmp.value = b.ampSmooth as number);
      }
    }

    if (globalNeedsUpdate) {
      this.camera.updateMatrixWorld(true);
      const anyCam: any = this.camera;
      if (typeof anyCam.updateProjectionMatrix === 'function') {
        anyCam.updateProjectionMatrix();
      }

      this.lastCamPos.copy(this.camera.position);
      this.lastCamQuat.copy(this.camera.quaternion);
      this.lastCamFov  = typeof anyCam.fov  === 'number' ? anyCam.fov  : this.lastCamFov;
      this.lastCamZoom = typeof anyCam.zoom === 'number' ? anyCam.zoom : this.lastCamZoom;
      this.lastCamNear = typeof anyCam.near === 'number' ? anyCam.near : this.lastCamNear;
      this.lastCamFar  = typeof anyCam.far  === 'number' ? anyCam.far  : this.lastCamFar;

      // 포커스 포인트 스냅샷
      this._lastFocusPoint = this.getAnchorPoint(new THREE.Vector3()).clone();

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
    const idx = this.batches.findIndex(b => b.root === target || b.parts.some(p => p.mesh === target || p.mesh.parent === target));
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
        windDir: { x: b.cfg.windDir.x, y: b.cfg.windDir.y }
      } as any;
      return {
        count: b.totalCount,
        matrices: Array.from(b.baseMatrices),
        attributes: {
          iPattern: pickArr("iPattern"),
          iPhase: pickArr("iPhase"),
          iStrength: pickArr("iStrength"),
          iDir: pickArr("iDir"),
          iRand: pickArr("iRand"),
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
        if (item.attributes.iRand) applyAttr("iRand", item.attributes.iRand);
      }

      // iRand가 없으면 위치 기반으로 재생성
      const g0 = parts[0].geometry as THREE.BufferGeometry;
      if (!g0.getAttribute("iRand")) {
        const iRand = new Float32Array(totalCount);
        const mat = new THREE.Matrix4(), pos = new THREE.Vector3();
        for (let i = 0; i < totalCount; i++) {
          mat.fromArray(baseMatrices, i * 16);
          pos.setFromMatrixPosition(mat);
          const h = Math.sin(pos.x * 12.9898 + pos.z * 78.233) * 43758.5453;
          iRand[i] = h - Math.floor(h);
        }
        parts.forEach(p => p.geometry.setAttribute("iRand", new THREE.InstancedBufferAttribute(iRand, 1, false)));
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

      const batch: Batch = { parts, baseMatrices, clusters, totalCount, keepMask, modelId: item.modelId ?? null, cfg: cfgLocal, root: resultGroup };
      this.batches.push(batch);

      this.applyCullLODInPlace(batch, true);
    }

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
    callback?.();
  }

  /* ----------------------- 내부 로직 ----------------------- */
  private isCameraDirty(): boolean {
    const POS_THRESHOLD_SQ = 0.05 * 0.05; // 5cm
    const ROT_THRESHOLD = 0.999999;

    const distSq = this.camera.position.distanceToSquared(this.lastCamPos);
    const dot = this.camera.quaternion.dot(this.lastCamQuat);

    let dirty = (distSq > POS_THRESHOLD_SQ) || (Math.abs(dot) < ROT_THRESHOLD);

    const anyCam: any = this.camera;
    if (typeof anyCam.fov  === 'number' && this.lastCamFov  !== undefined && anyCam.fov  !== this.lastCamFov ) dirty = true;
    if (typeof anyCam.zoom === 'number' && this.lastCamZoom !== undefined && anyCam.zoom !== this.lastCamZoom) dirty = true;
    if (typeof anyCam.near === 'number' && this.lastCamNear !== undefined && anyCam.near !== this.lastCamNear) dirty = true;
    if (typeof anyCam.far  === 'number' && this.lastCamFar  !== undefined && anyCam.far  !== this.lastCamFar ) dirty = true;

    // ▼ 포커스 포인트 이동 감지
    const fp = this.getAnchorPoint(new THREE.Vector3());
    if (!this._lastFocusPoint || fp.distanceToSquared(this._lastFocusPoint) > 1e-6) {
      dirty = true;
    }
    this._lastFocusPoint = (this._lastFocusPoint ?? new THREE.Vector3()).copy(fp);

    return dirty;
  }

  private isBatchRootDirty(b: Batch): boolean {
    b.root.updateMatrixWorld();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    b.root.matrixWorld.decompose(pos, quat, scl);

    const POS_EPS_SQ = 0.02 * 0.02;
    const ROT_DOT_MIN = 0.99999;
    const SCL_EPS = 1e-4;

    let dirty = false;

    if (!b._lastRootPos || !b._lastRootQuat || !b._lastRootScale) {
      dirty = true;
    } else {
      const dp = pos.distanceToSquared(b._lastRootPos);
      const dq = Math.abs(quat.dot(b._lastRootQuat));
      const ds = (
        Math.abs(scl.x - b._lastRootScale.x) > SCL_EPS ||
        Math.abs(scl.y - b._lastRootScale.y) > SCL_EPS ||
        Math.abs(scl.z - b._lastRootScale.z) > SCL_EPS
      );
      if (dp > POS_EPS_SQ || dq < ROT_DOT_MIN || ds) dirty = true;
    }

    b._lastRootPos   = (b._lastRootPos   ?? new THREE.Vector3()).copy(pos);
    b._lastRootQuat  = (b._lastRootQuat  ?? new THREE.Quaternion()).copy(quat);
    b._lastRootScale = (b._lastRootScale ?? new THREE.Vector3()).copy(scl);

    return dirty;
  }

  /**
   * 프러스텀 컬링 + 거리 LOD
   * - iRand + 히스테리시스(±hys)로 경계 떨림 억제
   * - 조건부 컴팩션: repackEveryNFrames/강제시에만 재배열, 그 외엔 부분 갱신
   * - 거리 기준 앵커: camera | focus (기본 focus)
   */
  private applyCullLODInPlace(b: Batch, initial: boolean) {
    if (!b || !b.baseMatrices || b.parts.length === 0) return;

    const dbg = b.cfg.debug;

    // 카메라/프러스텀
    let frustum: THREE.Frustum | null = null;
    const camPos = new THREE.Vector3();
    if (this.camera) {
      this.camera.updateMatrixWorld(true);
      const anyCam: any = this.camera;
      if (typeof anyCam.updateProjectionMatrix === 'function') anyCam.updateProjectionMatrix();
      const vp = new THREE.Matrix4().multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
      frustum = new THREE.Frustum().setFromProjectionMatrix(vp);
      this.camera.getWorldPosition(camPos);
    } else if (dbg?.enabled) {
      console.warn("[WindyVeg] camera is null/undefined");
    }

    // 배치 루트
    b.root.updateMatrixWorld();
    const groupMW = b.root.matrixWorld;

    const alive: number[] = []; // 이번 프레임 살아남은 인덱스

    // LOD 파라미터
    const hardCutEnabled = true;
    const hardFarMul = 1.2;
    const hardFar = b.cfg.lod.far * hardFarMul;
    const gamma = 2.0;
    const minFloor = 0.0;
    const steps = 0;

    // 히스테리시스(경계 떨림 억제)
    const hys = 0.08;

    // 루트 월드 스케일
    const ws = new THREE.Vector3();
    b.root.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), ws);
    const sMax = Math.max(Math.abs(ws.x), Math.abs(ws.y), Math.abs(ws.z));

    const iRandAttr = b.parts[0].geometry.getAttribute("iRand") as THREE.InstancedBufferAttribute;

    let clusterIndex = -1;

    // 거리 앵커(LOD 계산용)
    const lodAnchorChoice = (b.cfg.lod.distanceAnchor ?? this.cfg.lod.distanceAnchor) === 'camera' ? 'camera' : 'focus';
    const lodAnchorPos = lodAnchorChoice === 'camera' ? camPos : this.getAnchorPoint(new THREE.Vector3());

    for (const c of b.clusters) {
      clusterIndex++;

      // 1) 클러스터 프러스텀 컬링(카메라 뷰 기준 유지)
      let culled = false;
      if (b.cfg.culling.enabled && frustum) {
        const centerWorld = c.center.clone().applyMatrix4(groupMW);
        const radiusWorld = c.radius * sMax * 1.1;
        const sphere = new THREE.Sphere(centerWorld, radiusWorld);
        culled = !frustum.intersectsSphere(sphere);
      }

      // 2) 거리 LOD 밀도 (앵커 기준)
      let density = 1.0;
      let d = 0;
      if (b.cfg.lod.enabled && this.camera) {
        const centerWorld = c.center.clone().applyMatrix4(groupMW);
        d = lodAnchorPos.distanceTo(centerWorld);
        const n = Math.max(0, b.cfg.lod.near);
        const f = Math.max(n + 1e-6, b.cfg.lod.far);
        const t = THREE.MathUtils.clamp((d - n) / (f - n), 0, 1);
        const minD = Math.max(minFloor, THREE.MathUtils.clamp(b.cfg.lod.minDensity, 0, 1));
        density = THREE.MathUtils.lerp(1.0, minD, Math.pow(t, gamma));
        if (hardCutEnabled && d > hardFar) density = 0.0;
        if (steps > 0) density = Math.max(minD, Math.round(density * steps) / steps);
        density = THREE.MathUtils.clamp(density, 0, 1);
      }

      // 3) 인스턴스 선별 + 히스테리시스
      for (let j = 0; j < c.count; j++) {
        const idx = c.start + j;
        const r = iRandAttr.getX(idx); // 고정 난수
        const wasKept = b.keepMask[idx] === 1;

        const densIn  = Math.min(1.0, density + (wasKept ? hys : 0.0));
        const densOut = Math.max(0.0, density - (wasKept ? 0.0 : hys));
        const densForCheck = wasKept ? densIn : densOut;

        const keep = (!culled) && (r <= densForCheck);

        b.keepMask[idx] = keep ? 1 : 0;
        if (keep) alive.push(idx);

        if (dbg.enabled) {
          const sampleInst = (!dbg.sampleFirstInstanceOnly) || (j === 0);
          const shouldSample = initial || (this.frame % dbg.logEveryNFrames === 0);
          if (sampleInst && shouldSample && clusterIndex < dbg.samplesPerBatch) {
            this.dlog(
              `[inst] f=${this.frame} c=${clusterIndex} idx=${idx} ` +
              `keep=${keep} culledCluster=${culled}`
            );
          }
        }
      }

      if (dbg.enabled) {
        const shouldSample = initial || (this.frame % dbg.logEveryNFrames === 0);
        if (shouldSample && clusterIndex < dbg.samplesPerBatch) {
          this.dlog(
            `[cluster] f=${this.frame} idx=${clusterIndex} culled=${culled} ` +
            `near=${b.cfg.lod.near.toFixed(1)} far=${b.cfg.lod.far.toFixed(1)} ` +
            `hardFar=${(b.cfg.lod.far * 1.2).toFixed(1)}`
          );
        }
      }
    }

    const aliveCount = alive.length;

    if (dbg.enabled && (initial || (this.frame % dbg.logEveryNFrames === 0)) && dbg.showAlive) {
      const batchIdx = this.batches.indexOf(b);
      this.dlog(`[alive] f=${this.frame} batch=${batchIdx} aliveCount=${aliveCount}`);
    }

    // 0개면 드로우 중단
    if (aliveCount === 0) {
      if (dbg.enabled && dbg.showAlive) {
        const batchIdx = this.batches.indexOf(b);
        this.dlog(`[alive] f=${this.frame} batch=${batchIdx} aliveCount=0 (all culled)`);
      }
      for (const part of b.parts) {
        part.mesh.count = 0;
        part.mesh.instanceMatrix.addUpdateRange(0, 0);
        part.mesh.instanceMatrix.needsUpdate = true;
      }
      return;
    }

    // 조건부 컴팩션(주기/강제 시에만)
    const repackN = b.cfg.hardMode?.repackEveryNFrames ?? b.cfg.culling.everyNFrames;
    const allowRepackNow = initial || this.forceUpdate || (this.frame % Math.max(1, repackN) === 0);

    if (allowRepackNow) {
      // ----- 컴팩션 -----
      const frontMat = new Float32Array(aliveCount * 16);
      for (let i = 0; i < aliveCount; i++) {
        const src = alive[i] * 16, dst = i * 16;
        frontMat.set(b.baseMatrices.subarray(src, src + 16), dst);
      }
      b.baseMatrices.set(frontMat, 0);

      for (const part of b.parts) {
        // per-instance attributes 재배열
        this.reorderInstancedAttribute(part.geometry, "iPattern", alive, aliveCount);
        this.reorderInstancedAttribute(part.geometry, "iPhase",   alive, aliveCount);
        this.reorderInstancedAttribute(part.geometry, "iStrength",alive, aliveCount);
        this.reorderInstancedAttribute(part.geometry, "iDir",     alive, aliveCount);
        this.reorderInstancedAttribute(part.geometry, "iRand",    alive, aliveCount);

        const tmp = new THREE.Matrix4();
        for (let i = 0; i < aliveCount; i++) {
          tmp.fromArray(b.baseMatrices, i * 16);
          part.mesh.setMatrixAt(i, tmp);
        }
        part.mesh.count = aliveCount;
        part.mesh.instanceMatrix.addUpdateRange(0, Math.max(1, aliveCount * 16));
        part.mesh.instanceMatrix.needsUpdate = true;
      }

      if (dbg.enabled && (initial || (this.frame % dbg.logEveryNFrames === 0)) && dbg.showAlive) {
        const batchIdx = this.batches.indexOf(b);
        const partCounts = b.parts.map((p, i) => `p${i}=${p.mesh.count}`).join(", ");
        this.dlog(`[alive] f=${this.frame} batch=${batchIdx} aliveCount=${aliveCount} | ${partCounts}`);
      }
    } else {
      // ----- 부분 갱신(살아있는 건 원 위치 유지, 죽은 건 kill 매트릭스) -----
      const kill = new THREE.Matrix4().makeScale(0, 0, 0);
      const tmp  = new THREE.Matrix4();

      let minTouched = Number.POSITIVE_INFINITY;
      let maxTouched = -1;

      // keepMask 기준으로 매트릭스만 업데이트
      for (const c of b.clusters) {
        for (let j = 0; j < c.count; j++) {
          const idx = c.start + j;
          if (b.keepMask[idx]) tmp.fromArray(b.baseMatrices, idx * 16);
          else tmp.copy(kill);

          for (const part of b.parts) {
            part.mesh.setMatrixAt(idx, tmp);
          }

          if (idx < minTouched) minTouched = idx;
          if (idx > maxTouched) maxTouched = idx;
        }
      }

      if (minTouched !== Number.POSITIVE_INFINITY) {
        const offsetElems = minTouched * 16;
        const countElems  = (maxTouched - minTouched + 1) * 16;
        for (const part of b.parts) {
          part.mesh.instanceMatrix.addUpdateRange(offsetElems, countElems);
          part.mesh.instanceMatrix.needsUpdate = true;
          // 컴팩션 안 했으므로 전체 슬롯 유지
          part.mesh.count = b.totalCount;
        }
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
    attr.addUpdateRange(0, Math.max(1, aliveCount));
    attr.needsUpdate = true;
  }

  /** 비표준 재질을 MeshStandardMaterial로 승격(Clone) */
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

    std.vertexColors = true;
    std.roughness = cfg.roughness;
    std.metalness = cfg.metalness;
    std.side = cfg.doubleSide ? THREE.DoubleSide : THREE.FrontSide;

    // 얇은 평면 최적화
    std.alphaTest = Math.max(std.alphaTest ?? 0.0, 0.4);
    std.transparent = false;
    std.depthWrite = true;
    std.depthTest  = true;

    // z-fighting 억제
    std.polygonOffset = true;
    std.polygonOffsetFactor = -1;
    std.polygonOffsetUnits  = 1;

    (std as any).alphaToCoverage = true; // WebGL2 + MSAA

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
          attribute float iRand; // ★ 고정 난수

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

            // 고정 seed(인스턴스 고유 난수 기반) → 카메라/컴팩션에 영향 없음
            float phaseSeed = iRand * 6.2831853;

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
    b.root.parent?.remove(b.root);
  }

  public GetMeshes(): readonly THREE.InstancedMesh[] {
    return this.batches.flatMap(b => b.parts.map(p => p.mesh));
  }
  public GetBatchCount(): number { return this.batches.length; }
}
