// StunStars.ts
// Three.js "stun star" effect as a self-contained module.
// - No ownership of renderer/camera/scene: caller injects a parent (scene or group) and target.
// - Public API: start(), stop(), update(dt), setTarget(...), setParams(...), dispose().

import * as THREE from "three";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export class StunStarsAction implements IActionComponent, ILoop {
    LoopId: number = 0
    id = "stunstars"
    stunstarts?: StunStars
    constructor(
        private eventCtrl: IEventController,
        private scene: THREE.Scene,
    ) { }

    activate(target: IActionUser, context?: ActionContext | undefined): void {
        const obj = target.objs
        if (!obj) return
        if (!this.stunstarts) this.stunstarts = new StunStars({ ...context?.param, parent: this.scene, target: obj })
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        this.stunstarts.start() 
    }
    deactivate(target: IActionUser, context?: ActionContext | undefined): void {
        const obj = target.objs
        if (!obj) return
        this.stunstarts?.stop()
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    }
    update(delta: number): void {
        this.stunstarts!.update(delta)
    }
}
export interface RingParams {
  enabled?: boolean;      // default true
  count?: number;         // 0~3 (default 2)
  opacity?: number;       // 0~1 (default 0.26)
  radiusMult?: number;    // relative to star radius (default 1.0)
  spinMult?: number;      // relative to angularSpeed (default 0.6)
  pulseAmp?: number;      // 0~ (default 0.05)
  pulseSpeed?: number;    // (default 2.2)
  segments?: number;      // line segments (default 64)
}

export interface StunStarsParams {
  // orbiting stars
  count?: number;         // number of stars (default 6)
  radius?: number;        // orbit radius (default 0.8)
  height?: number;        // Y offset above target (default 2.55)
  angularSpeed?: number;  // rad/sec (default 2.4)
  spinSpeed?: number;     // sprite self-rotation (default 4.5)
  bobAmp?: number;        // vertical bob amplitude (default 0.15)
  bobSpeed?: number;      // vertical bob speed (default 3.2)
  scale?: number;         // sprite size (default 0.5)
  duration?: number;      // effect duration (default 1.8)
  fadeIn?: number;        // fade in seconds (default 0.18)
  fadeOut?: number;       // fade out seconds (default 0.28)
  randomTilt?: number;    // random plane tilt (default 0.35)
  clockwise?: boolean;    // default true

  rings?: RingParams;     // faint line rings around orbit plane
}

export interface StunStarsOptions extends StunStarsParams {
  parent: THREE.Object3D;          // scene or any group to which effect nodes are added
  target: THREE.Object3D;          // the character root or head object
  spriteTexture?: THREE.Texture;   // optional: inject preloaded/cached star texture
}

type SpriteList = THREE.Sprite[];
type RingList = THREE.LineSegments[];

const DEFAULTS: Required<Omit<StunStarsParams, "rings">> = {
  count: 6,
  radius: 0.8,
  height: 2.55,
  angularSpeed: 2.4,
  spinSpeed: 4.5,
  bobAmp: 0.15,
  bobSpeed: 3.2,
  scale: 0.5,
  duration: 10,
  fadeIn: 0.18,
  fadeOut: 0.28,
  randomTilt: 0.35,
  clockwise: true,
};

const DEFAULT_RINGS: Required<RingParams> = {
  enabled: true,
  count: 2,
  opacity: 0.26,
  radiusMult: 1.0,
  spinMult: 0.6,
  pulseAmp: 0.05,
  pulseSpeed: 2.2,
  segments: 64,
};

// Small, warm star SVG texture (data URL).
function makeDefaultStarTexture(): THREE.Texture {
  const starSVG = `
<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>
  <defs>
    <radialGradient id='g' cx='50%' cy='50%' r='50%'>
      <stop offset='0%' stop-color='#fff9b1' />
      <stop offset='60%' stop-color='#ffd74a' />
      <stop offset='100%' stop-color='#ffb300' />
    </radialGradient>
    <filter id='glow' x='-50%' y='-50%' width='200%' height='200%'>
      <feGaussianBlur stdDeviation='1.5' result='b'/>
      <feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge>
    </filter>
  </defs>
  <polygon filter='url(#glow)' points='32,6 38,24 58,24 41,36 46,56 32,44 18,56 23,36 6,24 26,24'
           fill='url(#g)' stroke='#fff4a0' stroke-width='1.2' />
</svg>`;
  const url = "data:image/svg+xml;utf8," + encodeURIComponent(starSVG);
  const tex = new THREE.TextureLoader().load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

function makeSpriteMaterial(tex: THREE.Texture, opacity = 1): THREE.SpriteMaterial {
  return new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    opacity
  });
}

export class StunStars {
  private parent: THREE.Object3D;
  private target: THREE.Object3D;

  private params: Required<Omit<StunStarsParams, "rings">> & { rings: Required<RingParams> };

  private sprites: SpriteList = [];
  private ringGroup: THREE.Group | null = null;
  private rings: RingList = [];

  private starTexture: THREE.Texture;
  private tiltQuat = new THREE.Quaternion();

  private _time = 0;
  private _alive = false;

  // scratch
  private _worldPos = new THREE.Vector3();
  private _tmpEuler = new THREE.Euler();

  constructor(opts: StunStarsOptions) {
    this.parent = opts.parent;
    this.target = opts.target;
    // params
    this.params = {
      ...DEFAULTS,
      ...opts,
      rings: { ...DEFAULT_RINGS, ...(opts.rings ?? {}) }
    };

    // tilt (random for each instance)
    const tiltX = (Math.random() * 2 - 1) * this.params.randomTilt;
    const tiltZ = (Math.random() * 2 - 1) * this.params.randomTilt;
    this.tiltQuat.setFromEuler(new THREE.Euler(tiltX, 0, tiltZ));

    // texture (injected or default)
    this.starTexture = opts.spriteTexture ?? makeDefaultStarTexture();

    this.build();
    this.stop(); // start hidden
  }

  /** Build stars and (optionally) rings. */
  private build() {
    // Sprites
    for (let i = 0; i < this.params.count; i++) {
      const mat = makeSpriteMaterial(this.starTexture, 0.0);
      const sprite = new THREE.Sprite(mat);
      sprite.scale.setScalar(this.params.scale);
      sprite.renderOrder = 2;
      sprite.visible = true; // visibility managed by _alive flag & opacity
      this.sprites.push(sprite);
      this.parent.add(sprite);
    }

    // Rings
    if (this.params.rings.enabled && this.params.rings.count > 0) {
      this.ringGroup = new THREE.Group();
      this.parent.add(this.ringGroup);

      for (let i = 0; i < this.params.rings.count; i++) {
        const ring = this.createRing(i, this.params.rings.segments);
        this.ringGroup.add(ring);
        this.rings.push(ring);
      }
    }
  }

  private createRing(index: number, segments: number): THREE.LineSegments {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2.0;
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    // connect as segments (so linewidth-like illusion is a bit stronger with msaa)
    const idx = new Uint16Array(segments * 2);
    for (let j = 0; j < segments; j++) {
      idx[j * 2 + 0] = j;
      idx[j * 2 + 1] = (j + 1) % segments;
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));

    const mat = new THREE.LineBasicMaterial({
      color: 0xfff1a8,
      transparent: true,
      opacity: 0.0,
      depthTest: true,
      depthWrite: false,
    });

    const line = new THREE.LineSegments(geo, mat);
    (line as any).userData.phase = index / Math.max(1, this.params.rings.count);
    line.renderOrder = 1;
    return line;
  }

  /** Start (fade in, run until duration, then stop). */
  start() {
    this._time = 0;
    this._alive = true;
    // reset opacities
    for (const s of this.sprites) {
      s.material.opacity = 0.0;
    }
    if (this.ringGroup) {
      this.ringGroup.visible = this.params.rings.enabled;
      for (const r of this.rings) {
        (r.material as THREE.LineBasicMaterial).opacity = 0.0;
      }
    }
  }

  /** Immediately hide and freeze. */
  stop() {
    this._alive = false;
    // keep nodes in scene (cheap), but invisible
    for (const s of this.sprites) s.visible = false;
    if (this.ringGroup) this.ringGroup.visible = false;
  }

  /** Update animation. Call each frame with delta time (seconds). */
  update(dt: number) {
    if (!this._alive) return;

    const p = this.params;
    this._time += dt;

    // fade in/out
    let alpha = 1.0;
    if (this._time < p.fadeIn) {
      alpha = this._time / p.fadeIn;
    } else if (this._time > p.duration - p.fadeOut) {
      alpha = Math.max(0, (p.duration - this._time) / p.fadeOut);
    }

    // end of life
    if (this._time >= p.duration) {
      this.stop();
      return;
    }

    // base angle
    const dir = p.clockwise ? -1 : 1;
    const baseAngle = dir * p.angularSpeed * this._time;

    // head/world position
    this.target.getWorldPosition(this._worldPos);
    this._worldPos.y += p.height;

    // stars
    for (let i = 0; i < this.sprites.length; i++) {
      const sprite = this.sprites[i];
      sprite.visible = true;

      const phase = (i / this.sprites.length) * Math.PI * 2.0;
      const ang = baseAngle + phase;
      const bob = Math.sin(this._time * p.bobSpeed + phase) * p.bobAmp;

      const local = new THREE.Vector3(
        Math.cos(ang) * p.radius,
        bob,
        Math.sin(ang) * p.radius
      ).applyQuaternion(this.tiltQuat);

      sprite.position.copy(this._worldPos).add(local);
      (sprite.material as THREE.SpriteMaterial).rotation =
        (this._time * p.spinSpeed + phase) % (Math.PI * 2);
      (sprite.material as THREE.SpriteMaterial).opacity = alpha;
    }

    // rings
    if (this.ringGroup && p.rings.enabled) {
      // position and tilt
      const bobCenter = Math.sin(this._time * p.bobSpeed) * p.bobAmp;
      const centerOffset = new THREE.Vector3(0, bobCenter, 0).applyQuaternion(this.tiltQuat);
      this.ringGroup.position.copy(this._worldPos).add(centerOffset);

      this._tmpEuler.setFromQuaternion(this.tiltQuat);
      this.ringGroup.rotation.set(this._tmpEuler.x, this._tmpEuler.y, this._tmpEuler.z);

      // rotate over time
      this.ringGroup.rotateY(dir * p.angularSpeed * p.rings.spinMult * dt);

      const ringAlpha = alpha * p.rings.opacity;
      for (const line of this.rings) {
        const ph: number = (line as any).userData.phase || 0;
        const pulse = 1.0 + Math.sin(this._time * p.rings.pulseSpeed + ph * Math.PI * 2) * p.rings.pulseAmp;
        const rr = p.radius * p.rings.radiusMult * pulse;
        line.scale.set(rr, rr, rr);
        (line.material as THREE.LineBasicMaterial).opacity = ringAlpha;
        line.visible = true;
      }
      this.ringGroup.visible = true;
    }
  }

  /** Change the target Object3D (e.g., swap character). */
  setTarget(target: THREE.Object3D) {
    this.target = target;
  }

  /** Update some params at runtime (rebuilds meshes if structure changes). */
  setParams(partial: StunStarsParams) {
    const prev = this.params;
    this.params = {
      ...prev,
      ...partial,
      rings: { ...prev.rings, ...(partial.rings ?? {}) }
    };

    // If structural fields changed (counts), rebuild
    const needsRebuild =
      (partial.count !== undefined && partial.count !== prev.count) ||
      (partial.scale !== undefined && partial.scale !== prev.scale) ||
      (partial.rings?.count !== undefined && partial.rings.count !== prev.rings.count) ||
      (partial.rings?.enabled !== undefined && partial.rings.enabled !== prev.rings.enabled) ||
      (partial.rings?.segments !== undefined && partial.rings.segments !== prev.rings.segments);

    if (needsRebuild) {
      this.disposeNodes();
      this.build();
    } else {
      // non-structural updates that affect visuals immediately
      if (partial.scale !== undefined) {
        for (const s of this.sprites) s.scale.setScalar(this.params.scale);
      }
    }
  }

  /** Whether the effect is currently playing. */
  get isAlive(): boolean {
    return this._alive;
  }

  /** Remove all THREE objects and free GPU resources. */
  dispose() {
    this.disposeNodes(true);
  }

  private disposeNodes(removeTexture = false) {
    // sprites
    for (const s of this.sprites) {
      this.parent.remove(s);
      s.material.map?.dispose();
      s.material.dispose();
    }
    this.sprites.length = 0;

    // rings
    if (this.ringGroup) {
      for (const r of this.rings) {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      }
      this.rings.length = 0;
      this.parent.remove(this.ringGroup);
      this.ringGroup = null;
    }

    if (removeTexture && this.starTexture) {
      // If the texture was injected/shared, caller should own disposal.
      // We only dispose textures we created internally.
      // Heuristic: data URL default has no "image.src" (implementation-dependent). Skip disposing here by default.
    }
  }
}
