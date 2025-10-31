import { GUX, IGUX } from '../../gux';

/** 넓은 바 (XP 등) */
export class WideStatusBar extends GUX implements IGUX {
  get Dom() { return this.wrap; }
  private wrap: HTMLDivElement;
  private fill: HTMLDivElement;

  public cur: number;
  public max: number;

  constructor({ cur = 100, max = 100, visible = true } = {}) {
    super()
    this.applyDynamicStyle('ghud-widebar-style', WIDE_BAR_CSS);

    this.cur = cur;
    this.max = Math.max(1, max);
    this.visible = visible;

    this.wrap = document.createElement('div');
    this.wrap.className = 'ghud-xp';
    this.fill = document.createElement('i') as HTMLDivElement;
    this.wrap.appendChild(this.fill);

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

  RenderHTML() {
    this.fill.style.width = (100 * this.cur / this.max).toFixed(1) + '%';
    this.wrap.style.display = this.visible ? '' : 'none';
  }
  AddChild(dom: IGUX, ...param: any): void {
      
  }
}

const WIDE_BAR_CSS = `
.ghud-xp{
  height:8px; border-radius:999px; overflow:hidden; border:1px solid rgba(255,255,255,.15);
  background:linear-gradient(180deg,rgba(255,255,255,.1),rgba(255,255,255,.04));
}
.ghud-xp > i{
  display:block; height:100%; width:20%; transition:width .35s ease;
  background:linear-gradient(180deg,#a78bfa, color-mix(in oklab,#a78bfa 35%, black));
}
`;
