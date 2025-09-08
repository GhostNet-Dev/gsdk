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
type Distribution = "uniform";

/* ------------------------------ Config Object ----------------------------- */
// 바람 관련 모든 설정이 제거되었습니다.
export interface InstancedVegetationConfig {
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
  // LOD (density reduction)
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
}

const DEFAULT_CONFIG: InstancedVegetationConfig = {
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
};

/* ---------------------------- Helper Structures --------------------------- */
type ClusterInfo = {
  center: THREE.Vector3;
  radius: number;
  start: number;
  count: number;
};

type BatchPart = {
  mesh: THREE.InstancedMesh;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
};

type Batch = {
  parts: BatchPart[];
  baseMatrices: Float32Array;
  clusters: ClusterInfo[];
  totalCount: number;
};

/* --------------------------------- Class --------------------------------- */
// 클래스 이름을 WindyInstancedVegetation -> InstancedVegetation 등으로 변경하여 사용하시는 것을 추천합니다.
export class InstancedVegetation implements IWorldMapObject {
  public LoopId: number = 0;
  public Type: MapEntryType = MapEntryType.WindyInstancedVegetation;
  private cfg: InstancedVegetationConfig;
  private frame = 0;
  private group: THREE.Group;
  private batches: Batch[] = [];

  constructor(
    private loader: Loader,
    private scene: THREE.Scene,
    private eventCtrl: IEventController,
    private camera: THREE.Camera,
    config?: Partial<InstancedVegetationConfig>
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = "InstancedVegetation";
    this.scene.add(this.group);
  }

  /* ------------------------------- Public API ------------------------------ */
  public SetCamera(cam: THREE.Camera) { this.camera = cam; }

  async Loader(id: Char): Promise<THREE.Object3D> {
    const asset = this.loader.GetAssets(id);
    return await asset.CloneModel();
  }

  public async Create({
    transforms = [],
    id,
    config,
  }: { transforms?: TRS[]; id?: Char, config?: Partial<InstancedVegetationConfig> } = {}
  ): Promise<THREE.Group> {
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

    const sourceObject = id ? await this.Loader(id) : this.makeDefaultBladeAsGroup();
    const parts = this._createBatchParts(sourceObject, totalCount);
    if (parts.length === 0) {
      console.warn("InstancedVegetation: No meshes found in the loaded model or default geometry.");
      return new THREE.Group();
    }
    
    // 바람 효과를 위한 인스턴스 속성(iPattern, iPhase 등) 생성 코드가 제거되었습니다.
    
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

    this.group.add(resultGroup);
    const batch: Batch = { parts, baseMatrices, clusters, totalCount };
    this.batches.push(batch); 
    return resultGroup;
  }

  public async CreateDone() {
    this.batches.forEach(b => this.applyCullLODInPlace(b, true));
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

  // Save/Load는 바람 관련 속성 없이 행렬 정보만 저장/로드하도록 단순화되었습니다.
  public Save() {
    return this.batches.map(b => {
      if (b.parts.length === 0) return null;
      return {
        count: b.totalCount,
        matrices: Array.from(b.baseMatrices),
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
      
      const resultGroup = new THREE.Group();
      parts.forEach(p => {
          p.mesh.instanceMatrix.needsUpdate = true;
          p.mesh.count = totalCount;
          resultGroup.add(p.mesh);
      });
      const clusters = this.estimateClustersFromMatrices(baseMatrices);
      
      this.group.add(resultGroup);
      this.batches.push({ parts, baseMatrices, clusters, totalCount });
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

  // 셰이더를 수정하는 installWindOnBeforeCompile 메서드가 제거되었습니다.
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

            const inst = new THREE.InstancedMesh(geometry, material, totalCount);
            inst.frustumCulled = this.cfg.frustumCulled;
            inst.castShadow = this.cfg.castShadow;
            inst.receiveShadow = this.cfg.receiveShadow;
            inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            
            parts.push({ mesh: inst, geometry, material });
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
        p.geometry.dispose();
        p.material.dispose();
    });
  }

  public GetMeshes(): readonly THREE.InstancedMesh[] {
    return this.batches.flatMap(b => b.parts.map(p => p.mesh));
  }
  
  public GetBatchCount(): number { return this.batches.length; }
}