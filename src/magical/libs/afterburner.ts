import * as THREE from "three";

export interface AfterburnerNozzleOffset {
  x: number;
  y: number;
  z: number;
}

export interface AfterburnerOptions {
  color?: THREE.ColorRepresentation;
  scale?: number;
  length?: number;
  reverseDirection?: boolean;
  offsetZ?: number;
  isActive?: boolean;
  spawnPerSecond?: number;
  particleLifetime?: number;
  opacity?: number;
  nozzleOffsets?: AfterburnerNozzleOffset[];
  bounds?: {
    minZ: number;
    maxZ: number;
  };
}

export interface AfterburnerRuntimeState {
  active?: boolean;
  throttle?: number;
  drift?: THREE.Vector3;
}

interface Particle {
  mesh: THREE.Sprite;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

const DEFAULT_NOZZLE_OFFSETS: AfterburnerNozzleOffset[] = [{ x: 0, y: 0, z: 0 }];

const DEFAULT_OPTIONS: Required<AfterburnerOptions> = {
  color: "#00aaff",
  scale: 1,
  length: 1,
  reverseDirection: true,
  offsetZ: 0,
  isActive: false,
  spawnPerSecond: 96,
  particleLifetime: 0.7,
  opacity: 1,
  nozzleOffsets: DEFAULT_NOZZLE_OFFSETS,
  bounds: {
    minZ: 0,
    maxZ: 0,
  },
};

export class Afterburner {
  private static sharedTexture: THREE.CanvasTexture | null = null;

  private target?: THREE.Object3D;
  private targetParent?: THREE.Object3D;
  private readonly anchorRoot = new THREE.Group();
  private readonly particleRoot = new THREE.Group();
  private readonly nozzleNodes: THREE.Object3D[] = [];
  private readonly particles: Particle[] = [];
  private readonly worldPos = new THREE.Vector3();
  private readonly parentPos = new THREE.Vector3();
  private readonly driftVelocity = new THREE.Vector3();
  private readonly directionWorld = new THREE.Vector3();
  private readonly directionLocal = new THREE.Vector3();
  private readonly parentQuaternion = new THREE.Quaternion();
  private readonly parentQuaternionInverse = new THREE.Quaternion();
  private readonly targetQuaternion = new THREE.Quaternion();
  private readonly localBounds = new THREE.Box3();
  private readonly boundsMin = new THREE.Vector3();
  private readonly boundsMax = new THREE.Vector3();
  private readonly tempBox = new THREE.Box3();
  private readonly tempMatrix = new THREE.Matrix4();
  private readonly inverseTargetMatrix = new THREE.Matrix4();
  private readonly tempVector = new THREE.Vector3();
  private readonly corner = new THREE.Vector3();
  private spawnAccumulator = 0;
  private baseMinZ = 0;
  private baseMaxZ = 0;

  public options: Required<AfterburnerOptions>;

  constructor(initialOptions: AfterburnerOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...initialOptions,
      nozzleOffsets: initialOptions.nozzleOffsets ?? DEFAULT_OPTIONS.nozzleOffsets,
      bounds: initialOptions.bounds ?? DEFAULT_OPTIONS.bounds,
    };

    this.anchorRoot.name = "afterburner-anchor-root";
    this.particleRoot.name = "afterburner-particles";
    this.ensureTexture();
    this.rebuildNozzles();
  }

  attachTo(target: THREE.Object3D) {
    if (this.target === target) return;
    this.detach();

    this.target = target;
    this.targetParent = target.parent ?? undefined;

    target.add(this.anchorRoot);
    (this.targetParent ?? target).add(this.particleRoot);

    if (this.options.bounds.minZ !== this.options.bounds.maxZ) {
      this.setBaseBounds(this.options.bounds.minZ, this.options.bounds.maxZ);
    } else {
      this.computeBoundsFromTarget();
    }

    this.updateNozzleNodes();
  }

  detach() {
    this.clearParticles();

    if (this.anchorRoot.parent) {
      this.anchorRoot.parent.remove(this.anchorRoot);
    }
    if (this.particleRoot.parent) {
      this.particleRoot.parent.remove(this.particleRoot);
    }

    this.target = undefined;
    this.targetParent = undefined;
    this.spawnAccumulator = 0;
  }

  update(delta: number, state: AfterburnerRuntimeState = {}) {
    if (!this.target) return;

    this.updateNozzleNodes();

    const throttle = THREE.MathUtils.clamp(state.throttle ?? (this.options.isActive ? 1 : 0), 0, 1);
    const active = (state.active ?? this.options.isActive) && throttle > 0.01;
    if (active) {
      this.spawnAccumulator += this.options.spawnPerSecond * throttle * delta;
      while (this.spawnAccumulator >= 1) {
        this.spawnParticle(throttle, state.drift);
        this.spawnAccumulator -= 1;
      }
    } else {
      this.spawnAccumulator = 0;
    }

    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const particle = this.particles[i];
      particle.life -= delta;

      if (particle.life <= 0) {
        this.disposeParticle(i);
        continue;
      }

      particle.mesh.position.addScaledVector(particle.velocity, delta);

      const lifeAlpha = particle.life / particle.maxLife;
      const scale = (3 + (1 - lifeAlpha) * 6) * this.options.scale;
      particle.mesh.scale.set(scale, scale, 1);
      const material = particle.mesh.material as THREE.SpriteMaterial;
      material.opacity = lifeAlpha * this.options.opacity;
    }
  }

  updateOptions(newOptions: Partial<AfterburnerOptions>) {
    this.options = {
      ...this.options,
      ...newOptions,
      nozzleOffsets: newOptions.nozzleOffsets ?? this.options.nozzleOffsets,
      bounds: newOptions.bounds ?? this.options.bounds,
    };

    if (newOptions.bounds) {
      this.setBaseBounds(newOptions.bounds.minZ, newOptions.bounds.maxZ);
    }
    if (newOptions.nozzleOffsets) {
      this.rebuildNozzles();
    }
  }

  setBaseBounds(minZ: number, maxZ: number) {
    this.baseMinZ = minZ;
    this.baseMaxZ = maxZ;
    this.options.bounds = { minZ, maxZ };
    this.updateNozzleNodes();
  }

  dispose() {
    this.detach();
  }

  private rebuildNozzles() {
    this.nozzleNodes.forEach((node) => this.anchorRoot.remove(node));
    this.nozzleNodes.length = 0;

    const nozzleOffsets = this.options.nozzleOffsets.length > 0
      ? this.options.nozzleOffsets
      : DEFAULT_NOZZLE_OFFSETS;

    nozzleOffsets.forEach((offset, index) => {
      const node = new THREE.Object3D();
      node.name = `afterburner-nozzle-${index}`;
      node.position.set(offset.x, offset.y, offset.z);
      this.anchorRoot.add(node);
      this.nozzleNodes.push(node);
    });
  }

  private updateNozzleNodes() {
    const targetBaseZ = this.options.reverseDirection ? this.baseMinZ : this.baseMaxZ;
    const offsetSign = this.options.reverseDirection ? -1 : 1;
    const baseZ = targetBaseZ + (this.options.offsetZ * offsetSign);
    const nozzleOffsets = this.options.nozzleOffsets.length > 0
      ? this.options.nozzleOffsets
      : DEFAULT_NOZZLE_OFFSETS;

    this.nozzleNodes.forEach((node, index) => {
      const offset = nozzleOffsets[index] ?? DEFAULT_NOZZLE_OFFSETS[0];
      node.position.set(offset.x, offset.y, baseZ + offset.z);
    });
  }

  private spawnParticle(throttle: number, drift?: THREE.Vector3) {
    if (!this.target) return;
    if (this.nozzleNodes.length <= 0) return;

    const nozzle = this.nozzleNodes[Math.floor(Math.random() * this.nozzleNodes.length)];
    nozzle.getWorldPosition(this.worldPos);

    const particleParent = this.particleRoot.parent;
    if (particleParent) {
      this.parentPos.copy(this.worldPos);
      particleParent.worldToLocal(this.parentPos);
    } else {
      this.parentPos.copy(this.worldPos);
    }

    this.target.getWorldQuaternion(this.targetQuaternion);
    this.directionWorld.set(0, 0, this.options.reverseDirection ? -1 : 1).applyQuaternion(this.targetQuaternion).normalize();
    this.directionLocal.copy(this.directionWorld);

    if (particleParent) {
      particleParent.getWorldQuaternion(this.parentQuaternion);
      this.parentQuaternionInverse.copy(this.parentQuaternion).invert();
      this.directionLocal.applyQuaternion(this.parentQuaternionInverse).normalize();
    }

    const speed = THREE.MathUtils.lerp(8, 18, Math.random()) * this.options.length * THREE.MathUtils.lerp(0.65, 1.15, throttle);
    this.driftVelocity.copy(drift ?? this.tempVector.set(0, 0, 0));

    const material = new THREE.SpriteMaterial({
      map: this.ensureTexture(),
      color: new THREE.Color(this.options.color),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: this.options.opacity,
    });

    const sprite = new THREE.Sprite(material);
    const jitter = 0.35 * this.options.scale;
    sprite.position.copy(this.parentPos).add(this.tempVector.set(
      (Math.random() - 0.5) * jitter,
      (Math.random() - 0.5) * jitter,
      (Math.random() - 0.5) * jitter,
    ));
    this.particleRoot.add(sprite);

    const initialScale = THREE.MathUtils.lerp(1.8, 3.4, throttle) * this.options.scale;
    sprite.scale.set(initialScale, initialScale, 1);

    this.particles.push({
      mesh: sprite,
      life: this.options.particleLifetime * THREE.MathUtils.lerp(0.85, 1.15, Math.random()),
      maxLife: this.options.particleLifetime,
      velocity: this.directionLocal.clone().multiplyScalar(speed).add(this.driftVelocity),
    });
  }

  private disposeParticle(index: number) {
    const particle = this.particles[index];
    this.particleRoot.remove(particle.mesh);
    (particle.mesh.material as THREE.Material).dispose();
    this.particles.splice(index, 1);
  }

  private clearParticles() {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      this.disposeParticle(i);
    }
  }

  private computeBoundsFromTarget() {
    if (!this.target) return;

    this.target.updateWorldMatrix(true, true);
    this.localBounds.makeEmpty();
    this.inverseTargetMatrix.copy(this.target.matrixWorld).invert();

    this.target.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const geometry = mesh.geometry;
      if (!geometry || !geometry.isBufferGeometry) return;

      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      if (!geometry.boundingBox) return;

      child.updateWorldMatrix(true, false);
      this.tempMatrix.multiplyMatrices(this.inverseTargetMatrix, child.matrixWorld);
      this.tempBox.copy(geometry.boundingBox);

      const min = this.tempBox.min;
      const max = this.tempBox.max;
      const corners: [number, number, number][] = [
        [min.x, min.y, min.z],
        [min.x, min.y, max.z],
        [min.x, max.y, min.z],
        [min.x, max.y, max.z],
        [max.x, min.y, min.z],
        [max.x, min.y, max.z],
        [max.x, max.y, min.z],
        [max.x, max.y, max.z],
      ];

      corners.forEach(([x, y, z]) => {
        this.corner.set(x, y, z).applyMatrix4(this.tempMatrix);
        this.localBounds.expandByPoint(this.corner);
      });
    });

    if (this.localBounds.isEmpty()) {
      this.baseMinZ = 0;
      this.baseMaxZ = 0;
      return;
    }

    this.boundsMin.copy(this.localBounds.min);
    this.boundsMax.copy(this.localBounds.max);
    this.baseMinZ = this.boundsMin.z;
    this.baseMaxZ = this.boundsMax.z;
  }

  private ensureTexture() {
    if (Afterburner.sharedTexture) return Afterburner.sharedTexture;

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      Afterburner.sharedTexture = new THREE.CanvasTexture(canvas);
      return Afterburner.sharedTexture;
    }

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(220,240,255,0.95)");
    gradient.addColorStop(0.48, "rgba(80,170,255,0.55)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    Afterburner.sharedTexture = new THREE.CanvasTexture(canvas);
    return Afterburner.sharedTexture;
  }
}
