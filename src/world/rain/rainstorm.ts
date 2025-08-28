// RainStorm.ts
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';
import { SoundType } from '@Glibs/types/soundtypes';
import { IWorldMapObject, MapEntryType } from '@Glibs/types/worldmaptypes';
import * as THREE from 'three';

/* ------------------------------- Public Types ------------------------------ */
export type RainLightningDisplayMode = 'bolts+flash' | 'flash-only' | 'bolts-only';

export interface RainStormConfig {
  /** 지면 높이 (y) */
  groundY: number;

  // Rain
  rainSpeed: number;
  windX: number;
  windZ: number;

  // Splash lines
  splashEnabled: boolean;
  splash: {
    perHit: number;
    lifetime: number;
    speed: number;
    gravity: number;
    killSpeed: number;
    opacity: number;
  };

  // Ripples
  ripplesEnabled: boolean;
  ripple: {
    lifetime: number;
    minRadius: number;
    maxRadius: number;
    baseOpacity: number;
    fadePower: number;
  };

  // Droplets
  dropletsEnabled: boolean;
  droplet: {
    perHit: number;
    lifetime: number;
    speedXZ: number;
    speedY: number;
    gravity: number;
    size: number;
    opacity: number;
  };

  // Lightning
  lightningEnabled: boolean;
  lightning: {
    displayMode: RainLightningDisplayMode;

    strikesPerMin: number;
    flashIntensity: number;
    flashDuration: number;

    boltEnabled: boolean;
    boltColor: string;
    boltDuration: number;
    boltSegments: number;
    boltChaos: number;
    boltBranches: number;
    areaRadius: number;
    aroundCamera: boolean;

    // Staccato (blink)
    staccatoEnabled: boolean;
    staccatoCount: number;
    staccatoOn: number;
    staccatoOff: number;

    // Glow (sprite at strike)
    glowEnabled: boolean;
    glowColor: string;
    glowSize: number;
    glowOpacity: number;

    // Screen flash (DOM overlay)
    screenFlashEnabled: boolean;
    screenFlashColor: string;
    screenFlashMaxOpacity: number;
    screenFlashDuration: number;
    screenFlashEase: number;
  };
}

export interface RainStormCreateOptions {
  screenFlashContainer?: HTMLElement;  // 화면 플래시를 붙일 DOM (기본: document.body)
  config?: Partial<RainStormConfig>;
  autoStart?: boolean;                 // 내부 rAF 사용 (기본 true)
  typeValue?: MapEntryType;            // IWorldMapObject.Type에 넣을 값
}

/* -------------------------------- Constants -------------------------------- */
const NUM_RAINDROPS = 1000;
const RAIN_AREA_SIZE = 100;
const RAIN_HEIGHT = 100;
const LINE_LENGTH = 1.0;
const MAX_DELTA_TIME = 0.1;

const SPLASH_POOL_SIZE = 3000;
const RIPPLE_POOL_SIZE = 600;
const DROPLET_POOL_SIZE = 4000;

const HIDE_Y = -1e6;
const HEMI_BASE_INTENSITY = 0.15;

/* --------------------------------- Defaults -------------------------------- */
const DEFAULTS: RainStormConfig = {
  groundY: 0.2, // ★ 지면 높이 기본값

  rainSpeed: 0.5,
  windX: 0.0,
  windZ: 0.0,

  splashEnabled: true,
  splash: {
    perHit: 8,
    lifetime: 0.30,
    speed: 2.5,
    gravity: 12.0,
    killSpeed: 0.15,
    opacity: 0.85,
  },

  ripplesEnabled: true,
  ripple: {
    lifetime: 0.6,
    minRadius: 0.4,
    maxRadius: 2.2,
    baseOpacity: 0.45,
    fadePower: 1.6,
  },

  dropletsEnabled: true,
  droplet: {
    perHit: 20,
    lifetime: 0.45,
    speedXZ: 1.5,
    speedY: 1.0,
    gravity: 12.0,
    size: 0.12,
    opacity: 0.95,
  },

  lightningEnabled: true,
  lightning: {
    displayMode: 'bolts+flash',
    strikesPerMin: 6,
    flashIntensity: 2.0,
    flashDuration: 0.22,

    boltEnabled: true,
    boltColor: '#bfe8ff',
    boltDuration: 0.28,
    boltSegments: 24,
    boltChaos: 3.0,
    boltBranches: 2,
    areaRadius: 40,
    aroundCamera: false,

    staccatoEnabled: true,
    staccatoCount: 2,
    staccatoOn: 0.06,
    staccatoOff: 0.045,

    glowEnabled: true,
    glowColor: '#cfe7ff',
    glowSize: 6.0,
    glowOpacity: 0.9,

    screenFlashEnabled: true,
    screenFlashColor: '#ffffff',
    screenFlashMaxOpacity: 0.8,
    screenFlashDuration: 0.25,
    screenFlashEase: 1.3,
  },
};

/* -------------------------------- Utilities -------------------------------- */
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const deepMerge = (t: any, s: any) => {
  for (const k of Object.keys(s ?? {})) {
    if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
      t[k] ??= {};
      deepMerge(t[k], s[k]);
    } else {
      t[k] = s[k];
    }
  }
};
const expRand = (mean: number) => -mean * Math.log(1 - Math.random());
const boundRadius = () =>
  Math.sqrt((RAIN_AREA_SIZE * 0.1) ** 2 * 2 + (RAIN_HEIGHT ** 2));

/* -------------------------- Internal Lightning Type ------------------------ */
interface Bolt {
  group: THREE.Group;
  materials: THREE.LineBasicMaterial[];
  age: number;
  duration: number;
  // staccato
  staOn?: number;
  staOff?: number;
  staCnt?: number;
  staCycle?: number;
  staEnd?: number;
  // glow
  glowSprite?: THREE.Sprite;
  glowLife?: number;
}

/* ---------------------------------- Class ---------------------------------- */
export class RainStorm implements IWorldMapObject, ILoop {
  LoopId: number = 0
  public Mesh?: THREE.Object3D;
  Type: MapEntryType = MapEntryType.Rain;

  private cfg: RainStormConfig = clone(DEFAULTS);

  private autoStart = true;
  private clock = new THREE.Clock();
  private _raf = 0;

  // lights
  private hemi?: THREE.HemisphereLight;
  private flashTimer = 0;

  // rain
  private rain?: THREE.LineSegments;

  // splash
  private splash?: THREE.LineSegments;
  private splashPositions!: Float32Array;
  private splashVelocities!: Float32Array;
  private splashAges!: Float32Array;
  private splashActive!: Uint8Array;
  private splashWritePtr = 0;

  // ripple
  private rippleTex?: THREE.Texture;
  private rippleSprites: THREE.Sprite[] = [];
  private rippleActive = new Uint8Array(RIPPLE_POOL_SIZE);
  private rippleAges = new Float32Array(RIPPLE_POOL_SIZE);
  private rippleWritePtr = 0;

  // droplets
  private dropletTex?: THREE.Texture;
  private dropletPoints?: THREE.Points;
  private dropletPositions!: Float32Array;
  private dropletVelocities!: Float32Array;
  private dropletAges!: Float32Array;
  private dropletActive!: Uint8Array;
  private dropletWritePtr = 0;

  // glow texture
  private glowTex?: THREE.Texture;

  // lightning
  private lightningCountdown = 0;
  private activeBolts: Bolt[] = [];

  // screen flash DOM
  private overlayEl?: HTMLElement;
  private overlayActive = false;
  private overlayAge = 0;
  private overlayDur = 0;

  constructor(private scene: THREE.Scene, private camera: THREE.Camera, private eventCtrl: IEventController) {}

  /* ---------------------------------- Create --------------------------------- */
  public Create(opts: RainStormCreateOptions): this {
    this.autoStart = opts.autoStart ?? true;
    if (opts.typeValue) this.Type = opts.typeValue;
    if (opts.config) deepMerge(this.cfg, opts.config);

    const root = new THREE.Group();
    root.name = 'RainStormRoot';
    this.Mesh = root;
    this.scene.add(root);

    // ★ Flash용 헤미라이트
    this.hemi = new THREE.HemisphereLight(0xbfd7ff, 0x101216, HEMI_BASE_INTENSITY);
    this.hemi.position.set(0, 100, 0);
    root.add(this.hemi);

    // systems
    this.createRainLines(root);
    this.createSplashPool(root);

    this.rippleTex = this.makeRippleTexture();
    this.glowTex   = this.makeGlowTexture();
    this.dropletTex= this.makeCircleTexture();

    this.createRipplePool(root);
    this.createDropletPoints(root);

    // screen flash overlay
    if (typeof document !== 'undefined' && this.cfg.lightning.screenFlashEnabled) {
      const container = opts.screenFlashContainer ?? document.body;
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'fixed',
        inset: '0',
        background: this.cfg.lightning.screenFlashColor,
        opacity: '0',
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      } as CSSStyleDeclaration);
      container.appendChild(el);
      this.overlayEl = el;
    }

    this.scheduleNextLightning();

    if (this.autoStart) this.startLoop();
    return this;
  }

  /* ---------------------------------- Delete -------------------------------- */
  public Delete(): any {
    this.stopLoop();

    // overlay
    if (this.overlayEl?.parentElement) this.overlayEl.parentElement.removeChild(this.overlayEl);
    this.overlayEl = undefined;

    // bolts
    for (const bolt of this.activeBolts) {
      bolt.group.traverse((o: any) => {
        if (o.isLine) { o.geometry.dispose(); o.material.dispose(); }
      });
      this.Mesh?.remove(bolt.group);
      if (bolt.glowSprite) {
        this.Mesh?.remove(bolt.glowSprite);
        (bolt.glowSprite.material as THREE.Material).dispose();
      }
    }
    this.activeBolts.length = 0;

    // droplets
    if (this.dropletPoints) {
      (this.dropletPoints.geometry as THREE.BufferGeometry).dispose();
      (this.dropletPoints.material as THREE.Material).dispose();
      this.Mesh?.remove(this.dropletPoints);
      this.dropletPoints = undefined;
    }
    this.dropletTex?.dispose(); this.dropletTex = undefined;

    // ripples
    for (const s of this.rippleSprites) this.Mesh?.remove(s);
    this.rippleSprites.length = 0;
    this.rippleTex?.dispose(); this.rippleTex = undefined;

    // splash
    if (this.splash) {
      (this.splash.geometry as THREE.BufferGeometry).dispose();
      (this.splash.material as THREE.Material).dispose();
      this.Mesh?.remove(this.splash);
      this.splash = undefined;
    }

    // rain
    if (this.rain) {
      (this.rain.geometry as THREE.BufferGeometry).dispose();
      (this.rain.material as THREE.Material).dispose();
      this.Mesh?.remove(this.rain);
      this.rain = undefined;
    }

    // lights
    if (this.hemi) { this.Mesh?.remove(this.hemi); this.hemi = undefined; }

    // root
    if (this.Mesh) { this.scene.remove(this.Mesh); this.Mesh = undefined; }
  }

  /* ----------------------------------- Show ---------------------------------- */
  public Show(): void { if (this.Mesh) this.Mesh.visible = true; }

  /* ----------------------------------- Hide ---------------------------------- */
  public Hide(): void { if (this.Mesh) this.Mesh.visible = false; }

  /* ----------------------------------- Save ---------------------------------- */
  public Save(): any {
    return clone(this.cfg);
  }

  /* ----------------------------------- Load ---------------------------------- */
  public Load(data: any, callback?: Function): void {
    try {
      deepMerge(this.cfg, data);
      if (this.splash) (this.splash.material as THREE.LineBasicMaterial).opacity = this.cfg.splash.opacity;
      if (this.dropletPoints) (this.dropletPoints.material as THREE.PointsMaterial).size = this.cfg.droplet.size;
      if (this.overlayEl) this.overlayEl.style.background = this.cfg.lightning.screenFlashColor;

      // 바운딩 구 중심을 groundY로 재설정
      const r = boundRadius();
      if (this.splash?.geometry) this.splash.geometry.boundingSphere =
        new THREE.Sphere(new THREE.Vector3(0, this.cfg.groundY, 0), r);
      if (this.dropletPoints?.geometry) this.dropletPoints.geometry.boundingSphere =
        new THREE.Sphere(new THREE.Vector3(0, this.cfg.groundY, 0), r);

      callback?.();
    } catch (e) {
      console.warn('[RainStorm] Load failed:', e);
      callback?.(e);
    }
  }
  StartLoop(): void {
    this.Show()
  }
  StopLoop(): void {
    this.Hide()
    this.eventCtrl.SendEventMessage(EventTypes.StopBGM, "rainstorm", { fade: true })
  }

  /* ----------------------- (선택) 외부 틱에서 호출하고 싶다면 ---------------------- */
  public update(delta: number): void { this._update(Math.min(delta, MAX_DELTA_TIME)); }

  /* --------------------------------- Loop ---------------------------------- */
  private startLoop() {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    this.eventCtrl.SendEventMessage(EventTypes.PlayBGM, "rainstorm", SoundType.NigitRain, { loop: true })
    // const tick = () => {
    //   this._raf = requestAnimationFrame(tick);
    //   const d = Math.min(this.clock.getDelta(), MAX_DELTA_TIME);
    //   this._update(d);
    // };
    // this.clock.getDelta();
    // this._raf = requestAnimationFrame(tick);
  }
  private stopLoop() { 
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    this.eventCtrl.SendEventMessage(EventTypes.StopBGM, "rainstorm", { fade: true })
    // if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; 
  }

  private _update(delta: number) {
    if (!this.Mesh) return;
    this.updateRain(delta);
    this.updateSplashes(delta);
    this.updateRipples(delta);
    this.updateDroplets(delta);
    this.updateLightning(delta);
  }

  /* ---------------------------------- Rain --------------------------------- */
  private createRainLines(root: THREE.Object3D) {
    const positions = new Float32Array(NUM_RAINDROPS * 2 * 3);
    const colors = new Float32Array(NUM_RAINDROPS * 2 * 3);
    const col = new THREE.Color(0x99aadd);

    for (let i = 0; i < NUM_RAINDROPS; i++) {
      const x = (Math.random() - 0.5) * RAIN_AREA_SIZE;
      const y = this.cfg.groundY + Math.random() * RAIN_HEIGHT; // ★ groundY 기준
      const z = (Math.random() - 0.5) * RAIN_AREA_SIZE;

      positions[i*6+0] = x; positions[i*6+1] = y; positions[i*6+2] = z;
      positions[i*6+3] = x; positions[i*6+4] = y - LINE_LENGTH; positions[i*6+5] = z;

      for (let j = 0; j < 2; j++) {
        colors[i*6+j*3+0] = col.r;
        colors[i*6+j*3+1] = col.g;
        colors[i*6+j*3+2] = col.b;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.7,
      // 레인 라인은 깊이 테스트 유지해도 보이지만, 더 잘 보이게 하려면 주석 해제
      // depthTest: false, depthWrite: false,
    });

    this.rain = new THREE.LineSegments(geo, mat);
    root.add(this.rain);
  }

  private updateRain(delta: number) {
    if (!this.rain) return;
    const attr = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    const pos = attr.array as Float32Array;

    for (let i = 0; i < NUM_RAINDROPS; i++) {
      pos[i*6 + 1] -= this.cfg.rainSpeed * delta * 60;
      pos[i*6 + 4] -= this.cfg.rainSpeed * delta * 60;

      const dx = this.cfg.windX * delta * 60;
      const dz = this.cfg.windZ * delta * 60;
      pos[i*6 + 0] += dx; pos[i*6 + 3] += dx;
      pos[i*6 + 2] += dz; pos[i*6 + 5] += dz;

      if (pos[i*6 + 4] < this.cfg.groundY) { // ★ groundY 충돌
        const hitX = pos[i*6 + 0];
        const hitZ = pos[i*6 + 2];
        this.spawnSplashAt(hitX, hitZ);

        const nx = (Math.random() - 0.5) * RAIN_AREA_SIZE;
        const nz = (Math.random() - 0.5) * RAIN_AREA_SIZE;
        const ny = this.cfg.groundY + RAIN_HEIGHT;

        pos[i*6 + 0] = nx; pos[i*6 + 1] = ny; pos[i*6 + 2] = nz;
        pos[i*6 + 3] = nx; pos[i*6 + 4] = ny - LINE_LENGTH; pos[i*6 + 5] = nz;
      }
    }
    attr.needsUpdate = true;
  }

  /* -------------------------------- Splash -------------------------------- */
  private createSplashPool(root: THREE.Object3D) {
    this.splashPositions  = new Float32Array(SPLASH_POOL_SIZE * 2 * 3);
    this.splashVelocities = new Float32Array(SPLASH_POOL_SIZE * 2 * 3);
    this.splashAges       = new Float32Array(SPLASH_POOL_SIZE);
    this.splashActive     = new Uint8Array(SPLASH_POOL_SIZE);

    for (let i = 0; i < SPLASH_POOL_SIZE; i++) {
      this.splashActive[i] = 0;
      this.splashAges[i] = 0;
      for (let v = 0; v < 2; v++) {
        this.splashPositions[i*6+v*3+0] = 0;
        this.splashPositions[i*6+v*3+1] = HIDE_Y;
        this.splashPositions[i*6+v*3+2] = 0;
        this.splashVelocities[i*6+v*3+0] = 0;
        this.splashVelocities[i*6+v*3+1] = 0;
        this.splashVelocities[i*6+v*3+2] = 0;
      }
    }

    const colors = new Float32Array(SPLASH_POOL_SIZE * 2 * 3);
    const c = new THREE.Color(0xaaccff);
    for (let i = 0; i < SPLASH_POOL_SIZE * 2; i++) {
      colors[i*3+0] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.splashPositions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: this.cfg.splash.opacity,
      // depthTest: false,      // ★ 항상 보이게
      depthWrite: false,
    });

    this.splash = new THREE.LineSegments(geo, mat);
    // this.splash.frustumCulled = false; // ★ 컬링 방지
    // this.splash.renderOrder = 1;       // ★ 레인 위에
    // ★ 넉넉한 바운딩(중심을 groundY로)
    const r = boundRadius();
    this.splash.geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, this.cfg.groundY, 0), r
    );

    root.add(this.splash);
  }

  private spawnSplashAt(x: number, z: number) {
    if (this.cfg.ripplesEnabled) this.spawnRippleAt(x, z);
    if (this.cfg.dropletsEnabled) this.spawnDropletsAt(x, z);
    if (!this.cfg.splashEnabled || !this.splash) return;

    const EPS = 0.001;
    for (let n = 0; n < this.cfg.splash.perHit; n++) {
      const idx = this.splashWritePtr;
      this.splashWritePtr = (this.splashWritePtr + 1) % SPLASH_POOL_SIZE;

      this.splashActive[idx] = 1;
      this.splashAges[idx]   = 0;

      const angle = Math.random() * Math.PI * 2;
      const r  = 0.12 + Math.random() * 0.18;
      const up = 0.03 + Math.random() * 0.06;

      const sx = x, sy = this.cfg.groundY + EPS, sz = z; // ★ groundY
      const ex = x + Math.cos(angle) * r;
      const ey = this.cfg.groundY + up;                  // ★ groundY
      const ez = z + Math.sin(angle) * r;

      this.splashPositions[idx*6 + 0] = sx;
      this.splashPositions[idx*6 + 1] = sy;
      this.splashPositions[idx*6 + 2] = sz;
      this.splashPositions[idx*6 + 3] = ex;
      this.splashPositions[idx*6 + 4] = ey;
      this.splashPositions[idx*6 + 5] = ez;

      const vOut = 0.6 + Math.random() * 1.0;
      const vUp  = 0.8 + Math.random() * 0.8;
      const vx   = Math.cos(angle) * vOut * this.cfg.splash.speed;
      const vz   = Math.sin(angle) * vOut * this.cfg.splash.speed;
      const vy   = vUp * this.cfg.splash.speed;

      for (let v = 0; v < 2; v++) {
        this.splashVelocities[idx*6 + v*3 + 0] = vx;
        this.splashVelocities[idx*6 + v*3 + 1] = vy;
        this.splashVelocities[idx*6 + v*3 + 2] = vz;
      }
    }
    (this.splash.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private killSplash(idx: number) {
    this.splashActive[idx] = 0;
    this.splashAges[idx]   = 0;
    for (let v = 0; v < 2; v++) {
      this.splashPositions[idx*6 + v*3 + 0] = 0;
      this.splashPositions[idx*6 + v*3 + 1] = HIDE_Y;
      this.splashPositions[idx*6 + v*3 + 2] = 0;
      this.splashVelocities[idx*6 + v*3 + 0] = 0;
      this.splashVelocities[idx*6 + v*3 + 1] = 0;
      this.splashVelocities[idx*6 + v*3 + 2] = 0;
    }
  }

  private updateSplashes(delta: number) {
    if (!this.splash) return;

    const pos  = this.splashPositions;
    const vel  = this.splashVelocities;
    const ages = this.splashAges;
    let dirty = false;

    for (let i = 0; i < SPLASH_POOL_SIZE; i++) {
      if (this.splashActive[i] === 0) continue;
      dirty = true;

      ages[i] += delta;
      if (ages[i] >= this.cfg.splash.lifetime) { this.killSplash(i); continue; }

      vel[i*6 + 1] -= this.cfg.splash.gravity * delta;
      vel[i*6 + 4] -= this.cfg.splash.gravity * delta;

      for (let v = 0; v < 2; v++) {
        pos[i*6 + v*3 + 0] += vel[i*6 + v*3 + 0] * delta;
        pos[i*6 + v*3 + 1] += vel[i*6 + v*3 + 1] * delta;
        pos[i*6 + v*3 + 2] += vel[i*6 + v*3 + 2] * delta;
      }

      const vx = vel[i*6 + 0], vy = vel[i*6 + 1], vz = vel[i*6 + 2];
      const speed = Math.hypot(vx, vy, vz);
      if (speed < this.cfg.splash.killSpeed) { this.killSplash(i); continue; }
      if (pos[i*6 + 1] <= this.cfg.groundY || pos[i*6 + 4] <= this.cfg.groundY) { // ★ groundY
        this.killSplash(i); continue;
      }
    }

    if (dirty) (this.splash.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  /* -------------------------------- Ripples -------------------------------- */
  private makeRippleTexture(size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2, r = size / 2 - 2;
    ctx.lineWidth = size * 0.03;
    const grd = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r);
    grd.addColorStop(0.0, 'rgba(200,230,255,0.0)');
    grd.addColorStop(0.6, 'rgba(180,210,255,0.85)');
    grd.addColorStop(1.0, 'rgba(180,210,255,0.0)');
    ctx.strokeStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    return tex;
  }

  private createRipplePool(root: THREE.Object3D) {
    for (let i = 0; i < RIPPLE_POOL_SIZE; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.rippleTex!,
        transparent: true,
        depthWrite: false,
        depthTest: false,          // ★ 항상 보이게
        opacity: 0.0
      }));
      spr.position.set(0, this.cfg.groundY + 0.001, 0); // ★ groundY
      spr.scale.set(this.cfg.ripple.minRadius, this.cfg.ripple.minRadius, 1);
      spr.renderOrder = 1; // ★ 레인 위에
      root.add(spr);
      this.rippleSprites.push(spr);
      this.rippleActive[i] = 0;
      this.rippleAges[i] = 0;
    }
  }

  private spawnRippleAt(x: number, z: number) {
    const idx = this.rippleWritePtr;
    this.rippleWritePtr = (this.rippleWritePtr + 1) % RIPPLE_POOL_SIZE;

    const spr = this.rippleSprites[idx];
    this.rippleActive[idx] = 1;
    this.rippleAges[idx] = 0;

    spr.position.set(x, this.cfg.groundY + 0.001, z); // ★ groundY
    (spr.material as THREE.SpriteMaterial).opacity = this.cfg.ripple.baseOpacity;
    spr.scale.set(this.cfg.ripple.minRadius, this.cfg.ripple.minRadius, 1);
  }

  private updateRipples(delta: number) {
    for (let i = 0; i < RIPPLE_POOL_SIZE; i++) {
      if (!this.rippleActive[i]) continue;

      this.rippleAges[i] += delta;
      const t = this.rippleAges[i] / this.cfg.ripple.lifetime;
      const spr = this.rippleSprites[i];
      const mat = spr.material as THREE.SpriteMaterial;

      if (t >= 1.0) { this.rippleActive[i] = 0; mat.opacity = 0.0; continue; }

      const r = lerp(this.cfg.ripple.minRadius, this.cfg.ripple.maxRadius, t);
      spr.scale.set(r, r, 1);

      const fade = Math.pow(1.0 - t, this.cfg.ripple.fadePower);
      mat.opacity = this.cfg.ripple.baseOpacity * fade;
    }
  }

  /* ------------------------------- Droplets -------------------------------- */
  private makeCircleTexture(size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2, r = size / 2;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grd.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    grd.addColorStop(0.4, 'rgba(200,230,255,0.8)');
    grd.addColorStop(1.0, 'rgba(200,230,255,0.0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  private createDropletPoints(root: THREE.Object3D) {
    this.dropletPositions  = new Float32Array(DROPLET_POOL_SIZE * 3);
    this.dropletVelocities = new Float32Array(DROPLET_POOL_SIZE * 3);
    this.dropletAges       = new Float32Array(DROPLET_POOL_SIZE);
    this.dropletActive     = new Uint8Array(DROPLET_POOL_SIZE);

    for (let i = 0; i < DROPLET_POOL_SIZE; i++) {
      this.dropletActive[i] = 0;
      this.dropletAges[i]   = 0;
      this.dropletPositions[i*3 + 0] = 0;
      this.dropletPositions[i*3 + 1] = HIDE_Y;
      this.dropletPositions[i*3 + 2] = 0;
      this.dropletVelocities[i*3 + 0] = 0;
      this.dropletVelocities[i*3 + 1] = 0;
      this.dropletVelocities[i*3 + 2] = 0;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.dropletPositions, 3));

    const mat = new THREE.PointsMaterial({
      map: this.dropletTex!,
      size: this.cfg.droplet.size,
      transparent: true,
      depthWrite: false,
      // depthTest: false,              // ★ 항상 보이게
      blending: THREE.AdditiveBlending,
      opacity: this.cfg.droplet.opacity,
      sizeAttenuation: true
    });

    this.dropletPoints = new THREE.Points(geom, mat);
    // this.dropletPoints.frustumCulled = false;  // ★ 컬링 방지
    // this.dropletPoints.renderOrder = 1;        // ★ 레인 위에
    const r2 = boundRadius();
    this.dropletPoints.geometry.boundingSphere =
      new THREE.Sphere(new THREE.Vector3(0, this.cfg.groundY, 0), r2); // ★ 중심 groundY

    root.add(this.dropletPoints);
  }

  private spawnDropletsAt(x: number, z: number) {
    if (!this.cfg.dropletsEnabled || !this.dropletPoints) return;

    for (let n = 0; n < this.cfg.droplet.perHit; n++) {
      const idx = this.dropletWritePtr;
      this.dropletWritePtr = (this.dropletWritePtr + 1) % DROPLET_POOL_SIZE;

      this.dropletActive[idx] = 1;
      this.dropletAges[idx]   = 0;

      this.dropletPositions[idx*3 + 0] = x;
      this.dropletPositions[idx*3 + 1] = this.cfg.groundY + 0.02 + Math.random() * 0.03; // ★ groundY
      this.dropletPositions[idx*3 + 2] = z;

      const ang = Math.random() * Math.PI * 2;
      const sp  = 0.4 + Math.random() * 1.0;
      const vx = Math.cos(ang) * sp * this.cfg.droplet.speedXZ;
      const vz = Math.sin(ang) * sp * this.cfg.droplet.speedXZ;
      const vy = (0.8 + Math.random() * 0.8) * this.cfg.droplet.speedY;

      this.dropletVelocities[idx*3 + 0] = vx;
      this.dropletVelocities[idx*3 + 1] = vy;
      this.dropletVelocities[idx*3 + 2] = vz;
    }
    (this.dropletPoints.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateDroplets(delta: number) {
    if (!this.dropletPoints) return;

    const pos = this.dropletPositions;
    const vel = this.dropletVelocities;
    let dirty = false;

    for (let i = 0; i < DROPLET_POOL_SIZE; i++) {
      if (!this.dropletActive[i]) continue;
      dirty = true;

      this.dropletAges[i] += delta;
      if (this.dropletAges[i] >= this.cfg.droplet.lifetime) {
        this.dropletActive[i] = 0;
        pos[i*3 + 1] = HIDE_Y;
        vel[i*3 + 0] = vel[i*3 + 1] = vel[i*3 + 2] = 0;
        continue;
      }

      vel[i*3 + 1] -= this.cfg.droplet.gravity * delta;

      pos[i*3 + 0] += vel[i*3 + 0] * delta;
      pos[i*3 + 1] += vel[i*3 + 1] * delta;
      pos[i*3 + 2] += vel[i*3 + 2] * delta;

      if (pos[i*3 + 1] <= this.cfg.groundY) {  // ★ groundY
        this.dropletActive[i] = 0;
        pos[i*3 + 1] = HIDE_Y;
        vel[i*3 + 0] = vel[i*3 + 1] = vel[i*3 + 2] = 0;
        continue;
      }
    }

    if (dirty) (this.dropletPoints.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  /* ------------------------------- Lightning ------------------------------- */
  private scheduleNextLightning() {
    const spm = Math.max(0, this.cfg.lightning.strikesPerMin);
    if (spm === 0) { this.lightningCountdown = 1e9; return; } // 사실상 비활성
    const mean = 60 / spm; // 평균 간격(초)
    this.lightningCountdown = expRand(mean);
  }

  private spawnLightningNow() {
    if (!this.cfg.lightningEnabled) return;

    const mode = this.cfg.lightning.displayMode;
    const doBolts = (mode !== 'flash-only') && this.cfg.lightning.boltEnabled;
    const doFlash = (mode !== 'bolts-only');

    // 1) 라이트 플래시
    if (doFlash && this.hemi) {
      this.flashTimer = this.cfg.lightning.flashDuration;
      this.hemi.intensity = HEMI_BASE_INTENSITY + this.cfg.lightning.flashIntensity;

      // 화면 전체 플래시
      if (this.cfg.lightning.screenFlashEnabled && this.overlayEl) {
        this.overlayActive  = true;
        this.overlayAge     = 0;
        this.overlayDur     = this.cfg.lightning.screenFlashDuration;
        this.overlayEl.style.background = this.cfg.lightning.screenFlashColor;
        this.overlayEl.style.opacity    = String(this.cfg.lightning.screenFlashMaxOpacity);
      }
    }

    // 2) 번개 줄기 + 글로우
    if (doBolts) {
      const p = this.pickStrikeXZ();
      const start = new THREE.Vector3(
        p.x,
        lerp(this.cfg.groundY + RAIN_HEIGHT * 0.7, this.cfg.groundY + RAIN_HEIGHT * 1.05, Math.random()),
        p.z
      );
      const end   = new THREE.Vector3(
        p.x + (Math.random()-0.5)*6,
        this.cfg.groundY, // ★ groundY
        p.z + (Math.random()-0.5)*6
      );

      const bolt = this.buildBoltGroup(
        start, end,
        this.cfg.lightning.boltSegments,
        this.cfg.lightning.boltChaos,
        this.cfg.lightning.boltBranches,
        this.cfg.lightning.boltColor
      );

      // Staccato 파라미터
      if (this.cfg.lightning.staccatoEnabled) {
        bolt.staOn   = this.cfg.lightning.staccatoOn;
        bolt.staOff  = this.cfg.lightning.staccatoOff;
        bolt.staCnt  = this.cfg.lightning.staccatoCount;
        bolt.staCycle= bolt.staOn + bolt.staOff;
        bolt.staEnd  = bolt.staCnt * bolt.staCycle;
        bolt.duration = Math.max(this.cfg.lightning.boltDuration, bolt.staEnd);
      } else {
        bolt.duration = this.cfg.lightning.boltDuration;
      }

      // Glow sprite
      if (this.cfg.lightning.glowEnabled && this.glowTex) {
        const spr = new THREE.Sprite(new THREE.SpriteMaterial({
          map: this.glowTex,
          color: new THREE.Color(this.cfg.lightning.glowColor),
          transparent: true,
          depthWrite: false,
          depthTest: false,          // ★ 항상 보이게
          blending: THREE.AdditiveBlending,
          opacity: 0.0
        }));
        spr.position.copy(end).setY(this.cfg.groundY + 0.02); // ★ groundY
        spr.scale.set(0.1, 0.1, 1);
        this.Mesh!.add(spr);
        bolt.glowSprite = spr;
        bolt.glowLife   = bolt.duration;
      }

      this.Mesh!.add(bolt.group);
      this.activeBolts.push(bolt);
    }
  }

  private updateLightning(delta: number) {
    // 스케줄
    if (this.cfg.lightningEnabled) {
      this.lightningCountdown -= delta;
      if (this.lightningCountdown <= 0) {
        this.spawnLightningNow();
        this.scheduleNextLightning();
      }
    }

    // 헤미 라이트 감쇠
    if (this.flashTimer > 0 && this.hemi) {
      this.flashTimer -= delta;
      const t = clamp01(this.flashTimer / this.cfg.lightning.flashDuration);
      this.hemi.intensity = HEMI_BASE_INTENSITY + this.cfg.lightning.flashIntensity * t;
    } else if (this.hemi) {
      this.hemi.intensity = HEMI_BASE_INTENSITY;
    }

    // 화면 전체 플래시 감쇠 (+ 스태카토 동기화)
    if (this.overlayActive && this.overlayEl && this.cfg.lightning.screenFlashEnabled) {
      this.overlayAge += delta;
      const t = this.overlayAge / this.overlayDur;

      let base = Math.pow(1.0 - clamp01(t), this.cfg.lightning.screenFlashEase);
      let vis = 1.0;
      if (this.cfg.lightning.staccatoEnabled) {
        const cyc   = this.cfg.lightning.staccatoOn + this.cfg.lightning.staccatoOff;
        const staEnd= this.cfg.lightning.staccatoCount * cyc;
        if (this.overlayAge < staEnd) {
          const idx = Math.floor(this.overlayAge / cyc);
          const tIn = this.overlayAge - idx * cyc;
          vis = (tIn < this.cfg.lightning.staccatoOn) ? 1.0 : 0.0;
        }
      }
      const alpha = this.cfg.lightning.screenFlashMaxOpacity * base * vis;
      this.overlayEl.style.opacity = String(alpha);

      if (t >= 1.0) { this.overlayActive = false; this.overlayEl.style.opacity = '0'; }
    }

    // 번개 줄기/글로우 업데이트
    for (let i = this.activeBolts.length - 1; i >= 0; i--) {
      const bolt = this.activeBolts[i];
      bolt.age += delta;

      const tfade = clamp01(bolt.age / bolt.duration);
      const baseAlpha = Math.pow(1.0 - tfade, 0.7);

      let visFactor = 1.0;
      if (this.cfg.lightning.staccatoEnabled && bolt.staEnd !== undefined) {
        if (bolt.age < bolt.staEnd) {
          const cyc = bolt.staCycle!;
          const idx = Math.floor(bolt.age / cyc);
          const tIn = bolt.age - idx * cyc;
          visFactor = (tIn < bolt.staOn!) ? 1.0 : 0.0;
        } else {
          visFactor = 1.0;
        }
      }

      for (const m of bolt.materials) m.opacity = baseAlpha * visFactor;

      if (bolt.glowSprite) {
        const t = clamp01(bolt.age / (bolt.glowLife ?? bolt.duration));
        const size = lerp(0.2, this.cfg.lightning.glowSize, Math.min(1, t * 3));
        const gFade = Math.pow(1.0 - t, 0.85);
        bolt.glowSprite.material.opacity = this.cfg.lightning.glowOpacity * gFade * visFactor;
        bolt.glowSprite.scale.set(size, size, 1);
      }

      if (bolt.age >= bolt.duration) {
        this.Mesh!.remove(bolt.group);
        bolt.group.traverse((o: any) => { if (o.isLine) { o.geometry.dispose(); o.material.dispose(); } });
        if (bolt.glowSprite) {
          this.Mesh!.remove(bolt.glowSprite);
          (bolt.glowSprite.material as THREE.Material).dispose();
        }
        this.activeBolts.splice(i, 1);
      }
    }
  }

  private pickStrikeXZ() {
    if (this.cfg.lightning.aroundCamera && this.camera) {
      const ang = Math.random() * Math.PI * 2;
      const r   = Math.random() * this.cfg.lightning.areaRadius;
      const cx = (this.camera as any).position?.x ?? 0;
      const cz = (this.camera as any).position?.z ?? 0;
      return { x: cx + Math.cos(ang) * r, z: cz + Math.sin(ang) * r };
    } else {
      const ang = Math.random() * Math.PI * 2;
      const r   = Math.random() * this.cfg.lightning.areaRadius;
      return { x: Math.cos(ang) * r, z: Math.sin(ang) * r };
    }
  }

  private buildBoltGroup(start: THREE.Vector3, end: THREE.Vector3, segments: number, chaos: number, branches: number, colorHex: string): Bolt {
    const group = new THREE.Group();
    const color = new THREE.Color(colorHex);
    const mats: THREE.LineBasicMaterial[] = [];

    const mainPts = this.makeJaggedPolyline(start, end, segments, chaos);
    const mainGeom = new THREE.BufferGeometry().setFromPoints(mainPts);
    const mainMat  = new THREE.LineBasicMaterial({
      color, transparent: true, blending: THREE.AdditiveBlending, opacity: 1.0,
      depthTest: false, depthWrite: false // ★ 항상 보이게
    });
    group.add(new THREE.Line(mainGeom, mainMat));
    mats.push(mainMat);

    for (let b = 0; b < branches; b++) {
      const t0 = THREE.MathUtils.randFloat(0.4, 0.9);
      const src = this.samplePolyline(mainPts, t0);
      const outDir = new THREE.Vector3((Math.random()-0.5)*2, -Math.random()*0.8 - 0.2, (Math.random()-0.5)*2).normalize();
      const len = THREE.MathUtils.randFloat(3, 10);
      const dst = src.clone().addScaledVector(outDir, len);
      dst.y = Math.max(this.cfg.groundY, dst.y); // ★ groundY 이하로 내려가지 않음
      const segs = Math.floor(lerp(6, 16, Math.random()));
      const pts = this.makeJaggedPolyline(src, dst, segs, chaos * 0.7);

      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const m = new THREE.LineBasicMaterial({
        color, transparent: true, blending: THREE.AdditiveBlending, opacity: 0.9,
        depthTest: false, depthWrite: false // ★
      });
      group.add(new THREE.Line(g, m));
      mats.push(m);
    }

    return { group, materials: mats, age: 0, duration: this.cfg.lightning.boltDuration };
  }

  private makeJaggedPolyline(a: THREE.Vector3, b: THREE.Vector3, segments: number, chaos: number) {
    const pts: THREE.Vector3[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const ab = new THREE.Vector3().subVectors(b, a);
    const right = new THREE.Vector3().crossVectors(ab, up).normalize();
    const fwd   = new THREE.Vector3().crossVectors(right, up).normalize();

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const base = new THREE.Vector3().lerpVectors(a, b, t);

      const falloff = Math.pow(1.0 - t, 0.35);
      const offR = (Math.random() - 0.5) * chaos * falloff;
      const offF = (Math.random() - 0.5) * chaos * falloff;

      base.addScaledVector(right, offR);
      base.addScaledVector(fwd,   offF);
      pts.push(base);
    }
    return pts;
  }

  private samplePolyline(points: THREE.Vector3[], t: number) {
    const n = points.length;
    const i = Math.min(n - 2, Math.floor(t * (n - 1)));
    const tt = t * (n - 1) - i;
    return new THREE.Vector3().lerpVectors(points[i], points[i + 1], tt);
  }

  /* ------------------------------ Glow Texture ----------------------------- */
  private makeGlowTexture(size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2, r = size / 2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0.00, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.25, 'rgba(220,240,255,0.9)');
    g.addColorStop(0.60, 'rgba(200,225,255,0.5)');
    g.addColorStop(1.00, 'rgba(180,210,255,0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
}
