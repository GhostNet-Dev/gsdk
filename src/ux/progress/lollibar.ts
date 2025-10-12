// LolliBar.ts — scoped, accessible, data-size aware progress bar
export default class LolliBar {
  // State
  private value: number;
  private max: number;
  private ratio: number; // 0~100
  private title: string;
  private color: string;
  private top: number;
  private left: number;
  private width: string;

  // DOM refs
  private parent?: HTMLElement;
  dom?: HTMLDivElement;          // component root
  private barEl?: HTMLDivElement;        // filled bar
  private percEl?: HTMLSpanElement;      // label

  // Styling
  private styleId: string;
  private keyframesName: string;

  constructor(
    parent?: HTMLElement,
    {
      title = "",
      color = "#FF9a1a",
      initValue = 90,
      max = 100,
      top = 0,
      left = 0,
      width = "30%",
    }: {
      title?: string;
      color?: string;
      initValue?: number;
      max?: number;
      top?: number;
      left?: number;
      width?: string;
    } = {}
  ) {
    this.parent = parent;

    this.title = title;
    this.color = color;
    this.value = initValue;
    this.max = Math.max(1, max); // zero-division guard
    this.top = top;
    this.left = left;
    this.width = width;

    this.ratio = this.clampPercent((this.value / this.max) * 100);

    // unique style / keyframes names per instance to avoid collisions
    const suf = Math.random().toString(36).slice(2, 8);
    this.styleId = `lollibar-style-${suf}`;
    this.keyframesName = `lolliMove_${suf}`;
  }

  /** Create DOM and styles (idempotent). */
  RenderHTML() {
    if (!this.dom) {
      // Root
      const root = document.createElement("div");
      root.className = "lollibar-wrapper p-1";
      root.style.position = "relative";
      root.style.top = `${this.top}px`;
      root.style.left = `${this.left}px`;
      root.style.width = this.width;
      root.style.maxWidth = "100%";

      // Progress container
      const progress = document.createElement("div");
      progress.className = "lolli-progress-bar";

      // Filled bar
      const bar = document.createElement("div");
      bar.className = "lolli-bar";
      // data-size: store max for semantics / later reads
      bar.dataset.size = String(this.max);

      // ARIA (accessibility)
      bar.setAttribute("role", "progressbar");
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", String(this.max));
      bar.setAttribute("aria-valuenow", String(Math.round(this.value)));

      // Label
      const perc = document.createElement("span");
      perc.className = "lolli-perc";
      perc.textContent =
        this.title ? `${this.title} ${this.value.toFixed(1)}%` : `${this.value.toFixed(1)}%`;

      bar.appendChild(perc);
      progress.appendChild(bar);
      root.appendChild(progress);

      this.dom = root;
      this.barEl = bar;
      this.percEl = perc;
    }

    // Styles (only once per instance)
    this.applyDynamicStyle(
      this.styleId,
      `
.lollibar-wrapper { /* positioning set inline */ }

.lolli-progress-bar {
  height: 26px;
  width: 100%;
  background-color: #BFADA3;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 2px 0 10px inset rgba(0,0,0,0.2);
  position: relative;
}

.lolli-bar {
  display: block;                /* avoid external CSS override issues */
  width: 0;                      /* will animate to ratio */
  height: 100%;
  background-color: ${this.color};

  /* "lollipop" diagonal sheen stripes */
  background-image: linear-gradient(
    -45deg,
    rgba(255, 255, 255, .2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, .2) 50%,
    rgba(255, 255, 255, .2) 75%,
    transparent 75%,
    transparent
  );
  background-size: 30px 30px;
  animation: ${this.keyframesName} 2s linear infinite;

  box-shadow: 2px 0 10px inset rgba(0,0,0,0.2);
  transition: width 0.6s ease-out;
}

@keyframes ${this.keyframesName} {
  0% { background-position: 0 0; }
  100% { background-position: 30px 30px; }
}

.lolli-perc {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #fff;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0,0,0,.35);
}
`
    );

    // Append if parent provided and not already attached
    if (this.parent && !this.dom.parentElement) {
      this.parent.appendChild(this.dom);
    }
  }

  /** Show (animate to current ratio). Call after RenderHTML() */
  Show() {
    if (!this.dom || !this.barEl) throw new Error("RenderHTML() must be called before Show().");

    // Ensure attached
    if (this.parent && !this.dom.parentElement) {
      this.parent.appendChild(this.dom);
    }

    // trigger transition (defer to next frame for reliable CSS transition)
    requestAnimationFrame(() => {
      this.barEl!.style.width = `${this.ratio}%`;
    });
  }

  /** Update current value (and optionally max). */
  updateValue(value: number, max?: number) {
    if (!this.barEl) return;

    // Update max if provided (and sync data-size + ARIA)
    if (typeof max === "number" && max > 0) {
      this.max = max;
      this.barEl.dataset.size = String(this.max);
      this.barEl.setAttribute("aria-valuemax", String(this.max));
    }

    this.value = value;
    this.ratio = this.clampPercent((this.value / this.max) * 100);

    // Apply width
    this.barEl.style.width = `${this.ratio}%`;

    // Update label + ARIA
    this.barEl.setAttribute("aria-valuenow", String(Math.round(this.value)));
    if (this.percEl) {
      this.percEl.textContent = this.title
        ? `${this.title} ${Math.floor(this.value)}%`
        : `${Math.floor(this.value)}%`;
    }
  }

  /** Change color at runtime. */
  setColor(color: string) {
    this.color = color;
    if (this.barEl) this.barEl.style.backgroundColor = this.color;
  }

  /** Change title at runtime (label will reflect on next update). */
  setTitle(title: string) {
    this.title = title;
    if (this.percEl) {
      this.percEl.textContent = this.title
        ? `${this.title} ${this.value.toFixed(1)}%`
        : `${this.value.toFixed(1)}%`;
    }
  }

  /** Hide and detach from DOM (keeps instance state). */
  Hide() {
    if (this.dom && this.dom.parentElement) {
      this.dom.parentElement.removeChild(this.dom);
    }
  }

  // -------------------- internals --------------------

  private clampPercent(p: number) {
    if (!isFinite(p)) return 0;
    return Math.max(0, Math.min(100, Math.floor(p)));
    // use Math.floor to make width jumps crisp; change to round for smoother text % if desired
  }

  private applyDynamicStyle(styleId: string, css: string) {
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style);
    }
  }
}

/* ---------- 사용 예시 ----------
const hud = document.getElementById('hud')!;
const hp = new LolliBar(hud, { title: 'HP', color: '#ff5a5a', initValue: 50, max: 100, top: 8, left: 8, width: '240px' });
hp.RenderHTML();
hp.Show();

// 나중에 수치 변경
hp.updateValue(72);          // max 생략 시 data-size(=현재 max) 사용
hp.updateValue(30, 150);     // max도 함께 갱신
hp.setColor('#2ecc71');      // 바 색상 변경
hp.setTitle('Shield');       // 라벨 변경
-------------------------------- */
