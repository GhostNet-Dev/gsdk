import * as THREE from "three";
import { IProjectileModel } from "./projectile";

type ImpactPulse = {
  ring: THREE.Mesh;
  flash: THREE.PointLight;
  elapsed: number;
  duration: number;
};

type ExplosionBurst = {
  points: THREE.Points;
  geom: THREE.BufferGeometry;
  mat: THREE.ShaderMaterial;
  elapsed: number;
  duration: number;
};

export class EnergyHomingModel implements IProjectileModel {
  private static particleTexture = EnergyHomingModel.createParticleTexture();
  private static explosionMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDur: { value: 1.1 },
      tDiffuse: { value: EnergyHomingModel.particleTexture },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uDur;
      attribute vec3 aVelocity;
      attribute float aSize;
      varying float vAlpha;

      void main() {
        float p = clamp(uTime / uDur, 0.0, 1.0);
        vAlpha = 1.0 - p * p;

        vec3 moved = position + aVelocity * uTime * (1.0 - p * 0.35);
        vec4 mv = modelViewMatrix * vec4(moved, 1.0);
        gl_Position = projectionMatrix * mv;

        float dist = max(0.0001, -mv.z);
        gl_PointSize = aSize * (1.0 - p * 0.45) * (75.0 / dist);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      varying float vAlpha;

      void main() {
        vec4 tex = texture2D(tDiffuse, gl_PointCoord);
        gl_FragColor = vec4(tex.rgb * vAlpha, tex.a * vAlpha);
      }
    `,
  });

  private readonly root = new THREE.Group();
  private readonly head: THREE.Mesh;
  private readonly trailGeometry: THREE.BufferGeometry;
  private readonly trailMaterial: THREE.PointsMaterial;
  private readonly trail: THREE.Points;
  private readonly clock = new THREE.Clock();

  private readonly maxTrail = 32;
  private readonly trailPositions = new Float32Array(this.maxTrail * 3);
  private readonly trailColors = new Float32Array(this.maxTrail * 4);
  private readonly history: THREE.Vector3[] = [];

  private readonly impacts: ImpactPulse[] = [];
  private readonly bursts: ExplosionBurst[] = [];

  private active = false;
  private releaseElapsed = 0;
  private readonly releaseDuration = 0.3;
  private bodyFadeFinished = true;

  get Meshs(): THREE.Object3D {
    return this.root;
  }

  constructor() {
    this.head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 14),
      new THREE.MeshBasicMaterial({
        color: 0x88ffff,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute("position", new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute("color", new THREE.BufferAttribute(this.trailColors, 4));

    this.trailMaterial = new THREE.PointsMaterial({
      size: 0.22,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.trail = new THREE.Points(this.trailGeometry, this.trailMaterial);
    this.trail.frustumCulled = false;

    this.root.add(this.trail, this.head);
    this.root.visible = false;
    this.root.frustumCulled = false;
    this.seedTrail(new THREE.Vector3());
  }

  create(position: THREE.Vector3, _direction?: THREE.Vector3): void {
    this.root.visible = true;
    this.active = true;
    this.releaseElapsed = 0;
    this.bodyFadeFinished = false;

    this.cleanupEffects();

    const headMat = this.head.material as THREE.MeshBasicMaterial;
    headMat.opacity = 1;
    this.trailMaterial.opacity = 0.95;

    this.head.position.copy(position);
    this.seedTrail(position);
    this.updateTrailBuffers();

    this.clock.start();
  }

  update(position: THREE.Vector3): void {
    if (!this.root.visible) return;

    this.head.position.copy(position);
    this.history.unshift(position.clone());
    if (this.history.length > this.maxTrail) {
      this.history.length = this.maxTrail;
    }

    this.updateTrailBuffers();
    this.updateEffects(this.clock.getDelta());
  }

  hit(position: THREE.Vector3, normal?: THREE.Vector3): void {
    const n = normal?.clone().normalize() ?? new THREE.Vector3(0, 1, 0);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.55, 24),
      new THREE.MeshBasicMaterial({
        color: 0x66ddff,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );

    ring.position.copy(position);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    ring.scale.setScalar(0.85);
    this.root.add(ring);

    const flash = new THREE.PointLight(0x66ddff, 2.6, 5.5, 2.2);
    flash.position.copy(position);
    this.root.add(flash);

    this.impacts.push({
      ring,
      flash,
      elapsed: 0,
      duration: 0.2,
    });

    this.spawnExplosionBurst(position, 64);
  }

  release(): void {
    this.active = false;
    this.releaseElapsed = 0;
  }

  updateRelease(delta: number): void {
    if (!this.root.visible) return;

    if (!this.active) {
      this.releaseElapsed += delta;
      const t = THREE.MathUtils.clamp(this.releaseElapsed / this.releaseDuration, 0, 1);
      const remain = 1 - t;

      (this.head.material as THREE.MeshBasicMaterial).opacity = remain;
      this.trailMaterial.opacity = 0.95 * remain;
      this.bodyFadeFinished = t >= 1;
    }

    this.updateEffects(delta);

    if (this.bodyFadeFinished && this.impacts.length === 0 && this.bursts.length === 0) {
      this.root.visible = false;
      this.seedTrail(this.head.position);
      this.updateTrailBuffers();
    }
  }

  isReleaseFinished(): boolean {
    return !this.root.visible;
  }

  private updateEffects(delta: number): void {
    if (delta <= 0) return;

    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const impact = this.impacts[i];
      impact.elapsed += delta;

      const p = THREE.MathUtils.clamp(impact.elapsed / impact.duration, 0, 1);
      const remain = 1 - p;

      const mat = impact.ring.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.95 * remain;
      impact.ring.scale.setScalar(0.85 + p * 1.6);
      impact.flash.intensity = 2.6 * remain;

      if (p >= 1) {
        this.root.remove(impact.ring, impact.flash);
        impact.ring.geometry.dispose();
        mat.dispose();
        this.impacts.splice(i, 1);
      }
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.elapsed += delta;
      burst.mat.uniforms.uTime.value = burst.elapsed;

      if (burst.elapsed >= burst.duration) {
        this.root.remove(burst.points);
        burst.geom.dispose();
        burst.mat.dispose();
        this.bursts.splice(i, 1);
      }
    }
  }

  private spawnExplosionBurst(position: THREE.Vector3, count: number): void {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      ).normalize();

      const speed = 5 + Math.random() * 11;
      velocities[i * 3 + 0] = dir.x * speed;
      velocities[i * 3 + 1] = dir.y * speed;
      velocities[i * 3 + 2] = dir.z * speed;
      sizes[i] = 1 + Math.random() * 2.4;
    }

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geom.setAttribute("aVelocity", new THREE.BufferAttribute(velocities, 3));
    geom.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const mat = EnergyHomingModel.explosionMaterial.clone();
    mat.uniforms.uTime.value = 0;

    const points = new THREE.Points(geom, mat);
    points.frustumCulled = false;

    this.root.add(points);
    this.bursts.push({
      points,
      geom,
      mat,
      elapsed: 0,
      duration: 1.1,
    });
  }

  private cleanupEffects(): void {
    for (const impact of this.impacts) {
      this.root.remove(impact.ring, impact.flash);
      impact.ring.geometry.dispose();
      (impact.ring.material as THREE.Material).dispose();
    }
    this.impacts.length = 0;

    for (const burst of this.bursts) {
      this.root.remove(burst.points);
      burst.geom.dispose();
      burst.mat.dispose();
    }
    this.bursts.length = 0;
  }

  private seedTrail(position: THREE.Vector3): void {
    this.history.length = 0;
    for (let i = 0; i < this.maxTrail; i++) {
      this.history.push(position.clone());
    }
  }

  private updateTrailBuffers(): void {
    for (let i = 0; i < this.maxTrail; i++) {
      const p = this.history[Math.min(i, this.history.length - 1)];
      this.trailPositions[i * 3 + 0] = p.x;
      this.trailPositions[i * 3 + 1] = p.y;
      this.trailPositions[i * 3 + 2] = p.z;

      const life = 1 - i / this.maxTrail;
      this.trailColors[i * 4 + 0] = 0.2 + 0.6 * life;
      this.trailColors[i * 4 + 1] = 0.7 + 0.3 * life;
      this.trailColors[i * 4 + 2] = 1.0;
      this.trailColors[i * 4 + 3] = Math.pow(life, 1.5);
    }

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }

  private static createParticleTexture(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return new THREE.Texture();
    }

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.2, "rgba(120,240,255,0.9)");
    gradient.addColorStop(0.55, "rgba(40,140,255,0.45)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }
}
