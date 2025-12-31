// ============================================================================
// views/InventoryView.ts — 최종 수정본 (스크롤 튐 방지 + 아이콘 크기 + 툴팁 스탯)
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import type { ICharacterRenderer } from './characterview';
import { InventorySlot } from '@Glibs/types/inventypes';
import { IItem } from '@Glibs/interface/iinven';

type Slot = 'head' | 'chest' | 'hands' | 'legs' | 'weapon' | 'offhand';

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

const CSS_INV = css`
  .gnx-invwrap{ display:grid; gap:14px; grid-template-columns: 360px 1fr; align-items:start; }
  @media (max-width:1000px){ .gnx-invwrap{ grid-template-columns: 1fr; } }
  .gnx-left{ display:grid; gap:12px; grid-template-rows: auto auto; }
  .gnx-charview{ height:280px; border-radius:14px; background:linear-gradient(135deg,#2b2b36,#15151b); box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); display:grid; place-items:center; color:var(--gnx-ui-fg); overflow: hidden; }

  /* 장비 슬롯 그리드 */
  .gnx-equip{ display:grid; gap:10px; grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 1200px) { .gnx-equip{ grid-template-columns: repeat(6, 1fr); } }

  .gnx-e-slot{
    height:70px; border:1px solid rgba(255,255,255,.14); border-radius:10px;
    display:grid; place-items:center; background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
    position:relative; font-size:20px; cursor:default; overflow: hidden;
  }
  .gnx-e-slot[data-accept="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);}
  .gnx-e-slot .cap{position:absolute;left:6px;top:4px;font:11px/1.2 system-ui;color:var(--gnx-ui-sub); z-index: 2;}

  /* 장비 슬롯 아이콘 래퍼 (크기 맞춤) */
  .gnx-e-icon-wrap {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    padding: 4px; box-sizing: border-box;
    display: flex; justify-content: center; align-items: center; z-index: 1;
  }
  .gnx-e-icon-wrap img.gnx-img-icon { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }

  /* 오른쪽 패널 */
  .gnx-right{ display:grid; gap:12px; min-width: 0; }
  .gnx-righthead{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  .gnx-rightgroup{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .gnx-tabs{display:flex;gap:6px;flex-wrap:wrap;}
  .gnx-tab{padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.18);cursor:pointer;background:rgba(255,255,255,.04);color:var(--gnx-ui-fg);}
  .gnx-tab[data-active="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);}
  .gnx-baginfo{ color: var(--gnx-ui-sub); }
  .gnx-btn{ appearance:none; border:1px solid rgba(255,255,255,.18); color:var(--gnx-ui-fg); background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03)); padding:6px 10px; border-radius:10px; cursor:pointer; font-weight:600; min-height:34px; }
  .gnx-input{ box-sizing:border-box; width: clamp(120px, 40vw, 240px); max-width: 100%; min-width: 120px; outline:none; }
  
  /* 인벤토리 그리드 */
  .gnx-invgrid{ --cell: 84px; display:grid; gap:10px; grid-template-columns: repeat(auto-fill, minmax(var(--cell), 1fr)); }
  .gnx-slot{ aspect-ratio: 1 / 1; height: auto; border:1px solid rgba(255,255,255,.16);border-radius:12px;display:grid;place-items:center;position:relative;cursor:pointer; background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));transition:.08s; }
  .gnx-slot[data-selected="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);transform:translateY(-2px);}
  .gnx-slot .gnx-qty{position:absolute;right:6px;bottom:6px;font-size:12px;padding:2px 6px;border-radius:10px;background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.18);}
  .gnx-slot .gnx-icon{width:100%;height:100%;padding:16px;box-sizing:border-box;display:flex;justify-content:center;align-items:center;font-size:30px;user-select:none;}

  /* 툴팁 스타일 (디아블로풍) */
  .gnx-tip {
    position: fixed; z-index: 2147483600;
    min-width: 240px; max-width: 360px;
    padding: 12px; border-radius: 12px;
    color: var(--gnx-ui-fg);
    background: linear-gradient(180deg, rgba(30,33,40,0.95), rgba(20,23,30,0.98));
    border: 1px solid rgba(255,255,255,.18);
    box-shadow: var(--gnx-shadow, 0 8px 40px rgba(0,0,0,.55));
    backdrop-filter: blur(var(--gnx-blur, 8px));
    pointer-events: none; transition: opacity .08s ease; opacity: 0;
  }
  .gnx-tip[data-show="true"]{ opacity: 1; }
  .gnx-tip[data-pinned="true"]{ pointer-events: auto; cursor: default; }
  .gnx-tip .tt-title { font-weight:700; font-size: 16px; margin-bottom:8px; color: var(--gnx-title-fg, #f5f8ff); display:flex; align-items:center; gap:8px; }
  
  /* 스탯 섹션 */
  .tt-stats { margin: 12px 0; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 4px; }
  .tt-stat-row { font-size: 13px; color: #8ab4f8; display: flex; justify-content: space-between; }
  .tt-stat-row.enchant { color: #d87cff; }

  .gnx-tip .tt-badges{ display:flex; gap:6px; flex-wrap:wrap; margin-bottom: 8px; }
  .gnx-tip .tt-badge { font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); }
  .gnx-tip .tt-desc  { margin-top:8px; color: var(--gnx-ui-sub); line-height:1.5; font-size: 13px; font-style: italic; }
  .gnx-tip .tt-actions { margin-top:12px; display:flex; gap:8px; justify-content:flex-end; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); }
  .gnx-tip .tt-btn { appearance:none; border:1px solid rgba(255,255,255,.18); color:var(--gnx-ui-fg); background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03)); padding:6px 10px; border-radius:10px; cursor:pointer; font-weight:600; }
  .gnx-tip .tt-btn--accent { border-color:var(--gnx-ui-accent-weak,#9a7c3e); box-shadow:inset 0 0 0 1px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.25),var(--gnx-card-glow,0 0 18px rgba(216,182,107,.28)); background:linear-gradient(180deg,color-mix(in oklab,var(--gnx-ui-accent,#d8b66b) 25%,transparent),rgba(255,255,255,.02)); color:#fff; }
  .gnx-rar-common{ color:var(--gnx-rar-common); }
  .gnx-rar-rare{   color:var(--gnx-rar-rare); }
  .gnx-rar-epic{   color:var(--gnx-rar-epic); }
`;

type Props = {
  items: InventorySlot[];
  slots?: number;
  equip?: Partial<Record<Slot, IItem | null>>;
  onUse?: (it: IItem) => void;
  onDrop?: (index: number) => void;
  onEquip?: (slot: Slot, index: number, item: IItem) => void;
  onUnequip?: (slot: Slot) => void;
};

export class InventoryView implements IDialogView<Props> {
  private shell?: any; private key?: string; private ctx!: ViewContext; private props!: Props;
  private state = { tab: '전체', sort: 'name' as 'name' | 'weight' | 'qty', rar: 'all' as 'all' | 'Common' | 'Rare' | 'Epic', q: '' };
  private selectedIndex = 0;
  private eqSlots: Slot[] = ['head', 'chest', 'hands', 'legs', 'weapon', 'offhand'];
  private tip?: HTMLDivElement;
  private tipPinned = false;
  private tipItemIndex: number | null = null;
  private charContainer?: HTMLDivElement;
  private _ro?: ResizeObserver;

  constructor(private charRenderer: ICharacterRenderer) {}

  mount(ctx: ViewContext, props: Props) {
    this.ctx = ctx; this.props = props; this.shell = ctx.shell;
    ctx.render.setTitle(this.shell, "인벤토리"); ctx.render.setWide(this.shell, true);
    this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_INV, 'view:inv');
    this.render();
  }

  update(next: Props) { 
    this.props = next; 
    this.render(); // 데이터가 변경되면 전체 렌더링
  }

  unmount() {
    if (this._ro) this._ro.disconnect(); this.charRenderer.dispose();
    if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key); this.destroyTip();
  }

  // [추가] 선택 상태만 갱신 (스크롤 튐 방지)
  private updateSelection() {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    const slots = doc.querySelectorAll('.gnx-slot');
    const displayIndices = this.filteredSortedIndices(this.props.slots || 30);

    slots.forEach((el: any, gridIndex: number) => {
        const slotEl = el as HTMLElement;
        const realIndex = displayIndices[gridIndex];
        const isSelected = (realIndex !== -1 && realIndex === this.selectedIndex);
        slotEl.setAttribute('data-selected', String(isSelected));
    });
  }

  // [추가] 하단 액션 버튼만 갱신
  private updateActions() {
    const selectedSlot = (this.selectedIndex >= 0 && this.selectedIndex < this.props.items.length) 
                         ? this.props.items[this.selectedIndex] : null;

    const actions = [
      ...(selectedSlot ? [{ id:'use', label: this.isEquippable(selectedSlot.item) ? '장착' : '사용', variant:'accent' as const, onClick:()=>this.equipOrUse(this.selectedIndex, selectedSlot.item) }]:[]),
      ...(selectedSlot ? [{ id:'drop', label:'버리기', variant:'danger' as const, onClick:()=>this.props.onDrop?.(this.selectedIndex) }]:[]),
      { id:'close', label:'닫기', onClick:()=>this.ctx.manager.close() },
    ];
    this.ctx.render.setActions(this.shell, actions);
  }

  private render() {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    this.shell.body.innerHTML = '';
    if (this._ro) { this._ro.disconnect(); this._ro = undefined; }

    const wrap = createEl(doc,'div'); wrap.className='gnx-invwrap';
    const left = createEl(doc,'section'); left.className='gnx-left';
    const right = createEl(doc,'section'); right.className='gnx-right';
    wrap.appendChild(left); wrap.appendChild(right);
    this.shell.body.appendChild(wrap);

    /* --- 왼쪽: 캐릭터 + 장착 슬롯 --- */
    this.charContainer = createEl(doc,'div') as HTMLDivElement;
    this.charContainer.className = 'gnx-charview'; this.charContainer.textContent = ''; 
    left.appendChild(this.charContainer);
    this.charRenderer.mount(this.charContainer);
    this._ro = new ResizeObserver((entries) => { for (const entry of entries) { const { width, height } = entry.contentRect; this.charRenderer.resize(width, height); } });
    this._ro.observe(this.charContainer);

    const equip = createEl(doc,'div'); equip.className='gnx-equip';
    this.eqSlots.forEach(s => {
      const slot = createEl(doc,'div'); slot.className='gnx-e-slot'; (slot as any).dataset.slot=s;
      const cap = createEl(doc,'div'); cap.className='cap'; cap.textContent = s;
      const it = this.props.equip?.[s] ?? null;
      slot.appendChild(cap);
      
      const iconWrap = createEl(doc, 'div');
      iconWrap.className = 'gnx-e-icon-wrap'; // 크기 최적화 클래스 적용
      iconWrap.innerHTML = renderIcon(it?.IconPath);
      slot.appendChild(iconWrap);

      slot.onmouseenter = ()=> (slot as any).dataset.accept='true';
      slot.onmouseleave = ()=> (slot as any).dataset.accept='false';
      slot.ondragover = (e: DragEvent)=> e.preventDefault();
      slot.ondrop = (e: DragEvent)=>{ e.preventDefault(); const data = e.dataTransfer?.getData('text/plain'); if (!data) return; const obj = JSON.parse(data); if (obj.type !== 'bag') return; const index = obj.index as number; const slotData = this.props.items[index]; if (!slotData) return; const item = slotData.item; const typeStr = this.getItemTypeStr(item); if (s==='weapon' && typeStr !== '무기') return; if (['head','chest','hands','legs','offhand'].includes(s) && typeStr !== '방어구') return; this.props.onEquip?.(s, index, item); };
      slot.oncontextmenu = (e)=>{ e.preventDefault(); if (it) this.props.onUnequip?.(s); };
      equip.appendChild(slot);
    });
    left.appendChild(equip);

    /* --- 오른쪽: 상단바 + 그리드 --- */
    const rHead = createEl(doc,'div'); rHead.className='gnx-righthead';
    const grpTop = createEl(doc,'div'); grpTop.className='gnx-rightgroup';
    const tabs = createEl(doc, 'div'); tabs.className = 'gnx-tabs';
    const cat = ['전체','무기','방어구','소모','물약'];
    tabs.innerHTML = '';
    cat.forEach(name=>{ const b = createEl(doc, 'button'); b.className = 'gnx-tab'; b.textContent = name; (b as any).dataset.active = String(name === this.state.tab); b.onclick = () => { this.state.tab = name; this.render(); }; tabs.appendChild(b); });
    const bagInfo = createEl(doc, 'div'); bagInfo.className = 'gnx-baginfo';
    const currentCount = this.props.items.length; const maxCount = this.props.slots || 30;
    const totalWeight = this.props.items.reduce((acc, slot) => { const w = (slot.item as any).Weight ?? (slot.item.Stats?.weight ?? 0); return acc + (w * slot.count); }, 0);
    bagInfo.textContent = `가방 ${currentCount} / ${maxCount} · 무게 ${totalWeight.toFixed(1)}`;
    grpTop.appendChild(tabs); grpTop.appendChild(bagInfo);
    const grpFilters = createEl(doc,'div'); grpFilters.className='gnx-rightgroup';
    const selSort = createEl(doc,'select'); selSort.className='gnx-btn';
    ['name','weight','qty'].forEach(v=>{ const o = createEl(doc,'option'); o.value=v; o.textContent = v==='name'?'이름순':(v==='weight'?'무게순':'수량순'); if (v===this.state.sort) o.selected = true; selSort.appendChild(o); });
    selSort.onchange = ()=>{ this.state.sort = selSort.value as any; this.render(); };
    const inpS = createEl(doc,'input'); inpS.className = 'gnx-btn gnx-input'; (inpS as any).placeholder = '검색(이름)'; inpS.value = this.state.q; inpS.oninput = ()=>{ this.state.q = inpS.value.toLowerCase(); this.render(); };
    grpFilters.appendChild(selSort); grpFilters.appendChild(inpS);
    rHead.appendChild(grpTop); rHead.appendChild(grpFilters); right.appendChild(rHead);

    /* --- 인벤토리 그리드 --- */
    const grid = createEl(doc,'div'); grid.className='gnx-invgrid';
    const displayIndices = this.filteredSortedIndices(maxCount);
    
    displayIndices.forEach((realIndex) => {
        const slotData = (realIndex >= 0 && realIndex < this.props.items.length) ? this.props.items[realIndex] : null;
        const cell = createEl(doc,'button'); cell.className='gnx-slot'; 
        (cell as any).dataset.selected = String(realIndex === this.selectedIndex); 
        cell.type='button';
        
        if (slotData) {
            const it = slotData.item; const qty = slotData.count;
            cell.innerHTML = `<div class="gnx-icon" title="${it.Name}">${renderIcon(it.IconPath)}</div><div class="gnx-qty">${qty > 1 ? qty : ''}</div>`;
            cell.draggable = true; 
            cell.ondragstart = (e: DragEvent) => e.dataTransfer?.setData('text/plain', JSON.stringify({ type:'bag', index: realIndex }));
            
            // Tooltip Events
            cell.onmouseenter = (e) => { if (this.tipPinned) return; this.showTip(slotData, realIndex); this.moveTip(e as MouseEvent); };
            cell.onmousemove = (e) => { if (this.tipPinned) return; this.moveTip(e as MouseEvent); };
            cell.onmouseleave = () => { if (this.tipPinned) return; this.hideTip(); };
            
            // Click Event (수정됨: 전체 렌더링 방지)
            cell.onclick = (e) => { 
                e.preventDefault(); e.stopPropagation();
                this.selectedIndex = realIndex; 
                this.updateSelection(); // 스타일만 갱신
                this.updateActions();   // 버튼만 갱신
                
                // 툴팁 로직
                if (!this.tipPinned) { 
                    this.showTip(slotData, realIndex, true); 
                    this.moveTip(e as MouseEvent); 
                } else { 
                    if (this.tipItemIndex === realIndex) { 
                        this.tipPinned = false; 
                        this.hideTip(); 
                    } else { 
                        this.showTip(slotData, realIndex, true); 
                        this.moveTip(e as MouseEvent); 
                    } 
                } 
            };
        } else { 
            // 빈 슬롯
            cell.innerHTML = `<div class="gnx-icon" style="opacity:.25">—</div>`; 
            cell.onclick = (e) => { 
                e.preventDefault();
                this.selectedIndex = -1; 
                this.updateSelection();
                this.updateActions();
            }; 
        }
        grid.appendChild(cell);
    });
    right.appendChild(grid);

    // 하단 버튼 초기 렌더링
    this.updateActions();
    this.ensureTip();
  }

  /* ----------------------------- Tooltip logic ----------------------------- */
  private ensureTip(){ if (this.tip) return; const root = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document; this.tip = createEl(root,'div') as HTMLDivElement; this.tip.className='gnx-tip'; this.tip.setAttribute('data-show','false'); this.tip.innerHTML=''; this.tip.addEventListener('click',(e)=>{ if (!this.tipPinned) return; const target = e.target as HTMLElement; const act = target.closest('[data-action]') as HTMLElement|null; if (!act) return; const action = act.getAttribute('data-action')!; const idx = this.tipItemIndex; if (idx == null) return; const slotData = this.props.items[idx]; if (!slotData) return; if (action==='close'){ this.tipPinned=false; this.hideTip(); return; } if (action==='use'){ this.equipOrUse(idx, slotData.item); this.tipPinned=false; this.hideTip(); return; } if (action==='drop'){ this.props.onDrop?.(idx); this.tipPinned=false; this.hideTip(); return; } }); root.appendChild(this.tip); }
  private destroyTip(){ if (this.tip && this.tip.parentNode) this.tip.parentNode.removeChild(this.tip); this.tip = undefined; this.tipPinned=false; this.tipItemIndex=null; }
  private moveTip(e: MouseEvent){ if (!this.tip) return; const PAD=14, GAP=12; const tipRect = this.tip.getBoundingClientRect(); const vw = window.innerWidth, vh = window.innerHeight; let x = e.clientX + PAD, y = e.clientY + PAD; if (x + tipRect.width + GAP > vw) x = e.clientX - PAD - tipRect.width; if (y + tipRect.height + GAP > vh) y = e.clientY - PAD - tipRect.height; if (x < GAP) x = GAP; if (y < GAP) y = GAP; this.tip.style.left = `${x}px`; this.tip.style.top = `${y}px`; }
  private hideTip(){ if (!this.tip) return; this.tip.setAttribute('data-show','false'); this.tip.removeAttribute('data-pinned'); this.tipItemIndex = null; }

  // [수정] 툴팁 표시 로직 (스탯 표시 포함)
  private showTip(slot: InventorySlot, index:number, pin=false){
    this.ensureTip(); if (!this.tip) return;
    const it = slot.item;
    
    this.tipPinned = pin; this.tipItemIndex = index;
    this.tip.setAttribute('data-pinned', pin?'true':'false');

    const equippable = this.isEquippable(it);
    const primaryLabel = equippable ? '장착' : '사용';
    
    const actions = pin ? `
      <div class="tt-actions">
        <button class="tt-btn tt-btn--accent" data-action="use">${primaryLabel}</button>
        <button class="tt-btn" data-action="drop">버리기</button>
        <button class="tt-btn" data-action="close">닫기</button>
      </div>` : '';
      
    const typeStr = this.getItemTypeStr(it);
    const rarity = (it as any).Level ?? 'Common';
    const rarityClass = this.getRarityClass(rarity);
    const setName = (it as any).Set ?? (it.Stats?.setBonus ? 'Set Item' : null);

    let statsHtml = '';
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

    this.tip.innerHTML = `
      <div class="tt-title">
        <div style="width:28px;height:28px;display:flex;justify-content:center;align-items:center">${renderIcon(it.IconPath)}</div>
        <span class="${rarityClass}">${escapeHtml(it.Name)}</span>
      </div>
      <div class="tt-badges">
        <span class="tt-badge">${typeStr}</span>
        ${setName ? `<span class="tt-badge" style="color:#00ff00">세트: ${escapeHtml(setName)}</span>` : ''}
        ${slot.count > 1 ? `<span class="tt-badge">수량: ${slot.count}</span>` : ''}
      </div>
      ${statsHtml}
      <div class="tt-desc">${escapeHtml(it.Description || '')}</div>
      ${actions}
    `;
    this.tip.setAttribute('data-show','true');
  }

  /* Helpers */
  private equipOrUse(index: number, it: IItem){ const type = this.getItemTypeStr(it); if (type === '무기'){ this.props.onEquip?.('weapon', index, it); return; } if (type === '방어구'){ this.props.onEquip?.(this.pickArmorSlot(it), index, it); return; } this.props.onUse?.(it); }
  private getItemTypeStr(it: IItem): string { return (it as any).ItemTypeTrans ?? it.ItemType; }
  private isEquippable(it: IItem): boolean { const t = this.getItemTypeStr(it); return t === '무기' || t === '방어구'; }
  private getRarityClass(rarity: string) { const r = rarity.toLowerCase(); if (r === 'epic') return 'gnx-rar-epic'; if (r === 'rare') return 'gnx-rar-rare'; return 'gnx-rar-common'; }
  private pickArmorSlot(it: IItem): Slot { const name = it.Name; if (name.includes('투구') || name.includes('Helm')) return 'head'; if (name.includes('갑옷') || name.includes('Armor')) return 'chest'; if (name.includes('장갑') || name.includes('Glove')) return 'hands'; if (name.includes('부츠') || name.includes('Boots')) return 'legs'; return 'offhand'; }
  
  private filteredSortedIndices(maxCount: number): number[] {
    const indices: number[] = [];
    for (let i=0; i<this.props.items.length; i++){ const slot = this.props.items[i]; if (!this.isMatchFilter(slot.item)) continue; indices.push(i); }
    indices.sort((a,b)=>{ const A = this.props.items[a].item; const B = this.props.items[b].item; if (this.state.sort==='name') return A.Name.localeCompare(B.Name, 'ko'); if (this.state.sort==='weight') { const wA = (A as any).Weight ?? 0; const wB = (B as any).Weight ?? 0; return wB - wA; } return this.props.items[b].count - this.props.items[a].count; });
    if (this.state.tab === '전체' && this.state.q === '') { const remaining = maxCount - this.props.items.length; for(let k=0; k<remaining; k++) indices.push(-1); }
    return indices;
  }
  private isMatchFilter(it: IItem): boolean { const typeStr = this.getItemTypeStr(it); if (this.state.tab !== '전체' && typeStr !== this.state.tab) return false; const rarity = (it as any).Level ?? 'Common'; if (this.state.rar !== 'all' && rarity !== this.state.rar) return false; if (this.state.q && !it.Name.toLowerCase().includes(this.state.q)) return false; return true; }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" } as any)[m]);
}