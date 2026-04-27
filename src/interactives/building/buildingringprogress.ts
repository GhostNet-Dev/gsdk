import * as THREE from "three";

export enum BuildingRingProgressState {
  Construction = "construction",
  Healthy = "healthy",
  Warning = "warning",
  Critical = "critical",
}

type BuildingRingProgressOptions = {
  state?: BuildingRingProgressState;
  visible?: boolean;
  yOffset?: number;
};

const RingColorByState: Record<BuildingRingProgressState, number> = {
  [BuildingRingProgressState.Construction]: 0x00ff00,
  [BuildingRingProgressState.Healthy]: 0x3de06f,
  [BuildingRingProgressState.Warning]: 0xffc857,
  [BuildingRingProgressState.Critical]: 0xff4f5e,
};

const DefaultOptions: Required<BuildingRingProgressOptions> = {
  state: BuildingRingProgressState.Construction,
  visible: true,
  yOffset: 0,
};
const DefaultRingScale = 1.5;

export class BuildingRingProgress {
  readonly object = new THREE.Group();
  private readonly innerRadius: number;
  private readonly outerRadius: number;
  private readonly background: THREE.Mesh;
  private readonly progress: THREE.Mesh;
  private readonly progressMaterial: THREE.MeshBasicMaterial;
  private state: BuildingRingProgressState;
  private disposed = false;

  constructor(width: number, depth: number, options: BuildingRingProgressOptions = {}) {
    const opts = { ...DefaultOptions, ...options };
    const radius = Math.max(width, depth) * 2.0 * DefaultRingScale;
    this.innerRadius = radius * 0.9;
    this.outerRadius = radius;
    this.state = opts.state;

    const bgGeom = new THREE.RingGeometry(this.innerRadius, this.outerRadius, 64);
    bgGeom.rotateX(-Math.PI / 2);
    const bgMat = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    this.background = new THREE.Mesh(bgGeom, bgMat);

    this.progressMaterial = new THREE.MeshBasicMaterial({
      color: RingColorByState[this.state],
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.progress = new THREE.Mesh(new THREE.BufferGeometry(), this.progressMaterial);
    this.progress.name = "ring_progress";
    this.progress.position.y += 0.01;

    this.object.name = "building-ring-progress";
    this.object.visible = opts.visible;
    this.object.position.y += opts.yOffset;
    this.object.add(this.background, this.progress);
    this.setRatio(0);
  }

  addTo(parent: THREE.Object3D): void {
    if (this.disposed) return;
    parent.add(this.object);
  }

  attachToOwnerBase(owner: THREE.Object3D, yOffset = 0.06): void {
    if (this.disposed) return;

    const parent = owner.parent;
    if (parent) {
      parent.add(this.object);
      this.object.position.copy(owner.position);
      this.object.position.y += yOffset;
      return;
    }

    owner.add(this.object);
    this.object.position.set(0, yOffset, 0);
  }

  setPosition(position: THREE.Vector3, yOffset = 0): void {
    if (this.disposed) return;
    this.object.position.copy(position);
    this.object.position.y += yOffset;
  }

  setRatio(ratio: number): void {
    if (this.disposed) return;

    const clamped = THREE.MathUtils.clamp(ratio, 0, 1);
    this.progress.visible = clamped > 0;
    this.progress.geometry.dispose();
    const thetaLength = clamped * Math.PI * 2;
    const geom = new THREE.RingGeometry(this.innerRadius, this.outerRadius, 64, 1, Math.PI / 2, -thetaLength);
    geom.rotateX(-Math.PI / 2);
    this.progress.geometry = geom;
  }

  setState(state: BuildingRingProgressState): void {
    if (this.disposed || this.state === state) return;
    this.state = state;
    this.progressMaterial.color.setHex(RingColorByState[state]);
  }

  show(): void {
    if (this.disposed) return;
    this.object.visible = true;
  }

  hide(): void {
    if (this.disposed) return;
    this.object.visible = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.object.parent?.remove(this.object);
    this.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
        return;
      }
      child.material.dispose();
    });
  }
}
