// SparkSystem.ts — Black-Myth style sparks (Hot → Drift → Ash)
// • Instanced billboarded streaks; emission modes: current / radial360 / narrowCone
// • External dependencies: three (r150+ recommended)
// • External objects are injected by the host app (camera, renderer, composer, etc.)
//
// Usage (sketch):
//   import * as THREE from 'three';
//   import { SparkSystem, SparkParams, EmissionMode } from './SparkSystem';
//   const sparks = new SparkSystem(2600, {/* optional params override */});
//   scene.add(sparks);
//   function loop(dt:number){
//     // update returns whether any particle is active (true) or idle (false)
//     if (!sparks.update(dt, camera)) {
//       // optional: stop calling update until you spawn again
//     }
//   }
//   // Spawn a burst at a contact point with a surface normal
//   sparks.spawnBurst(contact, normal);

import { IEffect } from '@Glibs/interface/ieffector';
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import * as THREE from 'three';

export class SparkVfx implements IEffect, ILoop {
  LoopId: number = 0;
  obj = new THREE.Group()
  sparks: SparkSystem
  get Mesh() { return this.obj }
  constructor(
    eventCtrl: IEventController,
    scene: THREE.Scene,
    private camera: THREE.Camera
  ) {
    this.sparks = new SparkSystem(2600, {
      ...defaultSparkParams,
      emissionMode: EmissionMode.Radial360,
    });

    this.obj.add(this.sparks)
    eventCtrl.SendEventMessage(EventTypes.SetGlow, this.sparks)
    eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    scene.add(this.obj)
  }

  Start(pos: THREE.Vector3, surfaceNormal: THREE.Vector3, opts: Partial<SpawnOptions> = {}): void {
    // this.sparks.spawnBurst(pos, surfaceNormal);
    // 필요 시 개별 옵션:
    this.sparks.spawnBurst(pos, surfaceNormal, { count: 40, power: 10, chunkRatio: 0.05, ...opts });

  }
  update(delta: number): void {
    this.sparks.update(delta, this.camera);
  }
  Update(delta: number, ...arg: any): void {
    this.sparks.update(delta, this.camera);
  }
  Complete(): void {

  }
}



/* ----------------------------- Public Types ------------------------------ */
export enum EmissionMode {
  Current = 'current',
  Radial360 = 'radial360',
  NarrowCone = 'narrowCone',
}

export interface SparkParams {
  // spawn
  count: number;          // default particle count per burst
  power: number;          // initial speed scale
  chunkRatio: number;     // heavy streak ratio [0..1]
  // emission
  emissionMode: EmissionMode;
  coneAngleDeg: number;   // for NarrowCone
  coneYawDeg: number;     // degrees
  conePitchDeg: number;   // degrees
  // hot physics
  gravityY: number;
  dragHot: number;        // per-frame (60fps) multiplicative drag ~ [0.9..0.999]
  bounce: number;         // vertical energy retain on ground hit
  // convert to drift
  convertLifeAt: number;  // t in [0..1] threshold to become drift
  speedToDrift: number;   // if |v| <= this → eligible to drift
  convertProb: number;    // probability when eligible
  // drift flow
  flowStrength: number;
  flowFreq: number;
  flowSpeed: number;
  flowBlend: number;      // 0..1 lerp into flow
  dragDrift: number;
  updraft: number;
  // fade & ash
  driftDuration: number;  // seconds (per-particle jittered)
  ashWindow: number;      // last fraction of drift during which alpha collapses
  // look
  spriteScale: number;    // overall disk/quad scale
  lengthMulHot: number;
  lengthMulDrift: number;
}

export interface SpawnOptions {
  count: number;
  power: number;
  chunkRatio: number;
}

export const defaultSparkParams: SparkParams = {
  // spawn
  count: 260,
  power: 8.0,
  chunkRatio: 0.18,
  // emission
  emissionMode: EmissionMode.Radial360,
  coneAngleDeg: 20,
  coneYawDeg: 0,
  conePitchDeg: 0,
  // hot physics
  gravityY: -12.0,
  dragHot: 0.985,
  bounce: 0.45,
  // convert to drift
  convertLifeAt: 0.55,
  speedToDrift: 1.6,
  convertProb: 0.6,
  // drift flow
  flowStrength: 1.2,
  flowFreq: 0.9,
  flowSpeed: 1.0,
  flowBlend: 0.20,
  dragDrift: 0.9985,
  updraft: 0.25,
  // fade & ash
  driftDuration: 0.9,
  ashWindow: 0.12,
  // look
  spriteScale: 0.30,
  lengthMulHot: 1.0,
  lengthMulDrift: 0.45,
};

/* --------------------------- Internal Utilities -------------------------- */
function randUnitVector(): THREE.Vector3 {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const z = 2 * v - 1; // [-1,1]
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  return new THREE.Vector3(r * Math.cos(theta), z, r * Math.sin(theta));
}

function randomHemisphere(n: THREE.Vector3, rough = 0.3): THREE.Vector3 {
  let v = randUnitVector();
  if (v.dot(n) < 0) v.multiplyScalar(-1);
  v.addScaledVector(n, 1 + Math.random() * 2).normalize();
  v.x += (Math.random() - 0.5) * rough;
  v.y += (Math.random() - 0.5) * rough;
  v.z += (Math.random() - 0.5) * rough;
  return v.normalize();
}

function sampleCone(dir: THREE.Vector3, halfAngleDeg: number): THREE.Vector3 {
  const half = THREE.MathUtils.degToRad(halfAngleDeg);
  const cosHalf = Math.cos(half);
  const u = Math.random();
  const v = Math.random();
  const cosTheta = THREE.MathUtils.lerp(cosHalf, 1.0, u);
  const sinTheta = Math.sqrt(1 - cosTheta * cosTheta);
  const phi = 2 * Math.PI * v;
  const local = new THREE.Vector3(
    Math.cos(phi) * sinTheta,
    Math.sin(phi) * sinTheta,
    cosTheta,
  );
  const z = dir.clone().normalize();
  let x = new THREE.Vector3(0, 1, 0).cross(z);
  if (x.lengthSq() < 1e-6) x = new THREE.Vector3(1, 0, 0).cross(z);
  x.normalize();
  const y = z.clone().cross(x).normalize();
  return new THREE.Vector3().addScaledVector(x, local.x).addScaledVector(y, local.y).addScaledVector(z, local.z).normalize();
}

function yawPitchToDir(yawDeg: number, pitchDeg: number): THREE.Vector3 {
  const yaw = THREE.MathUtils.degToRad(yawDeg);
  const pitch = THREE.MathUtils.degToRad(pitchDeg);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  return new THREE.Vector3(cp * sy, sp, cp * cy).normalize();
}

/* ------------------------------ SparkSystem ------------------------------ */
export class SparkSystem extends THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial> {
  public readonly max: number;
  public params: SparkParams;
  public groundY = 0.01; // world y of the floor plane
  public autoHideWhenIdle = true; // set visible=false when no particles alive

  private alive: Uint8Array;
  private pos: Float32Array; // aOffset
  private vel: Float32Array; // aVel
  private life: Float32Array; // aLife
  private maxL: Float32Array; // aMax
  private size: Float32Array; // aSize
  private seed: Float32Array; // aSeed
  private typeArr: Float32Array; // aType (0 normal, 1 chunk)
  private mode: Float32Array; // aMode (0 hot, 1 drift)
  private cool: Float32Array; // aCool (0..1 drift progress)
  private driftSeconds: Float32Array; // per-particle drift duration (seconds)

  private time = 0; // seconds
  private dirty = false; // whether GPU buffers need flagging

  // Active set (dense) and freelist for O(1) spawn/kill
  private activeIdx: Int32Array;
  private activeCount = 0;
  private freeStack: Int32Array;
  private freeTop = 0; // stack size pointer

  // internal reuse
  private _tmpDir = new THREE.Vector3();

  constructor(max = 2600, params: Partial<SparkParams> = {}) {
    const base = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    const g = new THREE.InstancedBufferGeometry();
    g.index = null;
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('uv', base.getAttribute('uv'));

    // attributes
    const aOffset = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    const aVel = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    const aLife = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    const aMax = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    const aSize = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    const aSeed = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    const aType = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    const aMode = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    const aCool = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);

    g.setAttribute('aOffset', aOffset);
    g.setAttribute('aVel', aVel);
    g.setAttribute('aLife', aLife);
    g.setAttribute('aMax', aMax);
    g.setAttribute('aSize', aSize);
    g.setAttribute('aSeed', aSeed);
    g.setAttribute('aType', aType);
    g.setAttribute('aMode', aMode);
    g.setAttribute('aCool', aCool);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uCamRight: { value: new THREE.Vector3() },
        uCamUp: { value: new THREE.Vector3() },
        uGlow: { value: 1.25 },
        uLenHot: { value: 1.0 },
        uLenDrift: { value: 0.45 },
        uAshWindow: { value: 0.12 },
        uSpriteScale: { value: 0.75 },
      },
      vertexShader: /* glsl */`
        precision highp float;
        attribute vec3 aOffset, aVel;
        attribute float aLife, aMax, aSize, aSeed, aType, aMode, aCool;
        varying float vT, vSpeed, vType, vMode, vCool;
        varying vec2 vUv;
        uniform vec3 uCamRight, uCamUp;
        uniform float uLenHot, uLenDrift, uSpriteScale;
        void main(){
          vUv = uv;
          vMode = aMode; vCool = aCool; vType = aType;
          vT = clamp(aLife / aMax, 0.0, 1.0);
          vec3 vel = aVel; float speed = length(vel); vSpeed = speed;

          vec3 right = normalize(uCamRight);
          vec3 up    = normalize(uCamUp);
          float lenMul = mix(uLenHot, uLenDrift, vMode);
          float typeMul = mix(1.0, 1.8, aType);

          float width  = aSize * (1.0 - vT*0.7) * typeMul * uSpriteScale;
          float length = aSize * (2.0 + speed * 0.045) * (1.0 - vT*0.6) * typeMul * lenMul * uSpriteScale;

          vec2 q = (uv - 0.5);
          vec3 billboard = right * (q.x * width) + up * (q.y * width);
          vec3 velDir = speed > 1e-5 ? vel / max(speed, 1e-5) : vec3(0.0,1.0,0.0);
          billboard += velDir * (q.y * length);

          vec3 pos = aOffset + billboard;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        varying float vT, vSpeed, vType, vMode, vCool;
        varying vec2 vUv;
        uniform float uGlow, uAshWindow;

        vec3 heatRamp(float t){
          if(t < 0.2){
            float k = smoothstep(0.0, 0.2, t);
            return mix(vec3(1.0,1.0,1.0), vec3(1.0,0.9,0.4), k);
          } else if(t < 0.5){
            float k = smoothstep(0.2, 0.5, t);
            return mix(vec3(1.0,0.9,0.4), vec3(1.0,0.6,0.2), k);
          } else if(t < 0.8){
            float k = smoothstep(0.5, 0.8, t);
            return mix(vec3(1.0,0.6,0.2), vec3(0.9,0.25,0.1), k);
          } else {
            float k = smoothstep(0.8, 1.0, t);
            return mix(vec3(0.9,0.25,0.1), vec3(0.15,0.15,0.16), k);
          }
        }

        void main(){
          vec2 p = (vUv - 0.5) * 2.0;
          float d = length(p);
          float disk = smoothstep(1.0, 0.0, d);

          vec3 hotCol = heatRamp(vT) * mix(1.0, 1.3, vType);
          float glow = clamp(vSpeed * 0.02, 0.0, 1.0);
          hotCol *= (1.0 + glow * 1.25);

          float ashPhase = smoothstep(1.0 - uAshWindow, 1.0, vCool);
          vec3 ashCol = mix(vec3(0.32,0.32,0.34), vec3(0.18,0.18,0.20), ashPhase);
          vec3 driftCol = mix(hotCol, ashCol, ashPhase);
          vec3 col = mix(hotCol, driftCol, vMode);

          float hotA = (1.0 - vT);
          float driftA = 0.9 * (1.0 - ashPhase);
          float alpha = disk * mix(hotA, driftA, vMode);

          if(alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });

    super(g, mat);
    this.frustumCulled = false;
    this.visible = false; // idle by default

    this.max = max;
    this.params = { ...defaultSparkParams, ...params };

    // direct views on attribute storage
    this.alive = new Uint8Array(max);
    this.pos = (g.getAttribute('aOffset') as THREE.InstancedBufferAttribute).array as Float32Array;
    this.vel = (g.getAttribute('aVel') as THREE.InstancedBufferAttribute).array as Float32Array;
    this.life = (g.getAttribute('aLife') as THREE.InstancedBufferAttribute).array as Float32Array;
    this.maxL = (g.getAttribute('aMax') as THREE.InstancedBufferAttribute).array as Float32Array;
    this.size = (g.getAttribute('aSize') as THREE.InstancedBufferAttribute).array as Float32Array;
    this.seed = (g.getAttribute('aSeed') as THREE.InstancedBufferAttribute).array as Float32Array;
    this.typeArr = (g.getAttribute('aType') as THREE.InstancedBufferAttribute).array as Float32Array;
    this.mode = (g.getAttribute('aMode') as THREE.InstancedBufferAttribute).array as Float32Array;
    this.cool = (g.getAttribute('aCool') as THREE.InstancedBufferAttribute).array as Float32Array;

    this.driftSeconds = new Float32Array(max);

    // active set + freelist
    this.activeIdx = new Int32Array(max);
    this.freeStack = new Int32Array(max);
    // initialize freelist with [0..max-1]
    for (let i = 0; i < max; i++) this.freeStack[i] = i;
    this.freeTop = max; // size
  }

  /** Update per-frame physics + shader uniforms. Returns true if active. */
  update(dt: number, cam: THREE.Camera): boolean {
    // Fast O(1) early-out when idle
    if (this.activeCount === 0) {
      if (this.autoHideWhenIdle) this.visible = false;
      return false;
    }

    const p = this.params;

    // advance time once
    this.time += dt;

    // uniforms (only when active)
    cam.updateMatrixWorld();
    this.material.uniforms.uCamRight.value.setFromMatrixColumn((cam as any).matrixWorld, 0);
    this.material.uniforms.uCamUp.value.setFromMatrixColumn((cam as any).matrixWorld, 1);
    this.material.uniforms.uLenHot.value = p.lengthMulHot;
    this.material.uniforms.uLenDrift.value = p.lengthMulDrift;
    this.material.uniforms.uAshWindow.value = p.ashWindow;
    this.material.uniforms.uSpriteScale.value = p.spriteScale;

    const dragHotPow = Math.pow(p.dragHot, dt * 60.0);
    const dragDriftPow = Math.pow(p.dragDrift, dt * 60.0);

    // iterate only alive particles via dense active list
    for (let k = 0; k < this.activeCount; k++) {
      const i = this.activeIdx[k];

      let lx = (this.life[i] += dt);
      const maxL = this.maxL[i];
      const t = lx / Math.max(1e-6, maxL);

      let vx = this.vel[i * 3 + 0];
      let vy = this.vel[i * 3 + 1];
      let vz = this.vel[i * 3 + 2];

      if (this.mode[i] < 0.5) {
        // HOT
        const speed = Math.hypot(vx, vy, vz);
        if ((t >= p.convertLifeAt || speed <= p.speedToDrift) && Math.random() < p.convertProb) {
          this.mode[i] = 1; this.cool[i] = 0;
        }

        vy += p.gravityY * dt;
        vx *= dragHotPow; vy *= dragHotPow; vz *= dragHotPow;

        let px = this.pos[i * 3 + 0] + vx * dt;
        let py = this.pos[i * 3 + 1] + vy * dt;
        let pz = this.pos[i * 3 + 2] + vz * dt;

        if (py < this.groundY) {
          py = this.groundY;
          vy = Math.abs(vy) * p.bounce;
          vx *= 0.6; vz *= 0.6;
        }

        this.pos[i * 3 + 0] = px; this.pos[i * 3 + 1] = py; this.pos[i * 3 + 2] = pz;
        this.vel[i * 3 + 0] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;

        if (lx >= maxL && this.mode[i] < 0.5) { this.mode[i] = 1; this.cool[i] = 0; }
      } else {
        // DRIFT (flow field)
        const s = this.seed[i];
        const f = p.flowFreq, w = p.flowSpeed, A = p.flowStrength;
        const px = this.pos[i * 3 + 0];
        const py = this.pos[i * 3 + 1];
        const pz = this.pos[i * 3 + 2];
        const time = this.time;

        const fx = Math.sin((py + s * 5.0) * f + time * w) +
          Math.cos((pz - s * 3.7) * f - time * (w * 1.2));
        const fy = Math.sin((pz + s * 4.2) * f + time * (w * 0.8)) -
          Math.cos((px + s * 2.9) * f - time * w);
        const fz = Math.sin((px - s * 6.1) * f - time * (w * 1.1)) -
          Math.cos((py + s * 3.3) * f + time * w);

        vx = THREE.MathUtils.lerp(vx, fx * A, p.flowBlend);
        vy = THREE.MathUtils.lerp(vy, fy * A + p.updraft, p.flowBlend);
        vz = THREE.MathUtils.lerp(vz, fz * A, p.flowBlend);

        vx *= dragDriftPow; vy *= dragDriftPow; vz *= dragDriftPow;

        let nx = px + vx * dt;
        let ny = py + vy * dt;
        let nz = pz + vz * dt;

        if (ny < this.groundY) { ny = this.groundY; vy = Math.abs(vy) * 0.15; vx *= 0.5; vz *= 0.5; }

        this.pos[i * 3 + 0] = nx; this.pos[i * 3 + 1] = ny; this.pos[i * 3 + 2] = nz;
        this.vel[i * 3 + 0] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;

        const dur = this.driftSeconds[i] || p.driftDuration;
        const inc = dt / Math.max(0.0001, dur);
        this.cool[i] = Math.min(1.0, this.cool[i] + inc);
        if (this.cool[i] >= 1.0) {
          // kill: free slot + remove from active set (swap-with-last)
          this.alive[i] = 0;
          this._free(i);
          k = this._removeActiveAt(k); // stay at the same index to process the swapped element
          continue;
        }
      }

      this.dirty = true;
    }

    if (this.dirty) this._flag();
    if (this.autoHideWhenIdle) this.visible = this.activeCount > 0;
    return this.activeCount > 0;
  }

  /** Spawn a burst at center with (approximate) surface normal. */
  spawnBurst(center: THREE.Vector3, normal: THREE.Vector3, opts: Partial<SpawnOptions> = {}): void {
    const p = this.params;
    const count = opts.count ?? p.count;
    const power = opts.power ?? p.power;
    const chunkRatio = opts.chunkRatio ?? p.chunkRatio;

    // base direction for cone mode
    let baseDir = this._tmpDir.copy(normal).normalize();
    if (p.emissionMode === EmissionMode.Radial360) {
      baseDir.set(0, 1, 0); // placeholder
    } else if (p.emissionMode === EmissionMode.NarrowCone) {
      baseDir = yawPitchToDir(p.coneYawDeg, p.conePitchDeg);
    }

    for (let i = 0; i < count; i++) {
      const idx = this._alloc(); if (idx < 0) break;
      const isChunk = Math.random() < chunkRatio ? 1 : 0;

      // direction sampling by mode
      let dir: THREE.Vector3;
      if (p.emissionMode === EmissionMode.Current) {
        dir = randomHemisphere(normal, 0.25);
      } else if (p.emissionMode === EmissionMode.Radial360) {
        dir = randUnitVector();
      } else { // NarrowCone
        dir = sampleCone(baseDir, p.coneAngleDeg);
      }

      const spd = power * (0.8 + Math.random() * 0.8) * (1.0 + (i / Math.max(1, count)) * 0.6) * (isChunk ? 1.2 : 1.0);
      const v = dir.multiplyScalar(spd);

      const jitter = (Math.random() - 0.5) * 0.02;
      this.pos[idx * 3 + 0] = center.x + jitter;
      this.pos[idx * 3 + 1] = center.y + jitter;
      this.pos[idx * 3 + 2] = center.z + jitter;

      this.vel[idx * 3 + 0] = v.x; this.vel[idx * 3 + 1] = v.y + Math.random() * 1.0; this.vel[idx * 3 + 2] = v.z;
      this.life[idx] = 0;
      this.maxL[idx] = (isChunk ? 1.2 : 0.6) + Math.random() * (isChunk ? 0.6 : 0.4);
      this.size[idx] = (isChunk ? 0.12 : 0.06) + Math.random() * (isChunk ? 0.12 : 0.08);
      this.seed[idx] = Math.random();
      this.typeArr[idx] = isChunk;
      this.mode[idx] = 0; // hot
      this.cool[idx] = 0;
      this.driftSeconds[idx] = p.driftDuration * (0.8 + Math.random() * 0.4);
      this.alive[idx] = 1;

      // add to active set
      this.activeIdx[this.activeCount++] = idx;
      this.dirty = true;
    }

    if (this.autoHideWhenIdle && this.activeCount > 0) this.visible = true;
    if (this.dirty) this._flag();
  }

  /** Replace parameters at runtime (shallow merge). */
  setParams(next: Partial<SparkParams>): void { this.params = { ...this.params, ...next }; }

  /** Adjust ground Y (floor plane height). */
  setGroundY(y: number): void { this.groundY = y; }

  /** Alive count & activity helpers. */
  getAliveCount(): number { return this.activeCount; }
  isActive(): boolean { return this.activeCount > 0; }

  /** Dispose GPU resources. */
  dispose(): void { this.geometry.dispose(); this.material.dispose(); }

  /* --------------------------- Internal Helpers -------------------------- */
  private _flag(): void {
    const g = this.geometry;
    (g.getAttribute('aOffset') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aVel') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aLife') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aMax') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aSize') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aSeed') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aType') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aMode') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aCool') as THREE.InstancedBufferAttribute).needsUpdate = true;
    this.dirty = false;
  }

  private _alloc(): number {
    if (this.freeTop <= 0) return -1; // out of slots
    return this.freeStack[--this.freeTop];
  }

  private _free(idx: number): void {
    this.freeStack[this.freeTop++] = idx;
  }

  // Remove active index at position k by swapping with last. Returns new k to continue.
  private _removeActiveAt(k: number): number {
    const last = this.activeCount - 1;
    if (k < last) this.activeIdx[k] = this.activeIdx[last];
    this.activeCount = last;
    return k - 1; // so the caller's for-loop stays on the swapped element
  }
}
