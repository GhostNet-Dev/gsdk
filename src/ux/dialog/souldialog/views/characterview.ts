// ============================================================================
// views/CharacterView.ts  — 슬롯 툴팁(hover=정보만 / click=버튼표시), 보너스 반올림 표시
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';

// 모든 캐릭터 렌더러가 구현해야 할 인터페이스
export interface ICharacterRenderer {
  // DOM 요소에 렌더러를 부착 (초기화)
  mount(container: HTMLElement): void;

  // 크기 변경 대응 (반응형)
  resize(width: number, height: number): void;

  // 메모리 해제 및 이벤트 리스너 제거 (필수!)
  dispose(): void;
}

type EquipSlot =
  | 'head' | 'chest' | 'hands' | 'legs'
  | 'weapon' | 'offhand'
  | 'ring1' | 'ring2' | 'amulet';

type EquipItem = {
  icon?: string;
  atk?: number;
  def?: number;
  wt?: number;
  set?: string;
  name?: string;
  rarity?: 'Common'|'Rare'|'Epic';
  desc?: string;
};

type Props = {
  base: { STR:number; DEX:number; INT:number; FAI:number; VIT:number };
  resistBase: { fire:number; elec:number; ice:number };
  equip: Partial<Record<EquipSlot, EquipItem|null|undefined>>;
  charRenderer: ICharacterRenderer;
  onUnequip?: (slot: EquipSlot) => void;
  onReplace?: (slot: EquipSlot) => void;
  onInspect?: (slot: EquipSlot, item: EquipItem) => void;
};

const SLOTS: EquipSlot[] = ['head','chest','hands','legs','weapon','offhand','ring1','ring2','amulet'];

const CSS_CHAR = css`
  :host { color: var(--gnx-ui-fg); }

  .gnx-char{display:grid;grid-template-columns:280px 1fr;gap:16px; color:inherit;}
  @media (max-width:900px){.gnx-char{grid-template-columns:1fr}}

  .gnx-char-portrait{
    height:280px;border-radius:14px;
    background:linear-gradient(135deg,#2b2b36,#15151b);
    display:grid;place-items:center;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
    color:inherit; font-size:72px;
  }

  .gnx-stats{display:grid;gap:10px; color:inherit;}
  .gnx-stat{
    display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;
    border:1px solid rgba(255,255,255,.10);
    border-radius:10px;padding:8px 10px;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
    color:inherit;
  }
  .gnx-stat .label{ font-weight:600; }
  .gnx-stat .val{ font-weight:700; }
  .gnx-plus{ color:color-mix(in oklab, var(--gnx-ui-accent) 80%, white 10%); font-weight:700; margin-left:6px; }

  .gnx-bar{height:6px;border-radius:6px;position:relative;overflow:hidden;background:rgba(255,255,255,.12);}
  .gnx-bar>i{position:absolute;left:0;top:0;bottom:0;background:color-mix(in oklab,var(--gnx-ui-accent) 60%,transparent)}

  .gnx-equip-grid{
    display:grid;
    grid-template-columns:repeat(5,1fr);
    gap:10px; color:inherit;
  }
  @media (max-width:700px){.gnx-equip-grid{grid-template-columns:repeat(3,1fr)}}
  .gnx-eslot{
    height:78px;border:1px solid rgba(255,255,255,.14);border-radius:10px;
    display:grid;place-items:center;position:relative;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
    color:inherit; cursor:pointer;
  }
  .gnx-eslot[data-hover="true"]{
    border-color:var(--gnx-ui-accent);
    box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);
  }
  .gnx-eslot .slot-name{
    position:absolute; left:8px; bottom:6px; font-size:11px; color:var(--gnx-ui-sub);
  }
  .gnx-eslot .icon{ font-size:28px; user-select:none; }

  /* ===== Tooltip ===== */
  .gnx-tip {
    position: fixed;
    z-index: 2147483647;
    min-width: 260px;
    max-width: 380px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.18);
    background: var(--gnx-ui-bg, rgba(14,17,22,.92));
    box-shadow: var(--gnx-shadow, 0 8px 40px rgba(0,0,0,.55));
    color: var(--gnx-ui-fg);
    pointer-events: none; /* hover 상태: 버튼 비활성(숨김) + 클릭 통과 */
    transform: translate(-50%, -10px);
    opacity: 0;
    transition: opacity .08s ease, transform .08s ease;
  }
  .gnx-tip[data-show="true"] { opacity: 1; }
  .gnx-tip[data-pinned="true"] { pointer-events: auto; transform: translate(-50%, 0); }

  .gnx-tip h4{ margin:0 0 6px 0; font-size:14px; font-weight:700; }
  .gnx-tip .meta{ display:flex; gap:6px; flex-wrap:wrap; margin:6px 0; }
  .gnx-tip .desc{ color:var(--gnx-ui-sub); line-height:1.55; }
  .gnx-tip .actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:10px; }

  .gnx-btn{ appearance:none; border:1px solid rgba(255,255,255,.18); color:var(--gnx-ui-fg);
    background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
    padding:8px 12px; border-radius:12px; cursor:pointer; font-weight:600; letter-spacing:.2px; }
  .gnx-btn--accent{
    border-color:var(--gnx-ui-accent-weak);
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.25), var(--gnx-card-glow);
    background:linear-gradient(180deg, color-mix(in oklab, var(--gnx-ui-accent) 25%, transparent), rgba(255,255,255,.02));
    color:#fff;
  }
  .gnx-btn--danger{
    border-color:rgba(255,90,106,.35);
    background:linear-gradient(180deg,rgba(255,90,106,.25),rgba(255,255,255,.12));
    color:#fff;
  }
`;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" } as any)[m]);
}
function rarClass(r?: 'Common'|'Rare'|'Epic') {
  if (r === 'Epic') return 'gnx-rar-epic';
  if (r === 'Rare') return 'gnx-rar-rare';
  return 'gnx-rar-common';
}

export class CharacterView implements IDialogView<Props> {
  private shell!: any;
  private key?: string;
  private ctx!: ViewContext;
  private props!: Props;

  private tip?: HTMLDivElement;
  private tipPinned = false;
  private tipSlot: EquipSlot | null = null;
  private charContainerRef?: HTMLDivElement;

  constructor(private charRenderer: ICharacterRenderer){

  }

  private onGlobalDown = (e: Event) => {
    if (!this.tip || !this.tipPinned) return;
    if (e.target instanceof Node && this.tip.contains(e.target)) return;
    this.unpinTip();
  };

  mount(ctx: ViewContext, props: Props) {
    this.ctx = ctx;
    this.props = props;
    this.shell = ctx.shell;

    ctx.render.setTitle(this.shell, '캐릭터');
    ctx.render.setWide(this.shell, true);
    this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_CHAR, 'view:char');

    this.ensureTip();
    document.addEventListener('pointerdown', this.onGlobalDown, true);

    this.render();
    this.ctx.render.setActions(this.shell, [{ id: 'close', label: '닫기', onClick: () => this.ctx.manager.close() }]);
    const portraitContainer = this.shell.body.querySelector('.gnx-char-portrait') as HTMLDivElement;
    
    if (portraitContainer) {
      this.charContainerRef = portraitContainer;
      
      // 기존 텍스트(🧍) 제거
      portraitContainer.textContent = ''; 
      
      // 렌더러 마운트
      this.charRenderer.mount(portraitContainer);
      
      // 반응형 크기 조절 (ResizeObserver 사용 권장)
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
           const { width, height } = entry.contentRect;
           this.charRenderer.resize(width, height);
        }
      });
      ro.observe(portraitContainer);
      (this as any)._ro = ro; // 나중에 해제하기 위해 저장
    }
  }

  update(next: Props) {
    this.props = next;
    this.render();
  }

  unmount() {
    if ((this as any)._ro) (this as any)._ro.disconnect();
    this.charRenderer.dispose();
    if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key);
    document.removeEventListener('pointerdown', this.onGlobalDown, true);
    if (this.tip && this.tip.parentElement) this.tip.parentElement.removeChild(this.tip);
    this.tip = undefined;
  }

  /* ---------------------------- Rendering ---------------------------- */

  private render() {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    this.shell.body.innerHTML = '';

    const wrap = createEl(doc, 'div'); wrap.className='gnx-char';

    // LEFT — Portrait + base/resist
    const left = createEl(doc, 'div');
    const port = createEl(doc, 'div'); port.className='gnx-char-portrait'; port.textContent='🧍';
    left.appendChild(port);

    const stats1 = createEl(doc, 'div'); stats1.className='gnx-stats'; stats1.style.marginTop='12px';

    const sums = this.computeEquipSums();
    const atkBase = Math.round(this.props.base.STR*1.2 + this.props.base.DEX*0.5);
    const atkTotal = atkBase + Math.round(sums.atk);
    const defBase = Math.round(10 + this.props.base.VIT*0.8);
    const defTotal = defBase + Math.round(sums.def);
    const sta = 50 + this.props.base.VIT*2;
    const wt  = sums.wt; // 전체 중량 자체는 소수 표시가 필요하면 toFixed로 바꿔도 됩니다.

    // 보너스는 반올림하여 소수점 제거
    stats1.appendChild(this.statRow('공격력', atkTotal, atkBase, Math.round(sums.atk), 100/3));
    stats1.appendChild(this.statRow('방어도', defTotal, defBase, Math.round(sums.def), 100/3));
    stats1.appendChild(this.statRow('스태미너', sta, sta, 0, 100/1.5));
    // suffix는 총중량 표시, 보너스(+wt)는 반올림하여 정수로 표기
    stats1.appendChild(this.statRow('장비 중량', Math.min(100, wt*12), 0, Math.round(wt), 1, true, String(Math.round(wt))));
    left.appendChild(stats1);

    const res = createEl(doc, 'div'); res.className='gnx-stats'; res.style.marginTop='12px';
    res.appendChild(this.statSimple('🔥 화염 저항', this.props.resistBase.fire, 1));
    res.appendChild(this.statSimple('⚡ 번개 저항', this.props.resistBase.elec, 1));
    res.appendChild(this.statSimple('❄️ 빙결 저항', this.props.resistBase.ice, 1));
    left.appendChild(res);

    // RIGHT — Equip grid
    const right = createEl(doc, 'div');
    const equipGrid = createEl(doc, 'div'); equipGrid.className='gnx-equip-grid';

    SLOTS.forEach((slot)=>{
      const it = this.props.equip?.[slot] ?? null;
      const cell = createEl(doc, 'div'); cell.className='gnx-eslot'; (cell as any).dataset.slot = slot;
      const icon = createEl(doc, 'div'); icon.className='icon'; icon.textContent = it?.icon ?? '—';
      const name = createEl(doc, 'div'); name.className='slot-name'; name.textContent = slot;
      cell.appendChild(icon); cell.appendChild(name);

      // hover → 정보만 표시(버튼 없음)
      cell.addEventListener('mouseenter', (e)=>{ (cell as HTMLElement).dataset.hover='true'; this.onSlotHover(slot, it || undefined, e as MouseEvent); });
      cell.addEventListener('mousemove', (e)=> this.onSlotHover(slot, it || undefined, e as MouseEvent));
      cell.addEventListener('mouseleave', ()=>{ (cell as HTMLElement).dataset.hover='false'; this.onSlotLeave(); });

      // click → pin (버튼 표시)
      cell.addEventListener('pointerdown', (e)=>{
        if ((e as PointerEvent).pointerType !== 'mouse') return;
        e.stopPropagation();
        this.pinTip(slot, it || undefined);
      }, { capture:true });

      equipGrid.appendChild(cell);
    });

    right.appendChild(equipGrid);
    wrap.appendChild(left); wrap.appendChild(right);
    this.shell.body.appendChild(wrap);
  }

  /* ---------------------------- Stats helpers ---------------------------- */

  private computeEquipSums() {
    let atk=0, def=0, wt=0;
    for (const s of SLOTS) {
      const it = this.props.equip?.[s];
      if (!it) continue;
      if (typeof it.atk === 'number') atk += it.atk;
      if (typeof it.def === 'number') def += it.def;
      if (typeof it.wt  === 'number') wt  += it.wt;
    }
    return { atk, def, wt };
  }

  private statRow(label:string, total:number, base:number, bonus:number, scale:number, clamp=false, suffix?:string) {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    const row = createEl(doc, 'div'); row.className='gnx-stat';

    const labelEl = createEl(doc, 'div'); labelEl.className='label'; labelEl.textContent = label;
    const bar = createEl(doc, 'div'); bar.className='gnx-bar';
    const i = createEl(doc, 'i');
    const width = clamp ? Math.min(100, total*scale) : (total/scale);
    (i as any).style.width = (typeof width==='number'? width : parseFloat(String(width))) + '%';
    bar.appendChild(i);

    const val = createEl(doc, 'div'); val.className='val';
    val.textContent = suffix ?? String(total);
    const bonusRounded = Math.round(bonus);
    if (bonusRounded && Math.abs(bonusRounded) > 0) {
      const plus = createEl(doc, 'span'); plus.className='gnx-plus';
      plus.textContent = `(+${bonusRounded})`;
      val.appendChild(plus);
    }

    row.appendChild(labelEl); row.appendChild(bar); row.appendChild(val);
    return row;
  }

  private statSimple(label:string, val:number, scale:number) {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.cardDoc() : document;
    const row = createEl(doc, 'div'); row.className='gnx-stat';
    const labelEl = createEl(doc, 'div'); labelEl.className='label'; labelEl.textContent = label;
    const bar = createEl(doc, 'div'); bar.className='gnx-bar';
    const i = createEl(doc, 'i'); (i as any).style.width = (val/scale)+'%'; bar.appendChild(i);
    const right = createEl(doc, 'div'); right.className='val'; right.textContent = String(val);
    row.appendChild(labelEl); row.appendChild(bar); row.appendChild(right);
    return row;
  }

  private cardDoc() {
    return (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
  }

  /* ---------------------------- Tooltip ---------------------------- */

  private ensureTip() {
    if (this.tip) return;
    const doc = this.cardDoc();
    const tip = createEl(doc, 'div') as HTMLDivElement;
    tip.className = 'gnx-tip';
    tip.setAttribute('data-show','false');
    tip.setAttribute('data-pinned','false');
    this.shell.sr.appendChild(tip);
    this.tip = tip;
  }

  private onSlotHover(slot: EquipSlot, it?: EquipItem, ev?: MouseEvent) {
    if (!this.tip) this.ensureTip();
    if (!this.tip) return;
    if (this.tipPinned) return; // 핀 상태에서는 hover 미표시
    this.renderTip(slot, it, false); // hover → 버튼 숨김
    if (ev) this.placeTip(ev.clientX, ev.clientY);
  }

  private onSlotLeave() {
    if (this.tipPinned) return;
    this.hideTip();
  }

  private pinTip(slot: EquipSlot, it?: EquipItem) {
    this.renderTip(slot, it, true); // pin → 버튼 표시
  }

  private unpinTip() {
    this.tipPinned = false;
    if (this.tip) {
      this.tip.setAttribute('data-pinned','false');
      this.hideTip();
    }
    this.tipSlot = null;
  }

  private renderTip(slot: EquipSlot, it: EquipItem|undefined, pin:boolean) {
    this.ensureTip();
    if (!this.tip) return;

    this.tipPinned = pin;
    this.tipSlot = slot;

    this.tip.innerHTML = '';
    this.tip.setAttribute('data-pinned', pin ? 'true' : 'false');
    this.tip.style.pointerEvents = pin ? ('auto' as any) : 'none';

    const doc = this.cardDoc();

    const title = createEl(doc, 'h4');
    title.innerHTML = `${escapeHtml(it?.icon ?? '—')} ${escapeHtml(it?.name ?? `[${slot}]`)}`
    this.tip.appendChild(title);

    const meta = createEl(doc, 'div'); meta.className='meta';
    const rar = createEl(doc,'span'); rar.className = `gnx-card__meta ${rarClass(it?.rarity)}`; rar.textContent = it?.rarity ?? 'Empty';
    meta.appendChild(rar);
    if (it?.set) { const s = createEl(doc,'span'); s.className='gnx-card__meta'; s.textContent=`세트: ${it.set}`; meta.appendChild(s); }
    this.tip.appendChild(meta);

    const lines: string[] = [];
    if (it?.atk) lines.push(`공격력 +${Math.round(it.atk)}`);
    if (it?.def) lines.push(`방어도 +${Math.round(it.def)}`);
    if (it?.wt)  lines.push(`중량 +${Math.round(it.wt)}`);
    if (lines.length) {
      const stats = createEl(doc,'div'); stats.className='meta';
      for (const L of lines) { const sp = createEl(doc,'span'); sp.className='gnx-card__meta'; sp.textContent=L; stats.appendChild(sp); }
      this.tip.appendChild(stats);
    }

    const desc = createEl(doc,'div'); desc.className='desc';
    desc.textContent = it?.desc ?? (it ? '설명 없음.' : '빈 슬롯입니다. 인벤토리에서 장비를 장착하세요.');
    this.tip.appendChild(desc);

    // hover일 때는 버튼 숨김, pin 상태에서만 버튼 추가
    if (pin) {
      const acts = createEl(doc,'div'); acts.className='actions';

      const close = createEl(doc,'button'); close.className='gnx-btn'; close.textContent='닫기';
      close.onclick = (e)=>{ e.stopPropagation(); this.unpinTip(); };

      if (it) {
        const inspect = createEl(doc,'button'); inspect.className='gnx-btn'; inspect.textContent='자세히';
        inspect.onclick=(e)=>{ e.stopPropagation(); this.props.onInspect?.(slot, it); };

        const replace = createEl(doc,'button'); replace.className='gnx-btn gnx-btn--accent'; replace.textContent='교체';
        replace.onclick=(e)=>{ e.stopPropagation(); this.props.onReplace?.(slot); };

        const unequip = createEl(doc,'button'); unequip.className='gnx-btn gnx-btn--danger'; unequip.textContent='장착 해제';
        unequip.onclick=(e)=>{ e.stopPropagation(); this.props.onUnequip?.(slot); this.unpinTip(); };

        acts.appendChild(close); acts.appendChild(inspect); acts.appendChild(replace); acts.appendChild(unequip);
      } else {
        const replace = createEl(doc,'button'); replace.className='gnx-btn gnx-btn--accent'; replace.textContent='장비 장착';
        replace.onclick=(e)=>{ e.stopPropagation(); this.props.onReplace?.(slot); };
        acts.appendChild(close); acts.appendChild(replace);
      }

      this.tip.appendChild(acts);
    }

    this.tip.setAttribute('data-show','true');
  }

  private hideTip() {
    if (!this.tip) return;
    this.tip.setAttribute('data-show','false');
    this.tip.style.pointerEvents = 'none';
  }

  private placeTip(cx:number, cy:number) {
    if (!this.tip) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = this.tip.getBoundingClientRect();
    const pad = 12;
    let x = cx, y = cy - 12;

    if (x - rect.width/2 < pad) x = rect.width/2 + pad;
    if (x + rect.width/2 > vw - pad) x = vw - rect.width/2 - pad;
    if (y - rect.height < pad) y = rect.height + pad;

    this.tip.style.left = `${x}px`;
    this.tip.style.top  = `${y}px`;
  }
}
