// ============================================================================
// views/characterview.ts — 캐릭터 UI (아이콘 크기 및 툴팁 스탯 개선)
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import { IItem } from '@Glibs/interface/iinven';

// 모든 캐릭터 렌더러가 구현해야 할 인터페이스
export interface ICharacterRenderer {
  mount(container: HTMLElement): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

type EquipSlot =
  | 'head' | 'chest' | 'hands' | 'legs'
  | 'weapon' | 'offhand'
  | 'ring1' | 'ring2' | 'amulet';

// 스탯 라벨 한글 매핑
const STAT_LABELS: Record<string, string> = {
    attack: '공격력',
    defense: '방어력',
    hp: '생명력',
    mp: '마나',
    speed: '이동 속도',
    criticalRate: '치명타 확률',
    criticalDamage: '치명타 피해',
    weight: '무게'
};

type Props = {
  base: { STR: number; DEX: number; INT: number; FAI: number; VIT: number };
  resistBase: { fire: number; elec: number; ice: number };
  equip: Partial<Record<EquipSlot, IItem | null | undefined>>;
  charRenderer: ICharacterRenderer;
  onUnequip?: (slot: EquipSlot) => void;
  onReplace?: (slot: EquipSlot) => void;
  onInspect?: (slot: EquipSlot, item: IItem) => void;
};

const SLOTS: EquipSlot[] = ['head', 'chest', 'hands', 'legs', 'weapon', 'offhand', 'ring1', 'ring2', 'amulet'];

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
    overflow: hidden;
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
    color:inherit; cursor:pointer; overflow: hidden;
  }
  .gnx-eslot[data-hover="true"]{
    border-color:var(--gnx-ui-accent);
    box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);
  }
  .gnx-eslot .slot-name{
    position:absolute; left:8px; bottom:6px; font-size:11px; color:var(--gnx-ui-sub); z-index: 2;
  }

  /* [수정] 아이콘 래퍼 (InventoryView와 동일하게 크기 맞춤) */
  .gnx-e-icon-wrap {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    padding: 8px; /* CharacterView는 슬롯이 조금 더 크므로 패딩 조절 */
    box-sizing: border-box;
    display: flex; justify-content: center; align-items: center; z-index: 1;
  }
  .gnx-e-icon-wrap img.gnx-img-icon { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }

  /* ===== Tooltip ===== */
  .gnx-tip {
    position: fixed;
    z-index: 2147483647;
    min-width: 260px;
    max-width: 380px;
    padding: 12px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.18);
    background: linear-gradient(180deg, rgba(30,33,40,0.95), rgba(20,23,30,0.98));
    box-shadow: var(--gnx-shadow, 0 8px 40px rgba(0,0,0,.55));
    color: var(--gnx-ui-fg);
    pointer-events: none;
    transform: translate(-50%, -10px);
    opacity: 0;
    transition: opacity .08s ease, transform .08s ease;
  }
  .gnx-tip[data-show="true"] { opacity: 1; }
  .gnx-tip[data-pinned="true"] { pointer-events: auto; transform: translate(-50%, 0); }

  .gnx-tip h4{ margin:0 0 8px 0; font-size:16px; font-weight:700; display:flex; align-items:center; gap:8px; }
  
  /* [추가] 툴팁 스탯 스타일 */
  .tt-stats { margin: 12px 0; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 4px; }
  .tt-stat-row { font-size: 13px; color: #8ab4f8; display: flex; justify-content: space-between; }
  .tt-stat-row.enchant { color: #d87cff; }

  .gnx-tip .meta{ display:flex; gap:6px; flex-wrap:wrap; margin-bottom: 8px; }
  .gnx-tip .desc{ margin-top:8px; color:var(--gnx-ui-sub); line-height:1.55; font-size:13px; font-style:italic; }
  .gnx-tip .actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:12px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1); }

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
  
  .gnx-rar-common{ color:var(--gnx-rar-common); }
  .gnx-rar-rare{   color:var(--gnx-rar-rare); }
  .gnx-rar-epic{   color:var(--gnx-rar-epic); }
`;

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" } as any)[m]);
}

function rarClass(r?: string) {
  const lower = r?.toLowerCase();
  if (lower === 'epic') return 'gnx-rar-epic';
  if (lower === 'rare') return 'gnx-rar-rare';
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
  private _ro?: ResizeObserver;

  constructor(private charRenderer: ICharacterRenderer) { }

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
    
    // Character Renderer Mount
    const portraitContainer = this.shell.body.querySelector('.gnx-char-portrait') as HTMLDivElement;
    if (portraitContainer) {
      this.charContainerRef = portraitContainer;
      portraitContainer.textContent = '';
      
      this.charRenderer.mount(portraitContainer);

      this._ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
           const { width, height } = entry.contentRect;
           this.charRenderer.resize(width, height);
        }
      });
      this._ro.observe(portraitContainer);
    }
  }

  update(next: Props) {
    this.props = next;
    this.render();
  }

  unmount() {
    if (this._ro) this._ro.disconnect();
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

    const wrap = createEl(doc, 'div'); wrap.className = 'gnx-char';

    // LEFT — Portrait + base/resist
    const left = createEl(doc, 'div');
    const port = createEl(doc, 'div'); port.className = 'gnx-char-portrait'; port.textContent = '🧍';
    left.appendChild(port);

    const stats1 = createEl(doc, 'div'); stats1.className = 'gnx-stats'; stats1.style.marginTop = '12px';

    const sums = this.computeEquipSums();
    const atkBase = Math.round(this.props.base.STR * 1.2 + this.props.base.DEX * 0.5);
    const atkTotal = atkBase + Math.round(sums.atk);
    const defBase = Math.round(10 + this.props.base.VIT * 0.8);
    const defTotal = defBase + Math.round(sums.def);
    const sta = 50 + this.props.base.VIT * 2;
    const wt = sums.wt;

    stats1.appendChild(this.statRow('공격력', atkTotal, atkBase, Math.round(sums.atk), 100 / 3));
    stats1.appendChild(this.statRow('방어도', defTotal, defBase, Math.round(sums.def), 100 / 3));
    stats1.appendChild(this.statRow('스태미너', sta, sta, 0, 100 / 1.5));
    stats1.appendChild(this.statRow('장비 중량', Math.min(100, wt * 12), 0, Math.round(wt), 1, true, String(Math.round(wt))));
    left.appendChild(stats1);

    const res = createEl(doc, 'div'); res.className = 'gnx-stats'; res.style.marginTop = '12px';
    res.appendChild(this.statSimple('🔥 화염 저항', this.props.resistBase.fire, 1));
    res.appendChild(this.statSimple('⚡ 번개 저항', this.props.resistBase.elec, 1));
    res.appendChild(this.statSimple('❄️ 빙결 저항', this.props.resistBase.ice, 1));
    left.appendChild(res);

    // RIGHT — Equip grid
    const right = createEl(doc, 'div');
    const equipGrid = createEl(doc, 'div'); equipGrid.className = 'gnx-equip-grid';

    SLOTS.forEach((slot) => {
      const it = this.props.equip?.[slot];
      const cell = createEl(doc, 'div'); cell.className = 'gnx-eslot'; (cell as any).dataset.slot = slot;
      
      // [수정] 아이콘 래퍼 및 renderIcon 사용
      const iconWrap = createEl(doc, 'div');
      iconWrap.className = 'gnx-e-icon-wrap';
      iconWrap.innerHTML = it?.IconPath ? renderIcon(it.IconPath) : '—';
      if (!it) {
        // 아이콘이 없을 때 텍스트 대시(-)의 스타일 조정이 필요하면 여기에 추가
        iconWrap.style.fontSize = '28px';
        iconWrap.style.opacity = '0.25';
      }

      const name = createEl(doc, 'div'); name.className = 'slot-name'; name.textContent = slot;
      cell.appendChild(iconWrap); cell.appendChild(name);

      cell.addEventListener('mouseenter', (e) => { (cell as HTMLElement).dataset.hover = 'true'; this.onSlotHover(slot, it || undefined, e as MouseEvent); });
      cell.addEventListener('mousemove', (e) => this.onSlotHover(slot, it || undefined, e as MouseEvent));
      cell.addEventListener('mouseleave', () => { (cell as HTMLElement).dataset.hover = 'false'; this.onSlotLeave(); });

      cell.addEventListener('pointerdown', (e) => {
        if ((e as PointerEvent).pointerType !== 'mouse') return;
        e.stopPropagation();
        this.pinTip(slot, it || undefined);
      }, { capture: true });

      equipGrid.appendChild(cell);
    });

    right.appendChild(equipGrid);
    wrap.appendChild(left); wrap.appendChild(right);
    this.shell.body.appendChild(wrap);
  }

  /* ---------------------------- Stats helpers ---------------------------- */

  private computeEquipSums() {
    let atk = 0, def = 0, wt = 0;
    for (const s of SLOTS) {
      const it = this.props.equip?.[s];
      if (!it) continue;
      
      if (it.Stats) {
        if (typeof it.Stats['attack'] === 'number') atk += it.Stats['attack'];
        if (typeof it.Stats['defense'] === 'number') def += it.Stats['defense'];
      }
      
      if (typeof (it as any).Weight === 'number') wt += (it as any).Weight;
      else if (it.Stats && typeof it.Stats['weight'] === 'number') wt += it.Stats['weight'];
    }
    return { atk, def, wt };
  }

  private statRow(label: string, total: number, base: number, bonus: number, scale: number, clamp = false, suffix?: string) {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    const row = createEl(doc, 'div'); row.className = 'gnx-stat';

    const labelEl = createEl(doc, 'div'); labelEl.className = 'label'; labelEl.textContent = label;
    const bar = createEl(doc, 'div'); bar.className = 'gnx-bar';
    const i = createEl(doc, 'i');
    const width = clamp ? Math.min(100, total * scale) : (total / scale);
    (i as any).style.width = (typeof width === 'number' ? width : parseFloat(String(width))) + '%';
    bar.appendChild(i);

    const val = createEl(doc, 'div'); val.className = 'val';
    val.textContent = suffix ?? String(total);
    const bonusRounded = Math.round(bonus);
    if (bonusRounded && Math.abs(bonusRounded) > 0) {
      const plus = createEl(doc, 'span'); plus.className = 'gnx-plus';
      plus.textContent = `(+${bonusRounded})`;
      val.appendChild(plus);
    }

    row.appendChild(labelEl); row.appendChild(bar); row.appendChild(val);
    return row;
  }

  private statSimple(label: string, val: number, scale: number) {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.cardDoc() : document;
    const row = createEl(doc, 'div'); row.className = 'gnx-stat';
    const labelEl = createEl(doc, 'div'); labelEl.className = 'label'; labelEl.textContent = label;
    const bar = createEl(doc, 'div'); bar.className = 'gnx-bar';
    const i = createEl(doc, 'i'); (i as any).style.width = (val / scale) + '%'; bar.appendChild(i);
    const right = createEl(doc, 'div'); right.className = 'val'; right.textContent = String(val);
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
    tip.setAttribute('data-show', 'false');
    tip.setAttribute('data-pinned', 'false');
    this.shell.sr.appendChild(tip);
    this.tip = tip;
  }

  private onSlotHover(slot: EquipSlot, it?: IItem, ev?: MouseEvent) {
    if (!this.tip) this.ensureTip();
    if (!this.tip) return;
    if (this.tipPinned) return;
    this.renderTip(slot, it, false);
    if (ev) this.placeTip(ev.clientX, ev.clientY);
  }

  private onSlotLeave() {
    if (this.tipPinned) return;
    this.hideTip();
  }

  private pinTip(slot: EquipSlot, it?: IItem) {
    this.renderTip(slot, it, true);
  }

  private unpinTip() {
    this.tipPinned = false;
    if (this.tip) {
      this.tip.setAttribute('data-pinned', 'false');
      this.hideTip();
    }
    this.tipSlot = null;
  }

  // [수정] 툴팁 렌더링: 디아블로 스타일 스탯 표시
  private renderTip(slot: EquipSlot, it: IItem | undefined, pin: boolean) {
    this.ensureTip();
    if (!this.tip) return;

    this.tipPinned = pin;
    this.tipSlot = slot;

    this.tip.innerHTML = '';
    this.tip.setAttribute('data-pinned', pin ? 'true' : 'false');
    this.tip.style.pointerEvents = pin ? ('auto' as any) : 'none';

    const doc = this.cardDoc();

    const title = createEl(doc, 'h4');
    const iconHtml = it?.IconPath ? renderIcon(it.IconPath) : '—';
    const nameText = it?.Name ?? `[${slot}]`;
    const rarity = (it as any)?.Level ?? 'Common';
    const rarityClass = rarClass(rarity);

    title.innerHTML = `<div style="width:28px;height:28px;display:flex;justify-content:center;align-items:center">${iconHtml}</div> <span class="${rarityClass}">${escapeHtml(nameText)}</span>`;
    this.tip.appendChild(title);

    const meta = createEl(doc, 'div'); meta.className = 'meta';
    
    // Rarity Badge
    const rar = createEl(doc, 'span'); rar.className = `gnx-card__meta ${rarityClass}`; rar.textContent = rarity;
    meta.appendChild(rar);
    
    // Set Bonus
    const setName = (it as any)?.Set ?? (it?.Stats?.setBonus ? 'Set Item' : null);
    if (setName) { 
        const s = createEl(doc,'span'); s.className='gnx-card__meta'; s.style.color = '#00ff00'; s.textContent=`세트: ${setName}`; 
        meta.appendChild(s); 
    }
    this.tip.appendChild(meta);

    // [추가] 스탯 표시 로직
    let statsHtml = '';
    if (it) {
        const stats = it.Stats;
        const enchantments = it.Enchantments;
        const hasStats = (stats && Object.keys(stats).length > 0) || (enchantments && Object.keys(enchantments).length > 0);

        if (hasStats) {
            statsHtml += '<div class="tt-stats">';
            if (stats) {
                for (const [key, val] of Object.entries(stats)) {
                    if (typeof val !== 'number' || val === 0) continue;
                    const label = STAT_LABELS[key] || key;
                    const valStr = val > 0 ? `+${val}` : `${val}`;
                    statsHtml += `<div class="tt-stat-row"><span>${label}</span><span>${valStr}</span></div>`;
                }
            }
            if (enchantments) {
                for (const [key, val] of Object.entries(enchantments)) {
                    if (typeof val !== 'number' || val === 0) continue;
                    const label = STAT_LABELS[key] || key;
                    const valStr = val > 0 ? `+${val}` : `${val}`;
                    statsHtml += `<div class="tt-stat-row enchant"><span>${label}</span><span>${valStr}</span></div>`;
                }
            }
            statsHtml += '</div>';
        }
    }
    
    if (statsHtml) {
        const statsDiv = createEl(doc, 'div');
        statsDiv.innerHTML = statsHtml;
        this.tip.appendChild(statsDiv);
    }

    const desc = createEl(doc, 'div'); desc.className = 'desc';
    desc.textContent = it?.Description ?? (it ? '설명 없음.' : '빈 슬롯입니다. 인벤토리에서 장비를 장착하세요.');
    this.tip.appendChild(desc);

    if (pin) {
      const acts = createEl(doc, 'div'); acts.className = 'actions';

      const close = createEl(doc, 'button'); close.className = 'gnx-btn'; close.textContent = '닫기';
      close.onclick = (e) => { e.stopPropagation(); this.unpinTip(); };

      if (it) {
        const inspect = createEl(doc, 'button'); inspect.className = 'gnx-btn'; inspect.textContent = '자세히';
        inspect.onclick = (e) => { e.stopPropagation(); this.props.onInspect?.(slot, it); };

        const replace = createEl(doc, 'button'); replace.className = 'gnx-btn gnx-btn--accent'; replace.textContent = '교체';
        replace.onclick = (e) => { e.stopPropagation(); this.props.onReplace?.(slot); };

        const unequip = createEl(doc, 'button'); unequip.className = 'gnx-btn gnx-btn--danger'; unequip.textContent = '장착 해제';
        unequip.onclick = (e) => { e.stopPropagation(); this.props.onUnequip?.(slot); this.unpinTip(); };

        acts.appendChild(close); acts.appendChild(inspect); acts.appendChild(replace); acts.appendChild(unequip);
      } else {
        const replace = createEl(doc, 'button'); replace.className = 'gnx-btn gnx-btn--accent'; replace.textContent = '장비 장착';
        replace.onclick = (e) => { e.stopPropagation(); this.props.onReplace?.(slot); };
        acts.appendChild(close); acts.appendChild(replace);
      }

      this.tip.appendChild(acts);
    }

    this.tip.setAttribute('data-show', 'true');
  }

  private hideTip() {
    if (!this.tip) return;
    this.tip.setAttribute('data-show', 'false');
    this.tip.style.pointerEvents = 'none';
  }

  private placeTip(cx: number, cy: number) {
    if (!this.tip) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const rect = this.tip.getBoundingClientRect();
    const pad = 12;
    let x = cx, y = cy - 12;

    if (x - rect.width / 2 < pad) x = rect.width / 2 + pad;
    if (x + rect.width / 2 > vw - pad) x = vw - rect.width / 2 - pad;
    if (y - rect.height < pad) y = rect.height + pad;

    this.tip.style.left = `${x}px`;
    this.tip.style.top = `${y}px`;
  }
}