import { GUX, IGUX } from "../gux";

export interface BossHandles {
  root: HTMLElement;
  name: HTMLElement;
  perc: HTMLElement;
  fillR: HTMLElement;
  fillY: HTMLElement;
  fillG: HTMLElement;
}


/** 보스바 컨트롤 */
export class BossBar extends GUX {
  get Dom() { return this.h.root; }
  private G = 100;
  private Y = 100;
  private R = 100;
  private units = 300;
  private h: BossHandles

  constructor(root?: HTMLElement) {
    super()
    this.h = this.createBoss(root)
  }
  createBoss(mount?: HTMLElement): BossHandles {
    this.applyDynamicStyle('ghud-boss-style', BOSS_CSS);

    const parent = mount ?? document.body;
    let root = document.getElementById('ghud-boss') as HTMLElement | null;
    if (!root) root = this.injectHTML(parent, BOSS_HTML) as HTMLElement;

    const name = root.querySelector('#ghud-boss-name') as HTMLElement;
    const perc = root.querySelector('#ghud-boss-perc') as HTMLElement;
    const fillR = root.querySelector('#ghud-boss-red') as HTMLElement;
    const fillY = root.querySelector('#ghud-boss-yellow') as HTMLElement;
    const fillG = root.querySelector('#ghud-boss-green') as HTMLElement;

    return { root, name, perc, fillR, fillY, fillG };
  }
  Show(name = 'Boss', units = 300, segments = { G: 100, Y: 100, R: 100 }) {
    this.h.name.textContent = name;
    this.G = segments.G; this.Y = segments.Y; this.R = segments.R;
    this.units = Math.min(units, this.G + this.Y + this.R);
    this.h.root.classList.add('ghud-show');
    this.setUnits(this.units);
  }
  Hide() { this.h.root.classList.remove('ghud-show'); }
  RenderHTML(...param: any): void { }
  AddChild(dom: IGUX, ...param: any): void { }

  setUnits(u: number) {
    const total = this.G + this.Y + this.R;
    const c = Math.max(0, Math.min(total, u));
    this.units = c;

    const r = Math.min(c, this.R) / this.R;
    const y = c > this.R ? Math.min(c - this.R, this.Y) / this.Y : 0;
    const g = c > (this.R + this.Y) ? Math.min(c - (this.R + this.Y), this.G) / this.G : 0;

    this.h.fillR.style.width = (r * 100).toFixed(1) + '%';
    this.h.fillY.style.width = (y * 100).toFixed(1) + '%';
    this.h.fillG.style.width = (g * 100).toFixed(1) + '%';
    this.h.perc.textContent = Math.round((c / total) * 100) + '%';

    if (c <= 0) setTimeout(() => this.Hide(), 600);
  }
}

const BOSS_CSS = `
:root{ --ghud-boss-h:12px; }
#ghud-boss{ position:fixed; left:50%; top:74px; transform:translateX(-50%); z-index:38; display:none; width:min(980px,calc(100% - 24px)); }
#ghud-boss.ghud-show{ display:block; }
#ghud-boss .ghud-boss-wrap{ position:relative; padding:10px 12px 12px; border-radius:14px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.18); backdrop-filter: blur(10px); }
#ghud-boss .ghud-boss-name{ font-weight:700; letter-spacing:.3px; margin-bottom:10px; display:flex; align-items:center; gap:10px; }
#ghud-boss .ghud-boss-perc{ margin-left:auto; font-size:12px; opacity:.9; }
#ghud-boss .ghud-boss-bar{ position:relative; height:var(--ghud-boss-h); border-radius:999px; overflow:visible; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.06); }
#ghud-boss .ghud-boss-bar i{ position:absolute; left:0; top:0; bottom:0; width:100%; border-radius:999px; }
#ghud-boss .ghud-fill-red{    z-index:1; background:linear-gradient(180deg,#ef4444, color-mix(in oklab,#ef4444 45%, black)); }
#ghud-boss .ghud-fill-yellow{ z-index:2; background:linear-gradient(180deg,#eab308, color-mix(in oklab,#eab308 45%, black)); transition:width .2s ease; }
#ghud-boss .ghud-fill-green{  z-index:3; background:linear-gradient(180deg,#22c55e, color-mix(in oklab,#22c55e 45%, black)); transition:width .2s ease; }
`;

const BOSS_HTML = `
<div id="ghud-boss">
  <div class="ghud-boss-wrap">
    <div class="ghud-boss-name">
      <span id="ghud-boss-name">Boss</span>
      <span class="ghud-boss-perc" id="ghud-boss-perc">100%</span>
    </div>
    <div class="ghud-boss-bar">
      <i class="ghud-fill-red" id="ghud-boss-red" style="width:100%"></i>
      <i class="ghud-fill-yellow" id="ghud-boss-yellow" style="width:100%"></i>
      <i class="ghud-fill-green" id="ghud-boss-green" style="width:100%"></i>
    </div>
  </div>
</div>
`;
