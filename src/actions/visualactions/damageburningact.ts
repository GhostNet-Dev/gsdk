import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

interface DamageParticle {
  mesh: THREE.Object3D;
  life: number;
  decay: number;
  velocity: THREE.Vector3;
  rotSpeed?: THREE.Vector3;
}

export interface DamageBurningOptions {
  sampleCount?: number;
  fireIntensity?: number;
  smokeIntensity?: number;
  debrisIntensity?: number;
  burstFireCount?: number;
  burstSmokeCount?: number;
  burstDebrisCount?: number;
  flameScale?: number;
  smokeScale?: number;
  debrisScale?: number;
}

export class DamageBurningAction implements IActionComponent, ILoop {
  LoopId = 0;
  id = "damageburning";

  private emitterNodes: THREE.Object3D[] = [];
  private fires: DamageParticle[] = [];
  private smokes: DamageParticle[] = [];
  private debris: DamageParticle[] = [];

  private fireTex: THREE.CanvasTexture;
  private smokeTex: THREE.CanvasTexture;
  private debrisGeo = new THREE.TetrahedronGeometry(1.2);
  private running = false;
  private pointLight?: THREE.PointLight;

  private sampleCount: number;
  private fireIntensity: number;
  private smokeIntensity: number;
  private debrisIntensity: number;
  private burstFireCount: number;
  private burstSmokeCount: number;
  private burstDebrisCount: number;
  private flameScale: number;
  private smokeScale: number;
  private debrisScale: number;

  constructor(
    private eventCtrl: IEventController,
    private scene: THREE.Scene,
    options: DamageBurningOptions = {},
  ) {
    this.sampleCount = options.sampleCount ?? 3;
    this.fireIntensity = options.fireIntensity ?? 0.75;
    this.smokeIntensity = options.smokeIntensity ?? 0.55;
    this.debrisIntensity = options.debrisIntensity ?? 0.12;
    this.burstFireCount = options.burstFireCount ?? 20;
    this.burstSmokeCount = options.burstSmokeCount ?? 12;
    this.burstDebrisCount = options.burstDebrisCount ?? 10;
    this.flameScale = options.flameScale ?? 10;
    this.smokeScale = options.smokeScale ?? 6;
    this.debrisScale = options.debrisScale ?? 1;

    this.fireTex = this.createGradientTexture([
      { pos: 0, color: "rgba(255,255,255,1)" },
      { pos: 0.12, color: "rgba(255,220,100,1)" },
      { pos: 0.35, color: "rgba(255,80,0,0.7)" },
      { pos: 1, color: "rgba(0,0,0,0)" },
    ]);

    this.smokeTex = this.createGradientTexture([
      { pos: 0, color: "rgba(80,80,80,0.9)" },
      { pos: 0.6, color: "rgba(20,20,20,0.45)" },
      { pos: 1, color: "rgba(0,0,0,0)" },
    ]);
  }

  activate(target: IActionUser, _context?: ActionContext): void {
    const obj = target.objs;
    if (!obj) return;

    this.ensureEmitters(obj);
    if (this.emitterNodes.length === 0) return;

    this.running = true;
    this.spawnBurst();

    if (!this.pointLight) {
      this.pointLight = new THREE.PointLight(0xffaa55, 6, 22, 0.8);
      obj.add(this.pointLight);
    }

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  deactivate(target: IActionUser, _context?: ActionContext): void {
    const obj = target.objs;

    this.running = false;
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);

    this.clearParticles(this.fires);
    this.clearParticles(this.smokes);
    this.clearParticles(this.debris);

    if (obj) {
      this.emitterNodes.forEach(node => obj.remove(node));
      if (this.pointLight) {
        obj.remove(this.pointLight);
        this.pointLight = undefined;
      }
    }

    this.emitterNodes = [];
  }

  update(delta: number): void {
    if (!this.running || this.emitterNodes.length === 0) return;

    const worldPos = new THREE.Vector3();
    for (const node of this.emitterNodes) {
      node.getWorldPosition(worldPos);
      if (Math.random() < this.fireIntensity * delta * 60) this.spawnFire(worldPos);
      if (Math.random() < this.smokeIntensity * delta * 60) this.spawnSmoke(worldPos);
      if (Math.random() < this.debrisIntensity * delta * 40) this.spawnDebris(worldPos);
    }

    this.updateParticles(this.fires, particle => {
      const sprite = particle.mesh as THREE.Sprite;
      sprite.position.add(particle.velocity.clone().multiplyScalar(delta * 60));
      const s = particle.life * this.flameScale * 1.3;
      sprite.scale.set(s, s, 1);
      (sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, particle.life * 1.5);
    });

    this.updateParticles(this.smokes, particle => {
      const sprite = particle.mesh as THREE.Sprite;
      sprite.position.add(particle.velocity.clone().multiplyScalar(delta * 60));
      const s = (1.8 - particle.life) * this.smokeScale * 1.6;
      sprite.scale.set(s, s, 1);
      (sprite.material as THREE.SpriteMaterial).opacity = particle.life * 0.6;
    });

    this.updateParticles(this.debris, particle => {
      const mesh = particle.mesh as THREE.Mesh;
      mesh.position.add(particle.velocity.clone().multiplyScalar(delta * 60));
      mesh.rotation.x += (particle.rotSpeed?.x ?? 0) * delta * 60;
      mesh.rotation.y += (particle.rotSpeed?.y ?? 0) * delta * 60;
      mesh.rotation.z += (particle.rotSpeed?.z ?? 0) * delta * 60;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = Math.min(1, particle.life * 3);
    });
  }

  private ensureEmitters(obj: THREE.Object3D): void {
    if (this.emitterNodes.length > 0) return;

    const meshes: THREE.Mesh[] = [];
    obj.traverse(child => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });
    if (meshes.length === 0) return;

    obj.updateWorldMatrix(true, true);
    const objInvWorld = new THREE.Matrix4().copy(obj.matrixWorld).invert();

    const sampled = this.sampleSurface(meshes, objInvWorld, this.sampleCount);
    for (const localPos of sampled) {
      const node = new THREE.Object3D();
      node.position.copy(localPos);
      obj.add(node);
      this.emitterNodes.push(node);
    }
  }

  private sampleSurface(meshes: THREE.Mesh[], objInvWorld: THREE.Matrix4, count: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const perMesh = Math.max(1, Math.ceil(count / meshes.length));
    const samplePos = new THREE.Vector3();
    const worldPos = new THREE.Vector3();

    for (const mesh of meshes) {
      if (!mesh.geometry) continue;
      try {
        const sampler = new MeshSurfaceSampler(mesh).build();
        for (let i = 0; i < perMesh && positions.length < count; i++) {
          sampler.sample(samplePos);
          worldPos.copy(samplePos).applyMatrix4(mesh.matrixWorld).applyMatrix4(objInvWorld);
          positions.push(worldPos.clone());
        }
      } catch {
        // 샘플링이 불가능한 메시를 건너뜀
      }
    }

    return positions;
  }

  private spawnBurst(): void {
    const worldPos = new THREE.Vector3();
    this.emitterNodes.forEach(node => {
      node.getWorldPosition(worldPos);
      for (let i = 0; i < this.burstFireCount; i++) this.spawnFire(worldPos, 2.5);
      for (let i = 0; i < this.burstSmokeCount; i++) this.spawnSmoke(worldPos);
      for (let i = 0; i < this.burstDebrisCount; i++) this.spawnDebris(worldPos, 2.8);
    });
  }

  private spawnFire(pos: THREE.Vector3, speedMult = 1): void {
    const mat = new THREE.SpriteMaterial({
      map: this.fireTex,
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos).add(this.randomVec(2.5));
    sprite.scale.set(this.flameScale, this.flameScale, 1);
    this.scene.add(sprite);

    this.fires.push({
      mesh: sprite,
      life: 1,
      decay: 0.02 + Math.random() * 0.04,
      velocity: this.randomVec(0.8).multiplyScalar(speedMult).add(new THREE.Vector3(0, 0.03, 0)),
    });
  }

  private spawnSmoke(pos: THREE.Vector3): void {
    const mat = new THREE.SpriteMaterial({ map: this.smokeTex, transparent: true, opacity: 0.6 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(pos).add(this.randomVec(4));
    sprite.scale.set(this.smokeScale, this.smokeScale, 1);
    this.scene.add(sprite);

    this.smokes.push({
      mesh: sprite,
      life: 1,
      decay: 0.01 + Math.random() * 0.02,
      velocity: this.randomVec(0.35).add(new THREE.Vector3(0, 0.04, 0)),
    });
  }

  private spawnDebris(pos: THREE.Vector3, speedMult = 1): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.7,
      metalness: 0.6,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(this.debrisGeo, mat);
    mesh.position.copy(pos);
    const scale = (0.4 + Math.random() * 1.6) * this.debrisScale;
    mesh.scale.set(scale, scale, scale);
    this.scene.add(mesh);

    this.debris.push({
      mesh,
      life: 1,
      decay: 0.007 + Math.random() * 0.015,
      velocity: this.randomVec(3.5).multiplyScalar(speedMult),
      rotSpeed: new THREE.Vector3(Math.random() * 0.25, Math.random() * 0.25, Math.random() * 0.25),
    });
  }

  private updateParticles(particles: DamageParticle[], updateAlive: (particle: DamageParticle) => void): void {
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.life -= particle.decay;
      if (particle.life <= 0) {
        this.disposeParticle(particle);
        particles.splice(i, 1);
        continue;
      }
      updateAlive(particle);
    }
  }

  private clearParticles(particles: DamageParticle[]): void {
    particles.forEach(p => this.disposeParticle(p));
    particles.length = 0;
  }

  private disposeParticle(particle: DamageParticle): void {
    this.scene.remove(particle.mesh);
    const mesh = particle.mesh as THREE.Mesh;
    if ((mesh as THREE.Sprite).isSprite) {
      (mesh.material as THREE.SpriteMaterial).dispose();
      return;
    }
    if (mesh.material) (mesh.material as THREE.Material).dispose();
  }

  private randomVec(scale: number): THREE.Vector3 {
    return new THREE.Vector3(
      (Math.random() - 0.5) * scale,
      (Math.random() - 0.5) * scale,
      (Math.random() - 0.5) * scale,
    );
  }

  private createGradientTexture(colorStops: Array<{ pos: number; color: string }>): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    colorStops.forEach(stop => gradient.addColorStop(stop.pos, stop.color));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }
}
