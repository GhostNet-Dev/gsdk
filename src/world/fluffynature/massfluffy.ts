import * as THREE from "three";
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { Loader } from "@Glibs/loader/loader";
import { Char } from "@Glibs/types/assettypes";
import { EventTypes } from "@Glibs/types/globaltypes";

/* -------------------------------------------------------------------------- */
/* Public Interfaces                            */
/* -------------------------------------------------------------------------- */
export type TRS = {
  position: THREE.Vector3 | [number, number, number];
  rotation: THREE.Euler | [number, number, number]; // radians
  scale: number | THREE.Vector3 | [number, number, number];
};
export type PatternCount = 2 | 3;

/* ------------------------------ Config Object ----------------------------- */
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
    near: number;
    far: number;
    minDensity: number;
  };
  culling: {
    enabled: boolean;
    everyNFrames: number;
  };
  ampDistance: {
    enabled: boolean;
    near: number;
    far: number;
    minFactor: number;
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
};

/* ---------------------------- Helper Structures --------------------------- */
export type ClusterInfo = {
  center: THREE.Vector3;
  radius: number;
  start: number;
  count: number;
};

// NEW: 제외 구역 타입 정의
type ExclusionZone = {
  id: string | number;
  position: THREE.Vector3;
  radius: number;
  radiusSq: number;
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
  material: THREE.MeshStandardMaterial;
  uniforms: WindUniforms;
};

type Batch = {
  parts: BatchPart[];
  baseMatrices: Float32Array;
  clusters: ClusterInfo[];
  totalCount: number;
  ampSmooth?: number;
  keepMask: Uint8Array;
  modelId?: Char | null;
  rand?: Float32Array; // 사전 계산된 난수 배열
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
  private camera: THREE.Camera;

  // 카메라 게이트를 위한 상태 변수
  private lastCamPos = new THREE.Vector3();
  private lastCamQuat = new THREE.Quaternion();
  private forceUpdate = false; // 제외 구역 변경 시 즉시 업데이트를 위한 플래그

  // 제외 구역 목록
  private exclusionZones: ExclusionZone[] = [];

  constructor(
    private loader: Loader,
    private scene: THREE.Scene,
    private eventCtrl: IEventController,
    camera: THREE.Camera,
    config?: Partial<WindyVegetationConfig>
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = "WindyInstancedVegetation";
    this.scene.add(this.group);
    this.camera = camera;
  }

  /* ------------------------------- Public API ------------------------------ */
  public SetCamera(cam: THREE.Camera) { this.camera = cam; }

  public SetWindEnabled(enabled: boolean) {
    this.cfg.windEnabled = enabled;
    this.batches.forEach(b => b.parts.forEach(p => { p.uniforms.uWindEnabled.value = enabled; }));
  }

  public SetWind(dirXZ: THREE.Vector2, globalAmp?: number, bendExp?: number) {
    if (dirXZ) {
      const normDir = dirXZ.clone().normalize();
      this.cfg.windDir.copy(normDir);
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
    if (patAmp) this.cfg.patAmp = patAmp;
    if (patFreq) this.cfg.patFreq = patFreq;
    if (patPhase) this.cfg.patPhase = patPhase;

    this.batches.forEach(b => b.parts.forEach(p => {
      if (patAmp) p.uniforms.uPatAmp.value.set(...patAmp);
      if (patFreq) p.uniforms.uPatFreq.value.set(...patFreq);
      if (patPhase) p.uniforms.uPatPhase.value.set(...patPhase);
    }));
  }

  async Loader(id: Char): Promise<THREE.Object3D> {
    const asset = this.loader.GetAssets(id);
    return await asset.CloneModel();
  }

  /**
    * 특정 위치를 중심으로 하는 제외 구역을 추가합니다.
    * @param position 제외 구역의 중심 위치
    * @param radius 제외할 반경
    * @param id 이 구역을 식별하기 위한 고유 ID (없으면 랜덤 생성)
    */
  public addExclusionZone(position: THREE.Vector3, radius: number, id?: string | number): void {
    const zoneId = id ?? THREE.MathUtils.generateUUID();
    // 동일한 ID가 있다면 업데이트, 없으면 새로 추가
    const existingZone = this.exclusionZones.find(z => z.id === zoneId);
    if (existingZone) {
      existingZone.position = position;
      existingZone.radius = radius;
      existingZone.radiusSq = radius * radius;
    } else {
      this.exclusionZones.push({
        id: zoneId,
        position,
        radius,
        radiusSq: radius * radius,
      });
    }
    this.forceUpdate = true; // 즉시 업데이트 필요
  }

  /**
   * 지정된 ID의 제외 구역을 제거합니다.
   * @param id 제거할 제외 구역의 ID
   * @returns 제거 성공 여부
   */
  public removeExclusionZone(id: string | number): boolean {
    const index = this.exclusionZones.findIndex(z => z.id === id);
    if (index > -1) {
      this.exclusionZones.splice(index, 1);
      this.forceUpdate = true; // 즉시 업데이트 필요
      return true;
    }
    return false;
  }

  /**
   * 모든 제외 구역을 제거합니다.
   */
  public clearExclusionZones(): void {
    if (this.exclusionZones.length > 0) {
      this.exclusionZones = [];
      this.forceUpdate = true; // 즉시 업데이트 필요
    }
  }
  public async Create({
    transforms = [],
    id,
    config,
  }: { transforms?: TRS[]; id?: Char, config?: Partial<WindyVegetationConfig> } = {}
  ): Promise<THREE.Group> {
    this.cfg = { ...DEFAULT_CONFIG, ...config };

    const expanded: TRS[] = [];
    const clusters: ClusterInfo[] = [];
    let runningStart = 0;

    for (const tRaw of transforms) {
      const t = { ...tRaw } as TRS;
      if (typeof t.scale === 'number') t.scale = [t.scale, t.scale, t.scale];

      const center = this.v3(t.position, new THREE.Vector3());
      const yaw = (Array.isArray(t.rotation) ? t.rotation[1] : t.rotation.y) || 0;
      const cCount = this.cfg.cluster.enabled
        ? this.randInt(this.cfg.cluster.countRange[0], this.cfg.cluster.countRange[1])
        : 1;

      const cStart = runningStart;
      for (let i = 0; i < cCount; i++) {
        const r = this.cfg.cluster.radius * Math.sqrt(Math.random());
        const a = Math.random() * Math.PI * 2;
        const off = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const offRot = new THREE.Vector3(off.x * cosY - off.z * sinY, 0, off.x * sinY + off.z * cosY);
        const jy = THREE.MathUtils.lerp(this.cfg.cluster.posJitterY[0], this.cfg.cluster.posJitterY[1], Math.random());
        const jYaw = THREE.MathUtils.degToRad(this.cfg.cluster.rotJitterYDeg) * (Math.random() * 2 - 1);
        const rot = Array.isArray(t.rotation)
          ? [t.rotation[0], (t.rotation[1] ?? 0) + jYaw, t.rotation[2]]
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
      clusters.push({ center: center.clone(), radius: this.cfg.cluster.radius, start: cStart, count: cCountFinal });
      runningStart += cCountFinal;
    }

    const totalCount = expanded.length;
    if (totalCount === 0) return new THREE.Group();

    const sourceObject = id ? await this.Loader(id) : this.makeDefaultBladeAsGroup();
    const parts = this._createBatchParts(sourceObject, totalCount);
    if (parts.length === 0) {
      console.warn("WindyInstancedVegetation: No meshes found in the loaded model or default geometry.");
      return new THREE.Group();
    }

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

    const baseMatrices = new Float32Array(totalCount * 16);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();

    const resultGroup = new THREE.Group();
    for (let i = 0; i < totalCount; i++) {
      const t = expanded[i];
      const pos = this.v3(t.position, p);
      const rot = this.euler(t.rotation);
      if (typeof t.scale === 'number') t.scale = [t.scale, t.scale, t.scale];
      const scl = this.v3(t.scale, s);
      q.setFromEuler(rot);
      m.compose(pos, q, scl);
      m.toArray(baseMatrices, i * 16);
      parts.forEach(part => part.mesh.setMatrixAt(i, m));
    }

    parts.forEach(part => {
      part.mesh.frustumCulled = false;
      part.mesh.castShadow = this.cfg.castShadow;
      part.mesh.receiveShadow = this.cfg.receiveShadow;
      part.mesh.count = totalCount;
      part.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      resultGroup.add(part.mesh);
    });

    this.group.add(resultGroup);
    const keepMask = new Uint8Array(totalCount);
    const batch: Batch = { parts, baseMatrices, clusters, totalCount, keepMask, modelId: id ?? null };

    this.buildRand(batch); // 해시 사전계산

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

  public update(delta: number): void {
    this.time += delta;
    this.frame++;

    const isDirty = this.isCameraDirty();
    const canUpdateLOD = (this.frame % Math.max(1, this.cfg.culling.everyNFrames) === 0);
    const needsUpdate = isDirty || this.forceUpdate;

    for (const b of this.batches) {
      if (this.cfg.windEnabled) {
        b.parts.forEach(p => p.uniforms.uTime.value = this.time);
      }

      // 스로틀링 강화: 두 조건을 모두 만족할 때만 실행
      if (needsUpdate && canUpdateLOD) {
        this.applyCullLODInPlace(b, false);
      }

      // 앰프 스무딩도 카메라가 움직였을 때만 재계산
      if (needsUpdate && this.cfg.ampDistance.enabled && this.camera && b.clusters.length) {
        const center = new THREE.Vector3();
        for (const c of b.clusters) center.add(c.center);
        center.multiplyScalar(1 / b.clusters.length);

        const cam = new THREE.Vector3();
        this.camera.getWorldPosition(cam);
        const d = cam.distanceTo(center);
        const { near, far, minFactor } = this.cfg.ampDistance;
        let target = this.cfg.globalAmp;
        if (d >= far) {
          target = this.cfg.globalAmp * minFactor;
        } else if (d > near) {
          const t = (d - near) / Math.max(1e-6, (far - near));
          target = this.cfg.globalAmp * THREE.MathUtils.lerp(1.0, minFactor, t);
        }

        // 카메라가 움직였을 때는 목표값으로 즉시 반영하거나, 부드러운 전환을 위해 기존 로직 유지
        // 여기서는 즉시 반영으로 변경
        b.ampSmooth = target;
        b.parts.forEach(p => p.uniforms.uGlobalAmp.value = b.ampSmooth as number);
      }
    }

    // 모든 업데이트가 끝난 후, 현재 카메라 상태를 캐시
    if (needsUpdate) {
      this.lastCamPos.copy(this.camera.position);
      this.lastCamQuat.copy(this.camera.quaternion);
      this.forceUpdate = false; // 업데이트 완료 후 플래그 초기화
    }
  }

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

  /* ------------------------------ Persistence ------------------------------ */
  public Save() {
    return this.batches.map(b => {
      if (b.parts.length === 0) return null;
      const firstPart = b.parts[0];
      const g = firstPart.geometry;
      const pickArr = (name: string) => {
        const attr = g.getAttribute(name) as THREE.InstancedBufferAttribute | undefined;
        return attr ? Array.from(attr.array as Float32Array) : null;
      };
      return {
        count: b.totalCount,
        matrices: Array.from(b.baseMatrices),
        attributes: {
          iPattern: pickArr("iPattern"),
          iPhase: pickArr("iPhase"),
          iStrength: pickArr("iStrength"),
          iDir: pickArr("iDir"),
        },
        cfg: this.cfg,
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

      if (item.cfg) this.cfg = { ...DEFAULT_CONFIG, ...item.cfg } as WindyVegetationConfig;

      const sourceObject = item.modelId ? await this.Loader(item.modelId as Char) : this.makeDefaultBladeAsGroup();
      const parts = this._createBatchParts(sourceObject, totalCount);
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

      const clusters = this.estimateClustersFromMatrices(baseMatrices);
      const keepMask = new Uint8Array(totalCount);
      this.group.add(resultGroup);

      const batch: Batch = { parts, baseMatrices, clusters, totalCount, keepMask, modelId: item.modelId ?? null };
      this.buildRand(batch); // 로드 후 해시 사전계산
      this.batches.push(batch);
    }
    callback?.();
  }

  /* ------------------------------ Internals ------------------------------ */
  private isCameraDirty(): boolean {
    const POS_THRESHOLD_SQ = 0.2 * 0.2;       // 20cm^2
    const ROT_THRESHOLD = 0.99999;          // ~0.25° (cos(angle/2))

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

  private applyCullLODInPlace(b: Batch, initial: boolean) {
    // 배치가 유효하지 않으면 즉시 종료
    if (!b || !b.baseMatrices || b.parts.length === 0) return;

    // 사전 계산된 난수 배열이 없으면 생성 (로드 시 대비)
    if (!b.rand) this.buildRand(b);
    const rand = b.rand!;

    // 카메라 및 프러스텀 정보 계산
    let frustum: THREE.Frustum | null = null;
    const camPos = new THREE.Vector3();
    if (this.camera) {
      this.camera.updateMatrixWorld();
      const vp = new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
      frustum = new THREE.Frustum().setFromProjectionMatrix(vp);
      this.camera.getWorldPosition(camPos);
    }

    // 인스턴스를 숨길 때 사용할 '크기 0' 행렬
    const kill = new THREE.Matrix4().makeScale(0, 0, 0);

    // 재사용할 임시 변수들
    const m = new THREE.Matrix4();
    const instancePos = new THREE.Vector3();

    // GPU에 업데이트할 범위를 최소화하기 위한 변수
    let minTouched = Number.POSITIVE_INFINITY;
    let maxTouched = -1;
    const markTouched = (idx: number) => {
      if (idx < minTouched) minTouched = idx;
      if (idx > maxTouched) maxTouched = idx;
    };

    // 모든 클러스터 순회
    for (const c of b.clusters) {
      // 1. 프러스텀 컬링 검사
      let culled = false;
      if (this.cfg.culling.enabled && frustum) {
        const sphere = new THREE.Sphere(c.center, c.radius);
        culled = !frustum.intersectsSphere(sphere);
      }

      // 2. LOD 밀도 계산
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

      // 3. 제외 구역과의 교차 여부 사전 검사 (효율성)
      let isClusterInAnyExclusionZone = false;
      if (this.exclusionZones.length > 0) {
        for (const zone of this.exclusionZones) {
          const distanceSq = c.center.distanceToSquared(zone.position);
          const combinedRadius = c.radius + zone.radius;
          if (distanceSq < combinedRadius * combinedRadius) {
            isClusterInAnyExclusionZone = true;
            break;
          }
        }
      }

      // 클러스터 내의 모든 인스턴스 순회
      for (let j = 0; j < c.count; j++) {
        const idx = c.start + j;

        // 최종 표시 여부(keep) 결정
        let keep = (!culled) && (rand[idx] <= density);

        // 제외 구역 검사 (클러스터가 구역 근처에 있을 때만 실행)
        if (keep && isClusterInAnyExclusionZone) {
          instancePos.setFromMatrixPosition(
            m.fromArray(b.baseMatrices, idx * 16)
          );
          for (const zone of this.exclusionZones) {
            if (instancePos.distanceToSquared(zone.position) < zone.radiusSq) {
              keep = false; // 제외 구역 안에 있으면 최종적으로 숨김
              break;
            }
          }
        }

        const prev = b.keepMask[idx];
        const next = keep ? 1 : 0;

        // 상태가 변경된 인스턴스만 행렬 업데이트
        if (initial || prev !== next) {
          if (keep) {
            m.fromArray(b.baseMatrices, idx * 16); // 복구
          } else {
            m.copy(kill); // 숨김
          }
          b.parts.forEach(p => p.mesh.setMatrixAt(idx, m));
          b.keepMask[idx] = next;
          markTouched(idx);
        }
      }
    }

    // 변경된 인스턴스가 있을 경우, 최소한의 범위만 GPU에 업로드
    if (minTouched !== Number.POSITIVE_INFINITY) {
      const offset = minTouched;
      const count = maxTouched - minTouched + 1;
      for (const p of b.parts) {
        p.mesh.count = b.totalCount; // count는 항상 최대로 유지해야 숨김/복구 가능
        p.mesh.instanceMatrix.updateRange.offset = offset;
        p.mesh.instanceMatrix.updateRange.count = count;
        p.mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  private _createBatchParts(source: THREE.Object3D, totalCount: number): BatchPart[] {
    const parts: BatchPart[] = [];
    source.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry.clone();
        const material = child.material instanceof THREE.Material
          ? (child.material.clone() as THREE.MeshStandardMaterial)
          : new THREE.MeshStandardMaterial();

        material.vertexColors = true;
        material.roughness = this.cfg.roughness;
        material.metalness = this.cfg.metalness;
        material.side = this.cfg.doubleSide ? THREE.DoubleSide : THREE.FrontSide;

        const maxY = this.getGeometryHeightY(geometry) || this.cfg.defaultBlade.height;
        const uniforms: WindUniforms = {
          uWindEnabled: { value: this.cfg.windEnabled },
          uTime: { value: 0 },
          uWindDir: { value: this.cfg.windDir.clone().normalize() },
          uPatAmp: { value: new THREE.Vector3(...this.cfg.patAmp) },
          uPatFreq: { value: new THREE.Vector3(...this.cfg.patFreq) },
          uPatPhase: { value: new THREE.Vector3(...this.cfg.patPhase) },
          uGlobalAmp: { value: this.cfg.globalAmp },
          uMaxY: { value: maxY },
          uBendExp: { value: this.cfg.bendExp },
        };
        this.installWindOnBeforeCompile(material, uniforms);

        const inst = new THREE.InstancedMesh(geometry, material, totalCount);
        inst.frustumCulled = false;
        inst.castShadow = this.cfg.castShadow;
        inst.receiveShadow = this.cfg.receiveShadow;
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        parts.push({ mesh: inst, geometry, material, uniforms });
      }
    });

    if (parts.length === 0) {
      const { geometry, material } = this.makeDefaultBladeGeometryAndMaterial();
      const maxY = this.getGeometryHeightY(geometry) || this.cfg.defaultBlade.height;
      const uniforms: WindUniforms = {
        uWindEnabled: { value: this.cfg.windEnabled },
        uTime: { value: 0 },
        uWindDir: { value: this.cfg.windDir.clone().normalize() },
        uPatAmp: { value: new THREE.Vector3(...this.cfg.patAmp) },
        uPatFreq: { value: new THREE.Vector3(...this.cfg.patFreq) },
        uPatPhase: { value: new THREE.Vector3(...this.cfg.patPhase) },
        uGlobalAmp: { value: this.cfg.globalAmp },
        uMaxY: { value: maxY },
        uBendExp: { value: this.cfg.bendExp },
      };
      this.installWindOnBeforeCompile(material, uniforms);
      const inst = new THREE.InstancedMesh(geometry, material, totalCount);
      inst.frustumCulled = false;
      inst.castShadow = this.cfg.castShadow;
      inst.receiveShadow = this.cfg.receiveShadow;
      inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      parts.push({ mesh: inst, geometry, material, uniforms });
    }
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
    const g = this.makeTaperedBladeGeometry(this.cfg.defaultBlade.bottomWidth, this.cfg.defaultBlade.topWidth, this.cfg.defaultBlade.height, this.cfg.defaultBlade.segY);
    this.applyVerticalVertexColors(g, new THREE.Color(this.cfg.defaultBlade.colorBottom), new THREE.Color(this.cfg.defaultBlade.colorTop), this.cfg.defaultBlade.withTip ? new THREE.Color(this.cfg.defaultBlade.tipColor) : undefined);
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
      shader.uniforms.uWindEnabled = uniforms.uWindEnabled;
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uWindDir = uniforms.uWindDir;
      shader.uniforms.uPatAmp = { value: new THREE.Vector3().copy(uniforms.uPatAmp.value) };
      shader.uniforms.uPatFreq = { value: new THREE.Vector3().copy(uniforms.uPatFreq.value) };
      shader.uniforms.uPatPhase = { value: new THREE.Vector3().copy(uniforms.uPatPhase.value) };
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