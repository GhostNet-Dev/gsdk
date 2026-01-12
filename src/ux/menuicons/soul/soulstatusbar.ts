import { GUX, IGUX } from "../../gux";
import { Icons } from '@Glibs/ux/menuicons/icontypes'

/** HP/MP/SP 공용 바 */
export class DefaultStatusBar extends GUX implements IGUX {
  get Dom() { return this.wrap; }
  private wrap: HTMLDivElement;
  private fill: HTMLDivElement;
  private text: HTMLBRElement;

  public cur: number;
  public max: number;
  public readonly type: 'hp' | 'mp' | 'sp';
  private label: string;

  constructor({ 
    type = 'hp', cur = 100, max = 100, visible = true 
  } = {}) {
    super()
    this.applyDynamicStyle('ghud-defaultbar-style', DEFAULT_BAR_CSS);

    this.type = type as 'hp' | 'mp' | 'sp';
    this.label = type.toUpperCase();
    this.cur = cur;
    this.max = Math.max(1, max);
    this.visible = visible;

    this.wrap = document.createElement('div');
    this.wrap.className = 'ghud-pill';
    this.wrap.dataset.type = type;

    this.fill = document.createElement('div');
    this.fill.className = 'ghud-fill';

    this.text = document.createElement('b') as HTMLBRElement;

    this.wrap.append(this.fill, this.text);
    this.RenderHTML();
  }

  getEl(): HTMLElement {
    return this.wrap;
  }
  isVisible(): boolean {
    return this.visible;
  }
  Show(): void {
    this.visible = true;
    this.wrap.style.display = '';
  }
  Hide(): void {
    this.visible = false;
    this.wrap.style.display = 'none';
  }
  setVisible(v: boolean): void {
    v ? this.Show() : this.Hide();
  }

  setData(p: { cur?: number; max?: number }) {
    if (p.cur != null) this.cur = p.cur;
    if (p.max != null) this.max = Math.max(1, p.max);
    this.RenderHTML();
  }
  UpdateStatus(value: number) {
    this.setData({ cur: value })
  }

  RenderHTML() {
    this.fill.style.width = (100 * this.cur / this.max).toFixed(1) + '%';
    this.text.textContent = `${this.label} ${this.cur}/${this.max}`;
    this.wrap.style.display = this.visible ? '' : 'none';
  }
  AddChild(dom: IGUX, ...param: any): void {
      
  }
}

const DEFAULT_BAR_CSS = `
.ghud-pill{
  position:relative; height:18px; border-radius:999px; overflow:hidden;
  background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.05));
  border:1px solid rgba(255,255,255,.15); backdrop-filter: blur(8px) saturate(115%);
}
.ghud-fill{
  position:absolute; left:0; top:0; bottom:0; width:40%; border-radius:999px;
  background:linear-gradient(90deg,rgba(255,255,255,.28),transparent), var(--ghud-grad, #fff);
  box-shadow: inset 0 0 10px rgba(0,0,0,.35); transition:width .25s ease;
}
.ghud-pill[data-type="hp"] .ghud-fill{ --ghud-grad: linear-gradient(180deg,#ef4444, color-mix(in oklab,#ef4444 40%, black)); }
.ghud-pill[data-type="mp"] .ghud-fill{ --ghud-grad: linear-gradient(180deg,#60a5fa, color-mix(in oklab,#60a5fa 40%, black)); }
.ghud-pill[data-type="sp"] .ghud-fill{ --ghud-grad: linear-gradient(180deg,#f59e0b, color-mix(in oklab,#f59e0b 40%, black)); }
.ghud-pill b{ position:absolute; inset:0; display:grid; place-items:center; font-size:12px; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.5); }
`;
