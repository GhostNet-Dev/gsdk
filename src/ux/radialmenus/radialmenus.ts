// RadialMenuUI.ts
// A drop-in HTML radial menu overlay for any Three.js game.
// by you + ChatGPT

import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

type RingStyle = 'none' | 'solid' | 'line';
type Shape = 'circle' | 'rounded' | 'square' | 'hex';
type Easing = 'outBack' | 'outCubic';
type OpenAt = 'center' | 'pointer';

export type IconDef =
  | string // shorthand emoji/text
  | { type: 'emoji' | 'text'; value: string }
  | { type: 'img'; value: string; alt?: string }
  | { type: 'svgInline'; value: string } // ⚠️ only from trusted sources
  | { type: 'webfontFA'; value: string } // e.g. "fa-solid fa-shield-halved"
  | { type: 'webfontMS'; value: string } // e.g. "explore"

export interface RadialMenuOptions {
  // appearance & layout
  radius: number;           // final radius (px)
  itemSize: number;         // item diameter/size (px)
  startAngleDeg: number;    // first item angle (deg). -90 === up
  shape: Shape;             // item shape
  ringStyle: RingStyle;     // 'none' | 'solid' | 'line'
  fontScale: number;        // emoji/webfont scale relative to item size

  // theme variables (CSS custom properties)
  theme: keyof typeof DEFAULT_THEMES | 'custom';
  themeVars?: Partial<ThemeVars>;
  pageBg?: string;          // optional page background color

  // behavior
  animateMs: number;
  spinOnOpen: number;       // radians spin while opening
  easing: Easing;
  autoCloseOnMiss: boolean;
  openAt: OpenAt;           // 'center' | 'pointer'
  centerClickThresholdPx: number;
  enableGlobalCenterClick: boolean; // listen window pointerdown to open

  // integration
  parent?: HTMLElement;     // container to mount overlay into (default: document.body)
  injectStyles: boolean;    // injects <style> once
  pollGamepad: boolean;     // enable gamepad navigation poll in update()
  onSelect?: (def: IconDef, index: number) => void;
}

type ThemeVars = {
  '--ring-stroke': string;
  '--ring-glow': string;
  '--ring-bg': string;
  '--ring-width': string;
  '--item-bg-1': string;
  '--item-bg-2': string;
  '--item-fg': string;
  '--item-border': string;
  '--item-shadow': string;
};

const DEFAULT_THEMES: Record<string, { vars: ThemeVars; bg: string }> = {
  'Dark Neon': {
    vars: {
      '--ring-stroke': '#6ea8ffcc',
      '--ring-glow': '0 0 90px rgba(78,128,255,.45) inset',
      '--ring-bg': 'radial-gradient(circle, rgba(60,80,150,.12), transparent 60%)',
      '--ring-width': '1.5px',
      '--item-bg-1': '#293b6b',
      '--item-bg-2': '#0a0f1f',
      '--item-fg': '#eaf1ff',
      '--item-border': 'rgba(255,255,255,.12)',
      '--item-shadow': '0 10px 28px rgba(0,10,40,.5), inset 0 0 0 1px var(--item-border)',
    },
    bg: '#0b0f16',
  },
  Pastel: {
    vars: {
      '--ring-stroke': '#ffc2e2cc',
      '--ring-glow': '0 0 90px rgba(255,170,210,.35) inset',
      '--ring-bg': 'radial-gradient(circle, rgba(255,200,230,.18), transparent 60%)',
      '--ring-width': '1.5px',
      '--item-bg-1': '#ffe0f0',
      '--item-bg-2': '#ffd7e8',
      '--item-fg': '#4b4250',
      '--item-border': 'rgba(255,255,255,.66)',
      '--item-shadow': '0 8px 20px rgba(255,160,210,.35), inset 0 0 0 1px var(--item-border)',
    },
    bg: '#fff5fb',
  },
  'Glass Frost': {
    vars: {
      '--ring-stroke': '#ffffff88',
      '--ring-glow': '0 0 60px rgba(255,255,255,.25) inset',
      '--ring-bg': 'rgba(255,255,255,.06)',
      '--ring-width': '1.5px',
      '--item-bg-1': '#ffffff55',
      '--item-bg-2': '#ffffff22',
      '--item-fg': '#10202a',
      '--item-border': 'rgba(255,255,255,.9)',
      '--item-shadow': '0 10px 24px rgba(0,0,0,.25), inset 0 0 0 1px var(--item-border)',
    },
    bg: '#0e1418',
  },
  'Retro Pixel': {
    vars: {
      '--ring-stroke': '#2bdf7acc',
      '--ring-glow': '0 0 60px rgba(43,223,122,.35) inset',
      '--ring-bg': 'conic-gradient(from 0turn, #203a2d, #1a2c23)',
      '--ring-width': '1.5px',
      '--item-bg-1': '#2c2c2c',
      '--item-bg-2': '#191919',
      '--item-fg': '#9affc7',
      '--item-border': 'rgba(0,0,0,.6)',
      '--item-shadow': '0 8px 18px rgba(0,0,0,.55), inset 0 0 0 2px var(--item-border)',
    },
    bg: '#101010',
  },
  'SF Neon': {
    vars: {
      '--ring-stroke': '#00f0ffcc',
      '--ring-glow': '0 0 100px rgba(0,240,255,.35) inset',
      '--ring-bg': 'radial-gradient(circle, rgba(0,240,255,.1), transparent 60%)',
      '--ring-width': '1.5px',
      '--item-bg-1': '#0f2a35',
      '--item-bg-2': '#04141a',
      '--item-fg': '#c7f9ff',
      '--item-border': 'rgba(0,240,255,.45)',
      '--item-shadow': '0 10px 28px rgba(0,40,60,.6), inset 0 0 0 1px var(--item-border)',
    },
    bg: '#061015',
  },
  'Dark Fantasy': {
    vars: {
      '--ring-stroke': '#ff9a3bcc',
      '--ring-glow': '0 0 90px rgba(255,150,60,.35) inset',
      '--ring-bg': 'radial-gradient(circle, rgba(80,30,10,.18), transparent 60%)',
      '--ring-width': '1.5px',
      '--item-bg-1': '#3b2215',
      '--item-bg-2': '#140a06',
      '--item-fg': '#ffe3c4',
      '--item-border': 'rgba(255,200,150,.35)',
      '--item-shadow': '0 10px 28px rgba(30,8,2,.65), inset 0 0 0 1px var(--item-border)',
    },
    bg: '#0f0906',
  },
};

const DEFAULT_OPTIONS: RadialMenuOptions = {
  radius: 160,
  itemSize: 72,
  startAngleDeg: -90,
  shape: 'circle',
  ringStyle: 'solid',
  fontScale: 0.5,

  theme: 'Dark Neon',
  themeVars: undefined,
  pageBg: undefined,

  animateMs: 520,
  spinOnOpen: 1.6,
  easing: 'outBack',
  autoCloseOnMiss: true,
  openAt: 'center',
  centerClickThresholdPx: 200,
  enableGlobalCenterClick: true,

  parent: undefined,
  injectStyles: true,
  pollGamepad: true,
  onSelect: undefined,
};

let STYLE_INJECTED = false;
const CSS_TEXT = `
.rm-root{position:fixed;inset:0;pointer-events:none;z-index:9999}
.rm-radial{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:0;height:0;pointer-events:none}
.rm-radial .rm-ring,.rm-radial .rm-ring2{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:0;height:0;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .25s}
.rm-radial .rm-ring{box-shadow:var(--ring-glow);background:var(--ring-bg)}
.rm-radial .rm-ring2{box-shadow:0 0 0 var(--ring-width) var(--ring-stroke) inset}
.rm-radial.open .rm-ring,.rm-radial.open .rm-ring2{opacity:.85}
.rm-item{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:72px;display:grid;place-items:center;user-select:none;cursor:pointer;border:none;outline:none;color:var(--item-fg);background:radial-gradient(120% 120% at 30% 30%, var(--item-bg-1), var(--item-bg-2));box-shadow:var(--item-shadow);transition:transform .12s ease-out, box-shadow .12s ease-out, opacity .12s, background .2s;pointer-events:auto;border-radius:999px;font-size:0}
.rm-item:hover{transform:translate(-50%,-50%) scale(1.06)}
.rm-item:active{transform:translate(-50%,-50%) scale(0.96)}
.rm-item:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, var(--item-fg) 60%, transparent), var(--item-shadow)}
.rm-item.rm-focused{transform:translate(-50%,-50%) scale(1.08)}
.rm-ic{display:inline-grid;place-items:center}
.rm-emoji,.rm-text{font-size:36px;line-height:1;color:var(--item-fg)}
.rm-img{width:70%;height:70%;object-fit:contain;display:block;pointer-events:none;-webkit-user-drag:none;user-drag:none}
.rm-svg{width:70%;height:70%;display:block;fill:currentColor;color:var(--item-fg)}
.rm-fa{font-size:34px;line-height:1;color:var(--item-fg)}
.rm-ms{font-size:40px;line-height:1;color:var(--item-fg);font-variation-settings:'wght' 400}
.rm-shape-circle .rm-item{border-radius:999px}
.rm-shape-rounded .rm-item{border-radius:20px}
.rm-shape-square .rm-item{border-radius:8px}
.rm-shape-hex .rm-item{border-radius:0;clip-path:polygon(25% 6.7%,75% 6.7%,100% 50%,75% 93.3%,25% 93.3%,0% 50%)}
.rm-animating .rm-item{pointer-events:none}
`.trim();

function injectStylesOnce() {
  if (STYLE_INJECTED) return;
  const style = document.createElement('style');
  style.textContent = CSS_TEXT;
  document.head.appendChild(style);
  STYLE_INJECTED = true;
}

function clamp01(t: number) { return Math.max(0, Math.min(1, t)); }

function ease(t: number, easing: Easing): number {
  t = clamp01(t);
  if (easing === 'outCubic') return 1 - Math.pow(1 - t, 3);
  const c1 = 1.70158, c3 = c1 + 1; // outBack
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function isCenterClick(x: number, y: number, thresholdPx: number): boolean {
  const dx = x - innerWidth / 2;
  const dy = y - innerHeight / 2;
  return Math.hypot(dx, dy) < thresholdPx * 0.25;
}

function createIconNode(def: IconDef, baseSize: number, fontScale: number): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'rm-ic';

  const sizePx = Math.round(baseSize * fontScale);
  const svgSize = '70%';

  const d = typeof def === 'string' ? { type: 'emoji', value: def } as any : def;

  switch (d.type) {
    case 'emoji':
    case 'text': {
      const s = document.createElement('span');
      s.className = d.type === 'emoji' ? 'rm-emoji' : 'rm-text';
      s.textContent = d.value || '★';
      s.style.fontSize = sizePx + 'px';
      wrap.appendChild(s);
      break;
    }
    case 'img': {
      const img = document.createElement('img');
      img.className = 'rm-img';
      img.alt = d.alt || '';
      img.src = d.value;
      wrap.appendChild(img);
      break;
    }
    case 'svgInline': {
      const div = document.createElement('div');
      div.innerHTML = (d.value || '').trim(); // ⚠️ trusted source only
      const svg = div.querySelector('svg');
      if (svg) {
        svg.classList.add('rm-svg');
        svg.setAttribute('width', svgSize);
        svg.setAttribute('height', svgSize);
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        wrap.appendChild(svg);
      } else {
        wrap.textContent = 'SVG?';
      }
      break;
    }
    case 'webfontFA': {
      const i = document.createElement('i');
      i.className = `rm-fa ${d.value}`;
      i.style.fontSize = sizePx + 'px';
      wrap.appendChild(i);
      break;
    }
    case 'webfontMS': {
      const s = document.createElement('span');
      s.className = 'rm-ms material-symbols-outlined';
      s.textContent = d.value || 'star';
      s.style.fontSize = sizePx + 'px';
      wrap.appendChild(s);
      break;
    }
    default: {
      const s = document.createElement('span');
      s.className = 'rm-text';
      s.textContent = String((d as any)?.value ?? '★');
      s.style.fontSize = sizePx + 'px';
      wrap.appendChild(s);
    }
  }
  return wrap;
}

export class RadialMenuUI implements ILoop {
  LoopId: number = 0;
  readonly opts: RadialMenuOptions;
  readonly root: HTMLElement;
  readonly radial: HTMLElement;
  readonly ring: HTMLElement;
  readonly ring2: HTMLElement;

  private items: { el: HTMLButtonElement; def: IconDef }[] = [];
  private isOpen = false;
  private progress = 0;
  private t0 = 0;
  private rotBase = 0;
  private focusIndex = 0;
  private lastPadMoveAt = 0;
  private destroyed = false;

  private pointerOpenHandler?: (e: PointerEvent) => void;

  constructor(
    eventCtrl: IEventController,
    options?: Partial<RadialMenuOptions>
  ) {
    this.opts = { ...DEFAULT_OPTIONS, ...options };

    if (this.opts.injectStyles) injectStylesOnce();

    // build DOM
    const parent = this.opts.parent ?? document.body;

    const root = document.createElement('div');
    root.className = 'rm-root';
    parent.appendChild(root);
    this.root = root;

    const radial = document.createElement('div');
    radial.className = `rm-radial rm-shape-${this.opts.shape}`;
    // default CSS variable fallback; theme applied later
    radial.style.setProperty('--ring-width', DEFAULT_THEMES['Dark Neon'].vars['--ring-width']);
    root.appendChild(radial);
    this.radial = radial;

    const ring = document.createElement('div'); ring.className = 'rm-ring';
    const ring2 = document.createElement('div'); ring2.className = 'rm-ring2';
    radial.appendChild(ring); radial.appendChild(ring2);
    this.ring = ring; this.ring2 = ring2;

    // theme & ring style
    this.applyTheme(this.opts.theme, this.opts.themeVars, this.opts.pageBg);
    this.applyShape(this.opts.shape);
    this.applyRingStyle(this.opts.ringStyle);

    // input
    if (this.opts.enableGlobalCenterClick) {
      this.pointerOpenHandler = (e: PointerEvent) => {
        if (this.isOpen && this.opts.autoCloseOnMiss && !e.composedPath().includes(this.radial)) {
          this.close(); return;
        }
        if (this.isOpen) return;
        if (this.opts.openAt === 'center') {
          if (isCenterClick(e.clientX, e.clientY, this.opts.centerClickThresholdPx)) this.open();
        } else { // 'pointer'
          this.openAt(e.clientX, e.clientY);
        }
      };
      window.addEventListener('pointerdown', this.pointerOpenHandler, { capture: true });
    }

    // keyboard
    window.addEventListener('keydown', (e) => this.onKey(e));
    eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  /** Mount under a different parent (optional). */
  mount(parent: HTMLElement) {
    if (this.root.parentElement !== parent) parent.appendChild(this.root);
  }

  /** Update per-frame (call in your game loop). */
  update() {
    const now = performance.now()
    if (this.destroyed) return;

    // animation
    if (this.isOpen && this.progress < 1) {
      const t = (now - this.t0) / this.opts.animateMs;
      this.progress = Math.min(1, t);
      const k = ease(this.progress, this.opts.easing);
      const r = this.opts.radius * k;
      const rot = this.opts.spinOnOpen * (1 - k);
      this.updateRing(r);
      this.layout(r, rot);
      if (this.progress >= 1) this.radial.classList.remove('rm-animating');
    }
    if (!this.isOpen && this.progress > 0) {
      const t = (now - this.t0) / this.opts.animateMs;
      const k = 1 - ease(Math.min(1, t), this.opts.easing);
      this.progress = Math.max(0, k);
      const r = this.opts.radius * this.progress;
      this.updateRing(r);
      this.layout(r, 0);
      if (this.progress <= 0) {
        this.radial.classList.remove('open', 'rm-animating');
        (this.root.style as any).pointerEvents = 'none';
      }
    }

    // gamepad
    if (this.opts.pollGamepad && this.isOpen && this.progress >= 1) {
      const pads = (navigator as any).getGamepads?.() || [];
      const gp = pads.find((p: any) => p && p.connected);
      if (gp) {
        const dead = 0.35;
        const axX = gp.axes?.[0] ?? 0, axY = gp.axes?.[1] ?? 0;
        const dpad = {
          up: gp.buttons?.[12]?.pressed,
          down: gp.buttons?.[13]?.pressed,
          left: gp.buttons?.[14]?.pressed,
          right: gp.buttons?.[15]?.pressed,
          a: gp.buttons?.[0]?.pressed || gp.buttons?.[2]?.pressed,
        };
        const timeOk = (now - this.lastPadMoveAt) > 200;
        let moved = false;
        if (timeOk) {
          if (dpad.right) { this.moveFocus(1); moved = true; }
          else if (dpad.left) { this.moveFocus(-1); moved = true; }
          else if (dpad.up) { this.moveFocus(Math.floor(this.items.length / 2)); moved = true; }
          else if (dpad.down) { this.moveFocus(-Math.floor(this.items.length / 2)); moved = true; }
        }
        if (!moved && timeOk && (Math.hypot(axX, axY) > dead)) {
          const idx = this.angleToIndex(Math.atan2(-axY, axX));
          if (idx !== this.focusIndex) { this.focusIndex = idx; this.applyFocus(true); moved = true; }
        }
        if (moved) this.lastPadMoveAt = now;
        if (dpad.a) this.items[this.focusIndex]?.el.click();
      }
    }
  }

  /** Clean up DOM & listeners. */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.pointerOpenHandler) window.removeEventListener('pointerdown', this.pointerOpenHandler, { capture: true } as any);
    this.root.remove();
  }

  // ---------- Public API ----------
  setItems(iconDefs: IconDef[] | string[]) {
    // cleanup
    for (const it of this.items) it.el.remove();
    this.items.length = 0;

    for (const def of iconDefs as IconDef[]) {
      const el = document.createElement('button');
      el.className = 'rm-item';
      el.tabIndex = -1;
      el.style.width = el.style.height = this.opts.itemSize + 'px';

      const node = createIconNode(def, this.opts.itemSize, this.opts.fontScale);
      el.appendChild(node);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.progress < 1) return;
        this.flash(el);
        this.opts.onSelect?.(def, this.items.findIndex(i => i.el === el));
      });

      this.radial.appendChild(el);
      this.items.push({ el, def });
    }

    this.updateRing(this.opts.radius);
    this.layout(0, 0);
    this.focusIndex = 0;
    this.applyFocus();
  }

  addItem(def: IconDef | string = '🗺️') {
    const list = this.items.map(i => i.def);
    list.push(def as IconDef);
    this.setItems(list);
  }

  removeLast() {
    if (this.items.length <= 1) return;
    this.setItems(this.items.slice(0, -1).map(i => i.def));
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.t0 = performance.now();
    this.progress = 0;
    this.radial.classList.add('open', 'rm-animating');
    (this.root.style as any).pointerEvents = 'auto';
    this.layout(0, this.opts.spinOnOpen);
    this.focusIndex = 0;
    this.applyFocus(true);
  }

  /** Open with radial centered at given page coords. */
  openAt(pageX: number, pageY: number) {
    // move anchor to clicked point
    this.radial.style.left = `${pageX}px`;
    this.radial.style.top = `${pageY}px`;
    this.radial.style.transform = `translate(-50%,-50%)`;
    this.open();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.t0 = performance.now();
    this.progress = 1;
    this.radial.classList.add('rm-animating');
  }

  updateOptions(patch: Partial<RadialMenuOptions>) {
    Object.assign(this.opts, patch);

    // reflect critical changes
    this.applyShape(this.opts.shape);
    this.applyRingStyle(this.opts.ringStyle);
    this.applyTheme(this.opts.theme, this.opts.themeVars, this.opts.pageBg);

    // re-measure items if size/fontScale changed
    if (patch.itemSize !== undefined || patch.fontScale !== undefined) {
      this.setItems(this.items.map(i => i.def));
    } else {
      this.updateRing(this.opts.radius);
      this.layout(this.opts.radius * this.progress, 0);
    }
  }

  // ---------- Internals ----------
  private applyTheme(name: string, override?: Partial<ThemeVars>, pageBg?: string) {
    const theme = name !== 'custom' ? DEFAULT_THEMES[name] ?? DEFAULT_THEMES['Dark Neon'] : null;
    const vars: ThemeVars = {
      ...(theme ? theme.vars : DEFAULT_THEMES['Dark Neon'].vars),
      ...(override ?? {}),
    } as ThemeVars;

    for (const [k, v] of Object.entries(vars)) this.radial.style.setProperty(k, v);
    const bg = pageBg ?? (theme?.bg);
    if (bg) (document.documentElement.style as any).setProperty('--bg', bg);
  }

  private applyShape(shape: Shape) {
    this.radial.classList.remove('rm-shape-circle', 'rm-shape-rounded', 'rm-shape-square', 'rm-shape-hex');
    this.radial.classList.add(`rm-shape-${shape}`);
  }

  private applyRingStyle(style: RingStyle) {
    const show = (el: HTMLElement, vis: boolean) => (el.style.display = vis ? 'block' : 'none');
    if (style === 'none') { show(this.ring, false); show(this.ring2, false); }
    else if (style === 'line') { show(this.ring, false); show(this.ring2, true); }
    else { show(this.ring, true); show(this.ring2, true); } // solid
  }

  private updateRing(r: number) {
    const d = r * 2 + this.opts.itemSize * 1.2;
    this.ring.style.width = d + 'px'; this.ring.style.height = d + 'px';
    this.ring2.style.width = d + 'px'; this.ring2.style.height = d + 'px';
  }

  private layout(r: number, rot = 0) {
    const N = Math.max(1, this.items.length);
    const step = (Math.PI * 2) / N;
    const base = (this.opts.startAngleDeg * Math.PI / 180) + rot;
    for (let i = 0; i < N; i++) {
      const ang = base + step * i;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      const el = this.items[i].el;
      el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
      el.style.opacity = r > 0 ? '1' : '0';
    }
  }

  private onKey(e: KeyboardEvent) {
    if (!this.isOpen || this.progress < 1) return;
    const N = this.items.length; if (!N) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) e.preventDefault();

    if (e.key === 'ArrowRight') this.moveFocus(1);
    else if (e.key === 'ArrowLeft') this.moveFocus(-1);
    else if (e.key === 'ArrowUp') this.moveFocus(Math.floor(N / 2));
    else if (e.key === 'ArrowDown') this.moveFocus(-Math.floor(N / 2));
    else if (e.key === 'Enter' || e.key === ' ') this.items[this.focusIndex]?.el.click();
  }

  private moveFocus(delta: number) {
    const N = this.items.length;
    this.focusIndex = (this.focusIndex + delta + N) % N;
    this.applyFocus(true);
  }

  private applyFocus(focusEl = false) {
    this.items.forEach((it, i) => {
      it.el.classList.toggle('rm-focused', i === this.focusIndex);
      it.el.tabIndex = (i === this.focusIndex ? 0 : -1);
    });
    if (focusEl) this.items[this.focusIndex]?.el.focus({ preventScroll: true });
  }

  private angleToIndex(angleRad: number) {
    const N = Math.max(1, this.items.length);
    const step = (Math.PI * 2) / N;
    const base = (this.opts.startAngleDeg * Math.PI / 180);
    const up = -Math.PI / 2;
    let rel = angleRad - (base + up);
    rel = (rel % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    return Math.round(rel / step) % N;
  }

  private flash(el: HTMLElement) {
    const dur = 220, t0 = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      (el.style as any).opacity = String(1 - 0.5 * Math.sin(k * Math.PI));
      if (k < 1) requestAnimationFrame(tick); else (el.style as any).opacity = '1';
    };
    requestAnimationFrame(tick);
  }
}
