// RadialMenuUI.ts
// A drop-in HTML radial menu overlay for any Three.js game.
// by you + ChatGPT (safe center-click + blocker fix)

import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { UxLayerIndex } from "../gux";

type RingStyle = 'none' | 'solid' | 'line';
type Shape = 'circle' | 'rounded' | 'square' | 'hex';
type Easing = 'outBack' | 'outCubic';
type OpenAt = 'center' | 'pointer' | 'button';
type CssLength = number | string;
type TriggerButtonPositionName =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';
type TriggerButtonPosition =
  | TriggerButtonPositionName
  | {
      top?: CssLength;
      right?: CssLength;
      bottom?: CssLength;
      left?: CssLength;
      transform?: string;
    };
type TriggerButtonMenuOpenAt = 'center' | 'button' | 'pointer';

export type IconDef =
  | string
  | { type: 'emoji' | 'text'; value: string }
  | { type: 'img'; value: string; alt?: string }
  | { type: 'svgInline'; value: string } // ⚠ trusted only
  | { type: 'webfontFA'; value: string } // e.g. "fa-solid fa-shield-halved"
  | { type: 'webfontMS'; value: string }; // e.g. "explore"

export type MenuItemDef =
  | IconDef
  | {
      icon: IconDef;
      label?: string;
      id?: string;
      ariaLabel?: string;
      hotkey?: string;
      disabled?: boolean;
      keepOpen?: boolean;
      onSelect?: (def: IconDef, index: number) => void;
      onFocus?: (def: IconDef, index: number) => void;
      data?: any;
    };

export interface RadialMenuTriggerButtonOptions {
  enabled: boolean;
  position: TriggerButtonPosition;
  margin: number;
  offsetX: number;
  offsetY: number;
  size: number;
  shape?: Shape;
  icon: IconDef;
  label?: string;
  ariaLabel: string;
  title?: string;
  className?: string;
  fontScale: number;

  /** 버튼 클릭 후 메뉴가 열릴 위치 */
  menuOpenAt: TriggerButtonMenuOpenAt;
}

/** Center-click 안전 옵션 포함 */
export interface RadialMenuOptions {
  // appearance & layout
  radius: number;
  itemSize: number;
  startAngleDeg: number;
  shape: Shape;
  ringStyle: RingStyle;
  fontScale: number;

  // theme
  theme: keyof typeof DEFAULT_THEMES | 'custom';
  themeVars?: Partial<ThemeVars>;
  pageBg?: string;

  // behavior
  animateMs: number;
  spinOnOpen: number;
  easing: Easing;
  autoCloseOnMiss: boolean;
  openAt: OpenAt;
  centerClickThresholdPx: number;
  enableGlobalCenterClick: boolean;
  enableOutsideClickClose: boolean;
  triggerButton?: Partial<RadialMenuTriggerButtonOptions>;

  // integration
  parent?: HTMLElement;
  injectStyles: boolean;
  pollGamepad: boolean;
  onSelect?: (def: IconDef, index: number) => void;

  /** 전역 열림 차단: 문서에 이 셀렉터 중 하나라도 "보이게" 존재하면 열지 않음 */
  modalOpenQuery: string;

  /** 클릭 경로에 아래 셀렉터가 하나라도 있으면 열지 않음 */
  blockerSelectors: string[];

  /** 이 컨테이너 내부 클릭일 때만 열기 (선택): HTMLElement 또는 selector */
  onlyWhenTargetWithin?: HTMLElement | string;

  /** 최종 커스텀 가드: false를 반환하면 열지 않음 */
  openGuard?: (e: PointerEvent) => boolean;
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

const DEFAULT_TRIGGER_BUTTON_OPTIONS: RadialMenuTriggerButtonOptions = {
  enabled: false,
  position: 'bottom-left',
  margin: 24,
  offsetX: 0,
  offsetY: 0,
  size: 64,
  icon: { type: 'text', value: '☰' },
  ariaLabel: 'Open menu',
  fontScale: 0.48,
  menuOpenAt: 'center',
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
  enableOutsideClickClose: true,
  triggerButton: DEFAULT_TRIGGER_BUTTON_OPTIONS,

  parent: undefined,
  injectStyles: true,
  pollGamepad: true,
  onSelect: undefined,

  // 안전 기본값들
  modalOpenQuery: [
    '[aria-modal="true"]',
    '.modal[open]', '.modal.open',
    '.dialog[open]', '.dialog.open',
    '[role="dialog"].open',
    '[data-dialog-open="true"]',
    '.MuiModal-root', '.ant-modal-root',
    '.swal2-container', '.sweet-alert'
  ].join(','),

  blockerSelectors: [
    'input', 'textarea', 'select', 'button', 'a',
    '[contenteditable="true"]',
    '[role="menu"]', '[role="listbox"]',
    '[role="dialog"]', '[aria-modal="true"]',
    '.overlay', '.modal', '.dialog',
    '.ui-block', '.hud-block',
    '[data-rm-no-open]'
  ],

  onlyWhenTargetWithin: undefined,
  openGuard: undefined
};

let STYLE_INJECTED = false;
const CSS_TEXT = `
.rm-root{position:fixed;inset:0;pointer-events:none;z-index:9999}
.rm-radial{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:0;height:0;pointer-events:none}
.rm-trigger{position:fixed;display:inline-flex;align-items:center;justify-content:center;gap:6px;width:64px;height:64px;padding:0;border:1px solid var(--item-border);border-radius:8px;color:var(--item-fg);background:radial-gradient(120% 120% at 30% 30%, var(--item-bg-1), var(--item-bg-2));box-shadow:var(--item-shadow);cursor:pointer;pointer-events:auto;user-select:none;z-index:1;transition:transform .12s ease-out, filter .12s ease-out, opacity .12s ease-out}
.rm-trigger:hover{filter:brightness(1.08)}
.rm-trigger:active{transform:scale(0.96)}
.rm-trigger:focus-visible{outline:2px solid color-mix(in srgb, var(--item-fg) 60%, transparent);outline-offset:3px}
.rm-trigger-label{font:600 13px/1 system-ui,sans-serif;color:var(--item-fg)}
.rm-trigger-shape-circle{border-radius:999px}
.rm-trigger-shape-rounded{border-radius:20px}
.rm-trigger-shape-square{border-radius:8px}
.rm-trigger-shape-hex{border-radius:0;clip-path:polygon(25% 6.7%,75% 6.7%,100% 50%,75% 93.3%,25% 93.3%,0% 50%)}
.rm-radial .rm-ring,.rm-radial .rm-ring2{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:0;height:0;border-radius:50%;pointer-events:none;opacity:0;transition:opacity .25s}
.rm-radial .rm-ring{box-shadow:var(--ring-glow);background:var(--ring-bg)}
.rm-radial .rm-ring2{box-shadow:0 0 0 var(--ring-width) var(--ring-stroke) inset}
.rm-radial.open .rm-ring,.rm-radial.open .rm-ring2{opacity:.85}
.rm-item{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:72px;display:grid;place-items:center;user-select:none;cursor:pointer;border:none;outline:none;color:var(--item-fg);background:radial-gradient(120% 120% at 30% 30%, var(--item-bg-1), var(--item-bg-2));box-shadow:var(--item-shadow);transition:transform .12s ease-out, box-shadow .12s ease-out, opacity .12s, background .2s;pointer-events:auto;border-radius:999px;font-size:0}
.rm-item.rm-has-label{display:grid;place-items:center;overflow:visible}
.rm-item:hover{transform:translate(-50%,-50%) scale(1.06)}
.rm-item:active{transform:translate(-50%,-50%) scale(0.96)}
.rm-item:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb, var(--item-fg) 60%, transparent), var(--item-shadow)}
.rm-item.rm-focused{transform:translate(-50%,-50%) scale(1.08)}
.rm-item[aria-disabled="true"]{opacity:.5;filter:saturate(.7);cursor:not-allowed;pointer-events:none}
.rm-ic{display:inline-grid;place-items:center}
.rm-item-label{position:absolute;left:50%;top:calc(100% + 6px);transform:translateX(-50%);display:block;max-width:92px;font:700 11px/1.1 system-ui,-apple-system,Segoe UI,Roboto,Pretendard,Apple SD Gothic Neo,Arial,sans-serif;color:var(--item-fg);text-shadow:0 1px 4px rgba(0,0,0,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}
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

/* ✅ 닫힘 상태에서는 완전 비히트 처리 */
.rm-radial:not(.open) .rm-item,
.rm-radial:not(.open) .rm-ring,
.rm-radial:not(.open) .rm-ring2 {
  pointer-events: none !important;
  cursor: default !important;
}

/* ✅ 클래스 기반 플래시 */
@keyframes rm-flash { 0%{opacity:1} 50%{opacity:.5} 100%{opacity:1} }
.rm-flashing { animation: rm-flash .22s ease-out; }
.rm-closing .rm-item { opacity: 0 !important; }
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
  const dx = x - innerWidth / 2, dy = y - innerHeight / 2;
  return Math.hypot(dx, dy) < thresholdPx * 0.25;
}
function cssLength(v: CssLength): string {
  return typeof v === 'number' ? `${v}px` : v;
}
function cssPx(v: number): string {
  return `${v}px`;
}
function cssCalc(base: string, offset: number): string {
  return offset === 0 ? base : `calc(${base} + ${offset}px)`;
}

/** 보이는 요소인지 대략 판정 */
function isVisible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const style = getComputedStyle(el as HTMLElement);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none';
}
/** composedPath에서 selector에 매칭되는 가장 가까운 요소 */
function closestInPath(path: EventTarget[], selector: string): Element | null {
  for (const t of path) {
    if (!(t instanceof Element)) continue;
    const m = t.closest(selector);
    if (m) return m;
  }
  return null;
}

/** 내부 표준화된 아이템 엔트리 */
type ItemEntry = {
  el: HTMLButtonElement;
  def: IconDef;
  meta: {
    label?: string;
    id?: string;
    ariaLabel?: string;
    hotkey?: string;
    disabled?: boolean;
    keepOpen?: boolean;
    onSelect?: (def: IconDef, index: number) => void;
    onFocus?: (def: IconDef, index: number) => void;
    data?: any;
  };
};

export class RadialMenuUI implements ILoop {
  LoopId: number = 0;
  readonly opts: RadialMenuOptions;
  readonly root: HTMLElement;
  readonly radial: HTMLElement;
  readonly ring: HTMLElement;
  readonly ring2: HTMLElement;

  private items: ItemEntry[] = [];
  private isOpen = false;
  private progress = 0;
  private t0 = 0;
  private focusIndex = 0;
  private lastPadMoveAt = 0;
  private destroyed = false;

  private pointerOpenHandler?: (e: PointerEvent) => void;
  private triggerButton?: HTMLButtonElement;
  private triggerButtonHandler?: (e: PointerEvent) => void;
  private openWithinEl: HTMLElement | null = null;
  private hardBlocked = false; // 프로그래매틱 강제 차단

  constructor(
    eventCtrl: IEventController,
    options?: Partial<RadialMenuOptions>
  ) {
    this.opts = {
      ...DEFAULT_OPTIONS,
      ...options,
      triggerButton: {
        ...DEFAULT_TRIGGER_BUTTON_OPTIONS,
        ...(options?.triggerButton ?? {}),
      },
    };

    // resolve onlyWhenTargetWithin
    if (typeof this.opts.onlyWhenTargetWithin === 'string') {
      this.openWithinEl = document.querySelector(this.opts.onlyWhenTargetWithin) as HTMLElement | null;
    } else {
      this.openWithinEl = this.opts.onlyWhenTargetWithin ?? null;
    }

    if (this.opts.injectStyles) injectStylesOnce();

    // build DOM
    const parent = this.opts.parent ?? document.body;

    const root = document.createElement('div');
    root.className = 'rm-root';
    root.style.zIndex = UxLayerIndex.RingMenu.toString();
    parent.appendChild(root);
    this.root = root;

    const radial = document.createElement('div');
    radial.className = `rm-radial rm-shape-${this.opts.shape}`;
    radial.style.setProperty('--ring-width', DEFAULT_THEMES['Dark Neon'].vars['--ring-width']);
    root.appendChild(radial);
    this.radial = radial;

    // rings
    this.ring = document.createElement('div');
    this.ring.className = 'rm-ring';
    this.ring2 = document.createElement('div');
    this.ring2.className = 'rm-ring2';
    radial.appendChild(this.ring);
    radial.appendChild(this.ring2);

    // theme & ring style
    this.applyTheme(this.opts.theme, this.opts.themeVars, this.opts.pageBg);
    this.applyShape(this.opts.shape);
    this.applyRingStyle(this.opts.ringStyle);
    this.syncTriggerButton();

    // input
    this.syncGlobalPointerHandler();

    // keyboard
    window.addEventListener('keydown', (e) => this.onKey(e));
    eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  /** 외부에서 전역 차단/허용 */
  setBlocked(block: boolean) { this.hardBlocked = !!block; }

  /** Mount under a different parent (optional). */
  mount(parent: HTMLElement) { if (this.root.parentElement !== parent) parent.appendChild(this.root); }
  unmount() { if (this.root.parentElement) this.root.parentElement.removeChild(this.root); }

  /** Update per-frame (call in your game loop). */
  update() {
    const now = performance.now();
    if (this.destroyed) return;

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
        this.radial.classList.remove('open', 'rm-animating', 'rm-closing');
        for (const it of this.items) {
          it.el.classList.remove('rm-flashing');
          (it.el.style as any).opacity = '0';
          it.el.style.pointerEvents = 'none';
          it.el.style.cursor = 'default';
        }
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
    this.removeTriggerButton();
    this.root.remove();
  }

  // ---------- Public API ----------
  setItems(defs: (MenuItemDef | string)[]) {
    // cleanup
    for (const it of this.items) it.el.remove();
    this.items.length = 0;

    const normalized = defs.map<MenuItemDef>(d => typeof d === 'string' || this.isIconDef(d) ? d as IconDef : d as any);

    normalized.forEach((src, idx) => {
      const icon = (this.isIconDef(src) ? src : src.icon) as IconDef;
      const meta = this.isIconDef(src)
        ? { label: undefined, id: undefined, ariaLabel: undefined, hotkey: undefined, disabled: false, keepOpen: false }
        : {
            label: src.label, id: src.id, ariaLabel: src.ariaLabel, hotkey: src.hotkey, disabled: !!src.disabled,
            keepOpen: !!src.keepOpen, onSelect: src.onSelect, onFocus: src.onFocus, data: src.data
          };

      const el = document.createElement('button');
      el.className = 'rm-item';
      el.tabIndex = -1;
      el.style.width = el.style.height = this.opts.itemSize + 'px';
      if (meta.ariaLabel) el.setAttribute('aria-label', meta.ariaLabel);
      if (meta.disabled) el.setAttribute('aria-disabled', 'true');

      const node = createIconNode(icon, this.opts.itemSize, this.opts.fontScale);
      el.appendChild(node);
      if (meta.label) {
        el.classList.add('rm-has-label');
        const label = document.createElement('span');
        label.className = 'rm-item-label';
        label.textContent = meta.label;
        label.setAttribute('aria-hidden', 'true');
        el.appendChild(label);
      }

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.progress < 1 || meta.disabled) return;
        this.flash(el);
        meta.onSelect?.(icon, idx);
        this.opts.onSelect?.(icon, idx);
        if (!meta.keepOpen) this.close();
      });

      el.addEventListener('pointerenter', () => {
        const i = this.items.findIndex(it => it.el === el);
        if (i >= 0) { this.focusIndex = i; this.applyFocus(false); meta.onFocus?.(icon, i); }
      });

      this.radial.appendChild(el);
      this.items.push({ el, def: icon, meta });
    });

    this.updateRing(this.opts.radius);
    this.layout(0, 0);
    this.focusIndex = 0;
    this.applyFocus();
  }

  addItem(def: MenuItemDef | string = '🗺️') {
    const list = this.getItemDefs();
    list.push(def as any);
    this.setItems(list);
  }
  removeLast() {
    if (this.items.length <= 1) return;
    const list = this.getItemDefs().slice(0, -1);
    this.setItems(list);
  }
  removeAt(index: number) {
    const list = this.getItemDefs();
    if (index < 0 || index >= list.length) return;
    list.splice(index, 1);
    this.setItems(list);
  }
  updateItem(index: number, patch: Partial<Omit<NonNullable<Extract<MenuItemDef, object>>, 'icon'>> & { icon?: IconDef }) {
    const list = this.getItemDefs();
    if (index < 0 || index >= list.length) return;
    let cur = list[index];
    if (typeof cur === 'string' || this.isIconDef(cur)) cur = { icon: cur as IconDef };
    const merged = { ...(cur as any), ...(patch ?? {}) };
    list[index] = merged;
    this.setItems(list);
  }

  open() {
    if (this.items.length === 0) return;
    if (this.isOpen) return;
    this.isOpen = true;
    this.t0 = performance.now();
    this.progress = 0;
    this.radial.classList.remove('rm-closing');
    this.radial.classList.add('open', 'rm-animating');
    (this.root.style as any).pointerEvents = 'auto';
    this.layout(0, this.opts.spinOnOpen);
    this.focusIndex = 0;
    this.applyFocus(true);
  }

  /** Open with radial centered on the viewport. */
  openAtCenter() {
    this.radial.style.left = '50%';
    this.radial.style.top = '50%';
    this.radial.style.transform = 'translate(-50%,-50%)';
    this.open();
  }

  /** Open with radial centered at given page coords. */
  openAt(pageX: number, pageY: number) {
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
    this.radial.classList.add('rm-animating', 'rm-closing');
  }

  updateOptions(patch: Partial<RadialMenuOptions>) {
    const prevTriggerButton = this.opts.triggerButton;
    Object.assign(this.opts, patch);
    if (patch.triggerButton !== undefined) {
      this.opts.triggerButton = {
        ...DEFAULT_TRIGGER_BUTTON_OPTIONS,
        ...(prevTriggerButton ?? {}),
        ...patch.triggerButton,
      };
    }
    if (patch.onlyWhenTargetWithin !== undefined) {
      this.openWithinEl = typeof patch.onlyWhenTargetWithin === 'string'
        ? (document.querySelector(patch.onlyWhenTargetWithin) as HTMLElement | null)
        : (patch.onlyWhenTargetWithin ?? null);
    }
    this.applyShape(this.opts.shape);
    this.applyRingStyle(this.opts.ringStyle);
    this.applyTheme(this.opts.theme, this.opts.themeVars, this.opts.pageBg);

    if (patch.itemSize !== undefined || patch.fontScale !== undefined) {
      this.setItems(this.getItemDefs());
    } else {
      this.updateRing(this.opts.radius);
      this.layout(this.opts.radius * this.progress, 0);
    }
    this.syncTriggerButton();
    this.syncGlobalPointerHandler();
  }

  // ---------- Internals ----------
  private syncGlobalPointerHandler() {
    const shouldListen = this.opts.enableGlobalCenterClick || this.opts.enableOutsideClickClose;
    if (shouldListen && !this.pointerOpenHandler) {
      this.pointerOpenHandler = (e: PointerEvent) => this.onGlobalPointerDown(e);
      window.addEventListener('pointerdown', this.pointerOpenHandler, { capture: true });
      return;
    }
    if (!shouldListen && this.pointerOpenHandler) {
      window.removeEventListener('pointerdown', this.pointerOpenHandler, { capture: true } as any);
      this.pointerOpenHandler = undefined;
    }
  }

  private onGlobalPointerDown(e: PointerEvent) {
    const path = (e.composedPath?.() ?? []) as EventTarget[];
    const clickedTrigger = !!this.triggerButton && path.includes(this.triggerButton);

    if (this.isOpen) {
      if (this.opts.enableOutsideClickClose && this.opts.autoCloseOnMiss && !path.includes(this.radial) && !clickedTrigger) {
        this.close();
      }
      return;
    }

    if (!this.opts.enableGlobalCenterClick) return;
    if (this.opts.openAt === 'button') return;

    // 열림 가드
    if (this.shouldBlockOpen(e, path)) return;

    if (this.opts.openAt === 'center') {
      if (isCenterClick(e.clientX, e.clientY, this.opts.centerClickThresholdPx)) this.openAtCenter();
    } else {
      this.openAt(e.clientX, e.clientY);
    }
  }

  private getTriggerButtonOptions(): RadialMenuTriggerButtonOptions {
    return {
      ...DEFAULT_TRIGGER_BUTTON_OPTIONS,
      ...(this.opts.triggerButton ?? {}),
    };
  }

  private shouldUseTriggerButton() {
    const trigger = this.getTriggerButtonOptions();
    return this.opts.openAt === 'button' || trigger.enabled;
  }

  private syncTriggerButton() {
    if (!this.shouldUseTriggerButton()) {
      this.removeTriggerButton();
      return;
    }

    if (!this.triggerButton) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-rm-trigger', 'true');
      this.triggerButtonHandler = (e: PointerEvent) => this.onTriggerButtonPointerDown(e);
      btn.addEventListener('pointerdown', this.triggerButtonHandler);
      this.root.appendChild(btn);
      this.triggerButton = btn;
    }

    this.applyTriggerButtonOptions();
  }

  private removeTriggerButton() {
    if (!this.triggerButton) return;
    if (this.triggerButtonHandler) this.triggerButton.removeEventListener('pointerdown', this.triggerButtonHandler);
    this.triggerButton.remove();
    this.triggerButton = undefined;
    this.triggerButtonHandler = undefined;
  }

  private applyTriggerButtonOptions() {
    if (!this.triggerButton) return;

    const trigger = this.getTriggerButtonOptions();
    const btn = this.triggerButton;
    const shape = trigger.shape ?? this.opts.shape;
    btn.className = trigger.className
      ? `rm-trigger rm-trigger-shape-${shape} ${trigger.className}`
      : `rm-trigger rm-trigger-shape-${shape}`;
    btn.style.width = btn.style.height = cssPx(trigger.size);
    btn.setAttribute('aria-label', trigger.ariaLabel);
    if (trigger.title) btn.title = trigger.title;
    else btn.removeAttribute('title');

    while (btn.firstChild) btn.removeChild(btn.firstChild);
    btn.appendChild(createIconNode(trigger.icon, trigger.size, trigger.fontScale));
    if (trigger.label) {
      const label = document.createElement('span');
      label.className = 'rm-trigger-label';
      label.textContent = trigger.label;
      btn.appendChild(label);
      btn.style.width = 'auto';
      btn.style.minWidth = cssPx(trigger.size);
      btn.style.padding = '0 14px';
    } else {
      btn.style.minWidth = '';
      btn.style.padding = '0';
    }

    this.applyTriggerButtonPosition(btn, trigger);
  }

  private applyTriggerButtonPosition(btn: HTMLElement, trigger: RadialMenuTriggerButtonOptions) {
    btn.style.top = '';
    btn.style.right = '';
    btn.style.bottom = '';
    btn.style.left = '';
    btn.style.transform = '';

    const pos = trigger.position;
    if (typeof pos !== 'string') {
      if (pos.top !== undefined) btn.style.top = cssLength(pos.top);
      if (pos.right !== undefined) btn.style.right = cssLength(pos.right);
      if (pos.bottom !== undefined) btn.style.bottom = cssLength(pos.bottom);
      if (pos.left !== undefined) btn.style.left = cssLength(pos.left);
      if (pos.transform !== undefined) btn.style.transform = pos.transform;
      return;
    }

    const x = trigger.offsetX;
    const y = trigger.offsetY;
    const margin = trigger.margin;

    switch (pos) {
      case 'top-left':
        btn.style.left = cssPx(margin + x);
        btn.style.top = cssPx(margin + y);
        break;
      case 'top-center':
        btn.style.left = cssCalc('50%', x);
        btn.style.top = cssPx(margin + y);
        btn.style.transform = 'translateX(-50%)';
        break;
      case 'top-right':
        btn.style.right = cssPx(margin - x);
        btn.style.top = cssPx(margin + y);
        break;
      case 'center-left':
        btn.style.left = cssPx(margin + x);
        btn.style.top = cssCalc('50%', y);
        btn.style.transform = 'translateY(-50%)';
        break;
      case 'center':
        btn.style.left = cssCalc('50%', x);
        btn.style.top = cssCalc('50%', y);
        btn.style.transform = 'translate(-50%,-50%)';
        break;
      case 'center-right':
        btn.style.right = cssPx(margin - x);
        btn.style.top = cssCalc('50%', y);
        btn.style.transform = 'translateY(-50%)';
        break;
      case 'bottom-left':
        btn.style.left = cssPx(margin + x);
        btn.style.bottom = cssPx(margin - y);
        break;
      case 'bottom-center':
        btn.style.left = cssCalc('50%', x);
        btn.style.bottom = cssPx(margin - y);
        btn.style.transform = 'translateX(-50%)';
        break;
      case 'bottom-right':
        btn.style.right = cssPx(margin - x);
        btn.style.bottom = cssPx(margin - y);
        break;
    }
  }

  private onTriggerButtonPointerDown(e: PointerEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (this.isOpen) {
      this.close();
      return;
    }
    if (this.shouldBlockTriggerOpen(e)) return;

    const trigger = this.getTriggerButtonOptions();
    if (trigger.menuOpenAt === 'center') {
      this.openAtCenter();
      return;
    }
    if (trigger.menuOpenAt === 'pointer') {
      this.openAt(e.clientX, e.clientY);
      return;
    }

    this.openAtTriggerButton();
  }

  private openAtTriggerButton() {
    if (!this.triggerButton) {
      this.openAtCenter();
      return;
    }

    const r = this.triggerButton.getBoundingClientRect();
    this.openAt(r.left + r.width / 2, r.top + r.height / 2);
  }

  private shouldBlockTriggerOpen(e: PointerEvent): boolean {
    if (this.hardBlocked) return true;

    const modalCandidates = Array.from(document.querySelectorAll(this.opts.modalOpenQuery));
    if (modalCandidates.some(isVisible)) return true;

    if (typeof this.opts.openGuard === 'function') {
      try { if (!this.opts.openGuard(e)) return true; } catch { return true; }
    }

    return false;
  }

  private applyTheme(name: string, override?: Partial<ThemeVars>, pageBg?: string) {
    const theme = name !== 'custom' ? DEFAULT_THEMES[name] ?? DEFAULT_THEMES['Dark Neon'] : null;
    const vars: ThemeVars = {
      ...(theme ? theme.vars : DEFAULT_THEMES['Dark Neon'].vars),
      ...(override ?? {}),
    } as ThemeVars;
    for (const [k, v] of Object.entries(vars)) {
      this.root.style.setProperty(k, v);
      this.radial.style.setProperty(k, v);
    }
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
    const N = this.items.length;
    if (N === 0) return;
    const step = (Math.PI * 2) / N;
    const base = (this.opts.startAngleDeg * Math.PI / 180) + rot;
    for (let i = 0; i < N; i++) {
      const ang = base + step * i;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      const el = this.items[i].el;

      el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;

      const visible = r > 0 && this.isOpen;
      el.style.opacity = visible ? '1' : '0';
      el.style.pointerEvents = visible ? 'auto' : 'none';   // ✅ 보강
      el.style.cursor = visible ? 'pointer' : 'default';    // ✅ 보강
    }
  }

  private onKey(e: KeyboardEvent) {
    if (!this.isOpen || this.progress < 1) return;

    const N = this.items.length; if (!N) return;

    // 단축키 매칭
    const hk = this.items.findIndex(it => !!it.meta.hotkey && e.code === it.meta.hotkey);
    if (hk >= 0) {
      e.preventDefault();
      const target = this.items[hk];
      if (!target.meta.disabled) target.el.click();
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) e.preventDefault();

    if (e.key === 'ArrowRight') this.moveFocus(1);
    else if (e.key === 'ArrowLeft') this.moveFocus(-1);
    else if (e.key === 'ArrowUp') this.moveFocus(Math.floor(N / 2));
    else if (e.key === 'ArrowDown') this.moveFocus(-Math.floor(N / 2));
    else if (e.key === 'Enter' || e.key === ' ') this.items[this.focusIndex]?.el.click();
  }

  private moveFocus(delta: number) {
    const N = this.items.length;
    if (N === 0) return;
    this.focusIndex = (this.focusIndex + delta + N) % N;
    this.applyFocus(true);
    const it = this.items[this.focusIndex];
    it.meta.onFocus?.(it.def, this.focusIndex);
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

  /** 클래스 기반 플래시 */
  private flash(el: HTMLElement) {
    el.classList.remove('rm-flashing');
    // 강제 리플로우로 애니메이션 재시작
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (el as any).offsetWidth;
    el.classList.add('rm-flashing');
    setTimeout(() => el.classList.remove('rm-flashing'), 240);
  }

  private isIconDef(d: any): d is IconDef {
    if (typeof d === 'string') return true;
    return !!(d && typeof d === 'object' && 'type' in d && 'value' in d);
  }

  private getItemDefs(): MenuItemDef[] {
    return this.items.map<MenuItemDef>(({ def, meta }) => {
      const pure =
        !meta.label && !meta.id && !meta.ariaLabel && !meta.hotkey && !meta.disabled &&
        !meta.keepOpen && !meta.onSelect && !meta.onFocus && meta.data === undefined;
      return pure ? def : { icon: def, ...meta };
    });
  }

  /** 최종 열림 차단 로직 — 메뉴 자신은 검사에서 제외 */
  private shouldBlockOpen(e: PointerEvent, path: EventTarget[]): boolean {
    if (this.hardBlocked) return true;

    // 1) 모달/다이얼로그가 열려 있고 "보이면" 차단
    const modalCandidates = Array.from(document.querySelectorAll(this.opts.modalOpenQuery));
    if (modalCandidates.some(isVisible)) return true;

    // 2) 클릭 경로가 차단 셀렉터에 속하면 차단 (단, 메뉴 자기자신은 제외)
    const els = path.filter((t): t is Element => t instanceof Element);
    const outsideMenu = els.filter(el => !this.radial.contains(el));

    for (const sel of this.opts.blockerSelectors) {
      if (outsideMenu.some(el => el.matches(sel) || el.closest(sel))) return true;
    }

    // 3) 범위 제한: 지정된 컨테이너 내부 클릭만 허용
    if (this.openWithinEl) {
      const hit = els[0];
      if (!hit || !this.openWithinEl.contains(hit)) return true;
    }

    // 4) 사용자 커스텀 가드
    if (typeof this.opts.openGuard === 'function') {
      try { if (!this.opts.openGuard(e)) return true; } catch { return true; }
    }

    return false;
  }
}

// ---------- icon factory ----------
function createIconNode(def: IconDef, baseSize: number, fontScale: number): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'rm-ic';

  const sizePx = Math.round(baseSize * fontScale);
  const svgSize = '70%';

  const d = typeof def === 'string' ? ({ type: 'emoji', value: def } as any) : def;

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
      div.innerHTML = (d.value || '').trim(); // ⚠ trusted only
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
