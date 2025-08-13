// TitleScreen.ts
// - 플러그블 이펙트 기반 순수 타이틀 표시
// - 폰트 크기: (width%, height%) 동시 제약 → 넘치는 축을 기준으로 자동 맞춤
// - absolute/mount 없음, 외부 append 후 activate()
// - viewport 진입 시 IntersectionObserver로 페이드인(1회 보장)
// - 가로 스크롤 방지 + 세로 잘림 방지

import { GUX, IGUX } from "../gux";

export type EffectDisposer = () => void;
export interface ITitleEffect { name: string; apply(el: HTMLElement): EffectDisposer; }

/* Helpers */
class StyleManager {
  private static injected = new Set<string>();
  static inject(id: string, css: string) {
    if (this.injected.has(id)) return;
    const s = document.createElement("style");
    s.id = id; s.textContent = css; document.head.appendChild(s);
    this.injected.add(id);
  }
}
class FontManager {
  private static loaded = new Set<string>();
  static loadGoogleFont(spec: string) {
    if (this.loaded.has(spec)) return;
    if (!document.querySelector('link[data-gfont-preconnect]')) {
      const l1 = document.createElement("link");
      l1.rel = "preconnect"; l1.href = "https://fonts.googleapis.com";
      l1.setAttribute("data-gfont-preconnect","1"); document.head.appendChild(l1);
      const l2 = document.createElement("link");
      l2.rel = "preconnect"; l2.href = "https://fonts.gstatic.com";
      l2.crossOrigin = "anonymous";
      l2.setAttribute("data-gfont-preconnect","1"); document.head.appendChild(l2);
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(spec)}&display=swap`;
    link.setAttribute("data-gfont", spec);
    document.head.appendChild(link);
    this.loaded.add(spec);
  }
}

/* Options */
export interface TitleScreenOptions {
  title: string;
  googleFont?: string;
  fontFamily?: string;
  color?: string;
  effects?: ITitleEffect[];

  /** 너비 목표: 0~100 (%) – 기본 60 */
  widthPercent?: number;
  /** 높이 목표: 0~100 (%) – 미지정 시 높이 제약 없음 */
  heightPercent?: number;

  /** 기준: viewport | parent | container (각 축 별도) - 기본 'container' */
  widthPercentBasis?: "viewport" | "parent" |"child"| "container";
  heightPercentBasis?: "viewport" | "parent"|"child" | "container";

  /** 폰트 px 클램프 */
  responsive?: { min: number; max: number };

  /** 첫 계산 후 페이드인 */
  appearOnFirstFit?: {
    enable?: boolean; durationMs?: number; easing?: string; delayMs?: number; target?: "container" | "title";
  };
  /** 뷰포트 진입 시 페이드인(IntersectionObserver) */
  appearOnEnterViewport?: {
    enable?: boolean; threshold?: number; rootMargin?: string; once?: boolean;
    durationMs?: number; easing?: string; delayMs?: number; target?: "container" | "title";
  };

  zIndex?: number;

  /** 창 크기 변경 시 폰트 크기를 다시 계산할지 여부 (기본값: true) */
  recalculateOnResize?: boolean;
  /** 내부 DOM 변경 시 폰트 크기를 다시 계산할지 여부 (기본값: true) */
  recalculateOnMutation?: boolean;
}

/* TitleScreen */
export default class RetroTitleScreen extends GUX {
  get Dom() { return this.wrapper; }

  private wrapper = document.createElement("div");
  private guard   = document.createElement("div");
  private titleEl!: HTMLHeadingElement;

  private disposers: EffectDisposer[] = [];

  // 페이드인 제어
  private hasFaded = false;
  private fadeOnceGuard = false;

  private activated = false;

  // 현재 제약값
  private widthPercent: number;
  private heightPercent: number | null;
  private widthBasis: "viewport" | "parent" |"child" |"container";
  private heightBasis: "viewport" | "parent" | "child"| "container";

  // 옵저버/리스너
  private onResize = () => {
    this.fitByConstraints();
    this.settleGuardHeight();
  };
  private mo?: MutationObserver;
  private io?: IntersectionObserver;

  readonly options: Required<
    Omit<
      TitleScreenOptions,
      "googleFont" | "fontFamily" | "effects" |
      "responsive" | "appearOnFirstFit" | "appearOnEnterViewport" |
      "widthPercent" | "heightPercent" |
      "widthPercentBasis" | "heightPercentBasis" |
      "recalculateOnResize" | "recalculateOnMutation"
    >
  > & {
    googleFont?: string; fontFamily?: string; effects: ITitleEffect[];
    responsive: { min: number; max: number };
    appearOnFirstFit: { enable: boolean; durationMs: number; easing: string; delayMs: number; target: "container" | "title" };
    appearOnEnterViewport: { enable: boolean; threshold: number; rootMargin: string; once: boolean; durationMs: number; easing: string; delayMs: number; target: "container" | "title" };
    recalculateOnResize: boolean;
    recalculateOnMutation: boolean;
  };

  constructor(opts: TitleScreenOptions) {
    super();

    this.options = {
      title: opts.title,
      googleFont: opts.googleFont,
      fontFamily: opts.fontFamily,
      color: opts.color ?? "#fff",
      effects: opts.effects ?? [],
      // ✅ responsive.min 기본값을 20으로 변경
      responsive: { min: opts.responsive?.min ?? 20, max: opts.responsive?.max ?? 420 },
      appearOnFirstFit: {
        enable: opts.appearOnFirstFit?.enable ?? true,
        durationMs: opts.appearOnFirstFit?.durationMs ?? 320,
        easing: opts.appearOnFirstFit?.easing ?? "ease-out",
        delayMs: opts.appearOnFirstFit?.delayMs ?? 0,
        target: opts.appearOnFirstFit?.target ?? "container",
      },
      appearOnEnterViewport: {
        enable: opts.appearOnEnterViewport?.enable ?? true,
        threshold: opts.appearOnEnterViewport?.threshold ?? 0.1,
        rootMargin: opts.appearOnEnterViewport?.rootMargin ?? "0px",
        once: opts.appearOnEnterViewport?.once ?? true,
        durationMs: opts.appearOnEnterViewport?.durationMs ?? 320,
        easing: opts.appearOnEnterViewport?.easing ?? "ease-out",
        delayMs: opts.appearOnEnterViewport?.delayMs ?? 0,
        target: opts.appearOnEnterViewport?.target ?? "container",
      },
      zIndex: opts.zIndex ?? 0,
      recalculateOnResize: opts.recalculateOnResize ?? true,
      recalculateOnMutation: opts.recalculateOnMutation ?? false,
    };

    this.widthPercent = Math.max(1, opts.widthPercent ?? 60);
    this.heightPercent = typeof opts.heightPercent === "number" ? Math.max(1, opts.heightPercent) : null;

    this.widthBasis  = opts.widthPercentBasis  ?? "container";
    this.heightBasis = opts.heightPercentBasis ?? "container";

    if (this.options.googleFont) {
      FontManager.loadGoogleFont(this.options.googleFont);
      if (!this.options.fontFamily) {
        this.options.fontFamily = this.options.googleFont.split(":")[0].replace(/\+/g, " ");
      }
    }

    StyleManager.inject(
      "ts-effect-font-override",
      `.chrome, .vectro, .street, .victory, .cop, .dreams, .future, .machine {
        font-size: var(--ts-base-font, 200px) !important;
      }`
    );
  }

  AddChild(_dom: IGUX, ..._param: any): void {}

  RenderHTML(): void {
    this.buildDOM();
    this.applyEffects();

    if (!this.hasFaded && (this.options.appearOnFirstFit.enable || this.options.appearOnEnterViewport.enable)) {
      const t = this.getFadeTarget(this.options.appearOnEnterViewport.target);
      t.style.opacity = "0";
    }
  }

  activate() {
    if (this.activated) return;
    this.activated = true;

    requestAnimationFrame(() => {
      this.afterFontsReady(() => {
        this.fitByConstraints();
        this.settleGuardHeight();
        if (this.options.appearOnFirstFit.enable && !this.options.appearOnEnterViewport.enable) {
          this.playFadeIn();
        }
      });
    });

    if (this.options.recalculateOnResize) {
        window.addEventListener("resize", this.onResize);
    }
    if (this.options.recalculateOnMutation) {
        this.mo = new MutationObserver(() => this.debouncedRecompute());
        this.mo.observe(this.getLatestNode(), { childList: true, subtree: true, attributes: true });
    }

    if (this.options.appearOnEnterViewport.enable && "IntersectionObserver" in window) {
      const ioTarget = this.getFadeTarget(this.options.appearOnEnterViewport.target);
      this.io?.disconnect();
      this.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= this.options.appearOnEnterViewport.threshold) {
            this.playFadeIn();
            if (this.options.appearOnEnterViewport.once) this.io?.disconnect();
            break;
          }
        }
      }, {
        root: null,
        threshold: this.options.appearOnEnterViewport.threshold,
        rootMargin: this.options.appearOnEnterViewport.rootMargin,
      });
      this.io.observe(ioTarget);
    }
  }

  /* ------------------------------ Public APIs ------------------------------ */

  setWidthtPercent(percent: number, basis: "viewport" | "parent" | "child" | "container" = this.widthBasis) {
    this.widthPercent = Math.max(1, percent);
    this.widthBasis = basis;
    this.fitByConstraints();
    this.settleGuardHeight();
  }

  setHeightPercent(percent: number | null, basis: "viewport" | "parent" |"child" | "container" = this.heightBasis) {
    this.heightPercent = (percent == null) ? null : Math.max(1, percent);
    this.heightBasis = basis;
    this.fitByConstraints();
    this.settleGuardHeight();
  }

  setTitle(text: string) {
    this.titleEl.textContent = text;
    this.applyEffects();
    this.fitByConstraints();
    this.settleGuardHeight();
  }

  setEffects(effects: ITitleEffect[]) {
    this.options.effects = effects ?? [];
    this.applyEffects();
    this.fitByConstraints();
    this.settleGuardHeight();
  }

  setColor(color: string) {
    this.options.color = color;
    this.titleEl.style.color = color;
  }

  setFont(googleFontSpec: string, fontFamily?: string) {
    FontManager.loadGoogleFont(googleFontSpec);
    this.options.fontFamily = fontFamily ?? googleFontSpec.split(":")[0].replace(/\+/g, " ");
    this.titleEl.style.fontFamily =
      `'${this.options.fontFamily}', system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
    requestAnimationFrame(() => { this.fitByConstraints(); this.settleGuardHeight(); });
  }

  Show() { this.wrapper.style.display = ""; }
  Hide() { this.wrapper.style.display = "none"; }

  Dispose() {
    window.removeEventListener("resize", this.onResize);
    this.mo?.disconnect();
    this.io?.disconnect();
    this.clearEffects();
  }

  /* ------------------------------ Internals -------------------------------- */

  private async afterFontsReady(fn: () => void) {
    try { await (document as any).fonts?.ready; } catch {}
    fn();
  }

  private buildDOM() {
    Object.assign(this.wrapper.style, {
      display: "block",
      width: "100%",
      boxSizing: "border-box",
      zIndex: String(this.options.zIndex),
      overflowX: "hidden",
    });

    Object.assign(this.guard.style, {
      width: "100%",
      maxWidth: "100vw",
      marginInline: "auto",
      overflowX: "hidden",
      overflowY: "visible",
      display: "grid",
      placeItems: "center",
      transform: "translateZ(0)",
    });

    this.titleEl = document.createElement("h1");
    this.titleEl.className = "game-title";
    this.titleEl.textContent = this.options.title;
    Object.assign(this.titleEl.style, {
      margin: "0",
      lineHeight: "1",
      color: this.options.color,
      textAlign: "center",
      whiteSpace: "nowrap",
      fontFamily: this.options.fontFamily
        ? `'${this.options.fontFamily}', system-ui, -apple-system, Segoe UI, Roboto, sans-serif`
        : "",
    });

    this.guard.appendChild(this.titleEl);
    this.wrapper.appendChild(this.guard);
  }

  private clearEffects() {
    for (const d of this.disposers) { try { d(); } catch {} }
    this.disposers.length = 0;
  }

  private applyEffects() {
    this.clearEffects();
    let target: HTMLElement = this.titleEl;
    for (const eff of this.options.effects) {
      const dispose = eff.apply(target);
      this.disposers.push(dispose);
      const newest = this.findLatestTitleNode();
      if (newest) target = newest;
    }
    this.mo?.disconnect();
    if (this.activated && this.options.recalculateOnMutation) {
      this.mo = new MutationObserver(() => this.debouncedRecompute());
      this.mo.observe(this.getLatestNode(), { childList: true, subtree: true, attributes: true });
    }
    if (this.activated && this.options.appearOnEnterViewport.enable && this.io) {
        this.io.disconnect();
        this.io.observe(this.getFadeTarget(this.options.appearOnEnterViewport.target));
    }
  }

  private findLatestTitleNode(): HTMLElement | null {
    const sel = ".chrome, .vectro, .street, .victory, .cop, .dreams, .future, .machine, .game-title, h1, h2, h3, div, span";
    const nodes = this.wrapper.querySelectorAll<HTMLElement>(sel);
    return nodes.length ? nodes[nodes.length - 1] : this.titleEl;
  }
  private getLatestNode(): HTMLElement { return this.findLatestTitleNode() ?? this.titleEl; }

  private getBasisSize(
    basis: "viewport" | "child" | "parent" | "container",
    axis: "w" | "h"
  ): number {
    if (basis === "viewport") {
      return axis === "w"
        ? (window.innerWidth || document.documentElement.clientWidth || 0)
        : (window.innerHeight || document.documentElement.clientHeight || 0);
    } else if (basis === "child") {
      const p = this.wrapper.children[0];
      if (!p) return 0;
      return axis === "w" ? p.clientWidth : p.clientHeight;
    } else if (basis === "parent") {
      const p = this.wrapper.parentElement;
      if (!p) return 0;
      return axis === "w" ? p.clientWidth : p.clientHeight;
    } else { // "container"
      return axis === "w" ? this.guard.clientWidth : this.guard.clientHeight;
    }
  }

  private fitByConstraints() {
    if (!this.wrapper.isConnected) return;

    const node = this.getLatestNode();

    const originalTransform = node.style.transform;
    node.style.transform = "none";
    const rect = node.getBoundingClientRect();
    node.style.transform = originalTransform;

    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);
    const F = this.getCurrentBasePx(node);
    if (F <= 0) return;

    const basisW = this.getBasisSize(this.widthBasis, "w");
    const targetW = basisW * (this.widthPercent / 100);

    let targetH: number | null = null;
    if (this.heightPercent != null) {
      const basisH = this.getBasisSize(this.heightBasis, "h");
      targetH = basisH * (this.heightPercent / 100);
    }
    
    // ✅ 계산에 사용되는 값들을 콘솔에 출력
    console.log(`[TitleScreen] Fitting constraints:
      - Current Element Size: ${W.toFixed(2)}w x ${H.toFixed(2)}h
      - Target Container Size: ${targetW.toFixed(2)}w x ${(targetH ?? 0).toFixed(2)}h
      - Current Font Size: ${F.toFixed(2)}px`);

    const Fw = F * (targetW / W);
    const Fh = (targetH != null && H > 0) ? (F * (targetH / H)) : Number.POSITIVE_INFINITY;

    let Ftarget = Math.min(Fw, Fh);
    console.log(Ftarget, Fw, Fh);

    Ftarget = Math.max(
      this.options.responsive.min,
      Math.min(this.options.responsive.max, Ftarget)
    );

    this.wrapper.style.setProperty("--ts-base-font", `${Ftarget}px`);
  }

  private getFadeTarget(target: "container" | "title"): HTMLElement {
    return target === "title" ? this.getLatestNode() : this.guard;
  }

  private playFadeIn() {
    if (this.fadeOnceGuard) return;
    this.fadeOnceGuard = true;

    if (this.hasFaded) {
      this.io?.disconnect();
      return;
    }
    this.hasFaded = true;
    this.io?.disconnect();

    const cfg = this.options.appearOnEnterViewport.enable
      ? this.options.appearOnEnterViewport
      : this.options.appearOnFirstFit;

    const el = this.getFadeTarget(cfg.target);
    const from = (getComputedStyle(el).opacity || "0");
    const anim = el.animate(
      [{ opacity: from }, { opacity: "1" }],
      { duration: cfg.durationMs, easing: cfg.easing, delay: cfg.delayMs, fill: "forwards" }
    );
    anim.onfinish = () => { el.style.opacity = "1"; };
  }

  private debouncing = false;
  private debouncedRecompute() {
    if (this.debouncing) return;
    this.debouncing = true;
    requestAnimationFrame(() => {
      this.fitByConstraints();
      this.settleGuardHeight();
      this.debouncing = false;
    });
  }

  private getCurrentBasePx(node: HTMLElement): number {
    const v = getComputedStyle(this.wrapper).getPropertyValue("--ts-base-font").trim();
    if (v.endsWith("px")) return parseFloat(v) || 0;
    return parseFloat(getComputedStyle(node).fontSize) || 0;
  }

  private settleGuardHeight() {
    if (!this.guard.isConnected) return;

    if (this.heightPercent != null) {
      const basisH = this.getBasisSize(this.heightBasis, "h");
      const targetH = Math.max(0, Math.round(basisH * (this.heightPercent / 100)));
      this.guard.style.height = `${targetH}px`;
    } else {
      this.guard.style.height = "";
    }
  }
}