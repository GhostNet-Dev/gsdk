import { GUX, IGUX } from "../../gux";

export type IconDef =
  | string
  | { type: 'img'; src: string; alt?: string }
  | { type: 'gfont'; name: string }
  | { type: 'text'; value: string }
  | { type: 'svgInline'; value: string };

export class BuffStatus extends GUX implements IGUX {
  get Dom() { return this.root; }
  private root: HTMLDivElement;
  private timer!: number;
  private opts = { align: 'right' as 'left' | 'center' | 'right', size: 40, showTime: true, tooltip: true, interval: 200 };
  private buffs = new Map<string, { id: string; icon: IconDef; name?: string; desc?: string; duration: number; endAt: number; el: HTMLElement }>();

  constructor(init?: Partial<typeof BuffStatus.prototype.opts>) {
    super()
    this.applyDynamicStyle('ghud-buff-style', BUFF_CSS);
    this.applyDynamicStyle('ghud-gfont-link', `<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL,wght,GRAD,opsz@0,400,0,24" rel="stylesheet">`);

    Object.assign(this.opts, init);

    this.root = document.createElement('div');
    this.root.className = 'ghud-buffs ghud-align-right';
    this.setAlign(this.opts.align);
    this.setSize(this.opts.size);

    this.timer = window.setInterval(() => this.tick(), this.opts.interval);
  }

  getEl(): HTMLElement { return this.root; }
  isVisible(): boolean { return this.visible; }
  Show(): void { this.visible = true; this.root.style.display = ''; }
  Hide(): void { this.visible = false; this.root.style.display = 'none'; }
  setVisible(v: boolean): void { v ? this.Show() : this.Hide(); }
  AddChild(dom: IGUX, ...param: any): void { }
  RenderHTML(...param: any): void { }

  setAlign(v: 'left' | 'center' | 'right') {
    this.root.classList.remove('ghud-align-left', 'ghud-align-center', 'ghud-align-right');
    this.root.classList.add(v === 'left' ? 'ghud-align-left' : v === 'center' ? 'ghud-align-center' : 'ghud-align-right');
    this.opts.align = v;
  }
  setSize(px: number) {
    this.opts.size = px;
    document.documentElement.style.setProperty('--ghud-buff-size', `${px}px`);
  }

  addBuff(p: { id: string; icon: IconDef; name?: string; desc?: string; duration?: number }) {
    const { id, icon, name, desc, duration = 10 } = p;
    
    // [변경] duration이 0이면 무제한(Infinity)으로 설정
    const isInfinite = duration === 0;
    const endAt = isInfinite ? Infinity : performance.now() + duration * 1000;
    
    // 이미 존재하는 버프면 갱신 처리 (옵션)
    if (this.buffs.has(id)) {
        this.removeBuff(id);
    }

    const el = document.createElement('div');
    el.className = 'ghud-buff';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', name || id);
    el.innerHTML = `<i class="ghud-icon"></i><span class="ghud-time"></span><div class="ghud-tooltip"><b>${name || id}</b><br>${desc ?? ''}</div>`;
    
    this.renderIcon(el.querySelector('.ghud-icon') as HTMLElement, icon);
    
    el.addEventListener('mouseenter', () => this.updateTooltipPos(el));
    el.addEventListener('touchstart', () => this.updateTooltipPos(el), { passive: true });

    this.root.appendChild(el);

    const obj = { id, icon, name, desc, duration, endAt, el };
    this.buffs.set(id, obj);
    this.renderBuff(obj);
  }

  private updateTooltipPos(buffEl: HTMLElement) {
    const tooltip = buffEl.querySelector('.ghud-tooltip') as HTMLElement;
    if (!tooltip) return;

    tooltip.style.display = 'block';
    const iconRect = buffEl.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let left = iconRect.left + (iconRect.width / 2) - (tooltipRect.width / 2);
    const padding = 10;
    const screenW = window.innerWidth;
    
    if (left < padding) left = padding;
    else if (left + tooltipRect.width > screenW - padding) {
      left = screenW - tooltipRect.width - padding;
    }

    const top = iconRect.bottom + 8;

    tooltip.style.position = 'fixed';
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.bottom = 'auto';
    tooltip.style.transform = 'none';
  }

  refreshBuff(id: string, extraSeconds = 0) {
    const b = this.buffs.get(id);
    if (!b) return;

    // [변경] 무제한 버프는 시간 갱신 로직을 건너뜀
    if (b.duration === 0) return;

    b.endAt = Math.max(b.endAt, performance.now()) + extraSeconds * 1000;
    this.renderBuff(b);
  }

  removeBuff(id: string) {
    const b = this.buffs.get(id);
    if (!b) return;
    b.el.remove();
    this.buffs.delete(id);
  }

  private renderIcon(container: HTMLElement, icon: IconDef) {
    container.innerHTML = '';
    if (typeof icon === 'string') { container.textContent = icon; return; }
    if (!icon || typeof icon !== 'object') return;
    if ('src' in icon) {
      const img = document.createElement('img'); img.src = icon.src; img.alt = icon.alt || '';
      container.appendChild(img); return;
    }
    if ('name' in icon) {
      const span = document.createElement('span'); span.className = 'ghud-ms'; span.textContent = icon.name;
      container.appendChild(span); return;
    }
    if ('value' in icon) {
      if ((icon as any).type === 'text') { container.textContent = String(icon.value); }
      else { container.insertAdjacentHTML('afterbegin', String(icon.value)); }
    }
  }

  private renderBuff(b: { id: string; duration: number; endAt: number; el: HTMLElement; name?: string; desc?: string }) {
    const t = b.el.querySelector('.ghud-time') as HTMLElement;
    const tip = b.el.querySelector('.ghud-tooltip') as HTMLElement;
    
    // [변경] duration이 0인 경우 (무제한 버프 처리)
    if (b.duration === 0) {
        b.el.style.setProperty('--ghud-pct', '1'); // 게이지 항상 꽉 참
        t.style.display = 'none'; // 시간 텍스트 숨김
        
        b.el.classList.toggle('ghud-tooltip-off', !this.opts.tooltip);
        // 툴팁에 '지속 효과' 표시
        tip.innerHTML = `<b>${b.name || b.id}</b><br>${b.desc ?? ''}<br><small style="color:#fbbf24">지속 효과</small>`;
        return;
    }

    // 일반 기간제 버프 처리
    const remain = Math.max(0, b.endAt - performance.now());
    // division by zero 방지를 위해 duration 확인 (위에서 0 체크 했으므로 안전)
    const r = Math.max(0, Math.min(1, remain / (b.duration * 1000)));
    b.el.style.setProperty('--ghud-pct', String(r));

    t.style.display = this.opts.showTime ? '' : 'none';
    t.textContent = Math.ceil(remain / 1000) + 's';

    b.el.classList.toggle('ghud-tooltip-off', !this.opts.tooltip);
    
    tip.innerHTML = `<b>${b.name || b.id}</b><br>${b.desc ?? ''}<br><small style="color:#fbbf24">남은 시간: ${Math.ceil(remain / 1000)}s</small>`;
  }

  private tick() {
    const now = performance.now();
    for (const b of [...this.buffs.values()]) {
      // duration 0인 경우 endAt이 Infinity이므로 now >= Infinity는 항상 false -> 삭제되지 않음
      if (now >= b.endAt) this.removeBuff(b.id);
      else this.renderBuff(b);
    }
  }
}

const BUFF_CSS = `
#ghud-root .ghud-ms{
  font-family:'Material Symbols Outlined';
  font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24;
  font-size:20px; line-height:1; display:inline-block;
}
.ghud-buffs{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }
.ghud-buffs.ghud-align-left{ justify-content:flex-start; }
.ghud-buffs.ghud-align-center{ justify-content:center; }
.ghud-buff{
  --ghud-pct:1; position:relative; width:var(--ghud-buff-size); height:var(--ghud-buff-size);
  border-radius:12px; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18);
  box-shadow:0 2px 10px rgba(0,0,0,.35); overflow:visible;
  cursor: help;
}
.ghud-buff::before{
  content:""; position:absolute; inset:0; z-index:0; pointer-events:none; width:calc(var(--ghud-pct) * 100%);
  background:linear-gradient(180deg, color-mix(in oklab,#9ad1ff 36%, transparent), rgba(255,255,255,.05)); border-radius:12px;
}
.ghud-buff i{ position:absolute; inset:0; display:grid; place-items:center; font-style:normal; font-size:20px; z-index:1; }
.ghud-buff i img{ max-width:70%; max-height:70%; object-fit:contain; image-rendering:auto; }
.ghud-buff i svg{ width:70%; height:70%; display:block; }
.ghud-buff .ghud-time{ position:absolute; right:4px; bottom:2px; z-index:2; font-size:11px; color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.75); }

.ghud-buff .ghud-tooltip{
  position: fixed; 
  top: 0; left: 0;
  z-index: 9999;
  
  pointer-events:none; 
  background:rgba(0,0,0,.95); 
  border:1px solid rgba(255,255,255,.2);
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  
  color:#fff; font-size:12px; padding:8px 10px; border-radius:8px; 
  white-space:nowrap; 
  
  opacity:0; 
  transition:opacity .15s ease; 
  visibility: hidden;
}

.ghud-buff:hover .ghud-tooltip { opacity:1; visibility: visible; }
.ghud-buff.ghud-tooltip-off:hover .ghud-tooltip { opacity:0; visibility: hidden; }
`