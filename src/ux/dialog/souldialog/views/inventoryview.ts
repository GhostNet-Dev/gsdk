// ============================================================================
// views/inventoryview.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import type { ICharacterRenderer } from './characterview';
import { InventorySlot } from '@Glibs/types/inventypes';
import { IItem } from '@Glibs/interface/iinven';
import { TooltipComponent } from '../core/tooltip';

type Slot = 'head' | 'chest' | 'hands' | 'legs' | 'weapon' | 'weapon_ranged' | 'offhand';

const SLOT_ALIASES: Partial<Record<Slot, string[]>> = {
  weapon: ['handr'],
  offhand: ['handl'],
};

const CSS_INV = css`
  .gnx-invwrap{ display:grid; gap:14px; grid-template-columns: 360px 1fr; align-items:start; }
  @media (max-width:1000px){ .gnx-invwrap{ grid-template-columns: 1fr; } }
  
  .gnx-left{ display:grid; gap:12px; grid-template-rows: auto auto; }
  .gnx-charview{ height:280px; border-radius:14px; background:linear-gradient(135deg,#2b2b36,#15151b); box-shadow:inset 0 0 0 1px rgba(255,255,255,.08); display:grid; place-items:center; color:var(--gnx-ui-fg); overflow: hidden; }

  /* 장비 슬롯 */
  .gnx-equip{ display:grid; gap:10px; grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 1200px) { .gnx-equip{ grid-template-columns: repeat(7, 1fr); } }

  .gnx-e-slot{
    height:70px; border:1px solid rgba(255,255,255,.14); border-radius:10px;
    display:grid; place-items:center; background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
    position:relative; font-size:20px; cursor:default; overflow: hidden;
  }
  .gnx-e-slot[data-accept="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);}
  .gnx-e-slot .cap{position:absolute;left:6px;top:4px;font:11px/1.2 system-ui;color:var(--gnx-ui-sub); z-index: 2;}

  .gnx-e-icon-wrap {
    position: absolute; inset: 0; padding: 4px; 
    display: flex; justify-content: center; align-items: center; z-index: 1;
  }

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
  
  /* 그리드 */
  .gnx-invgrid{ --cell: 84px; display:grid; gap:10px; grid-template-columns: repeat(auto-fill, minmax(var(--cell), 1fr)); }
  .gnx-slot{ aspect-ratio: 1 / 1; height: auto; border:1px solid rgba(255,255,255,.16);border-radius:12px;display:grid;place-items:center;position:relative;cursor:pointer; background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));transition:.08s; }
  .gnx-slot[data-selected="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);transform:translateY(-2px);}
  .gnx-slot .gnx-qty{position:absolute;right:6px;bottom:6px;font-size:12px;padding:2px 6px;border-radius:10px;background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.18);}
  .gnx-slot .gnx-icon{width:100%;height:100%;padding:16px;box-sizing:border-box;display:flex;justify-content:center;align-items:center;font-size:30px;user-select:none;}
`;

type Props = {
  items: InventorySlot[];
  slots?: number;
  equip?: Partial<Record<Slot, IItem | null>>;
  onUse?: (it: IItem) => void;
  onDrop?: (item: IItem) => void;
  onEquip?: (slot: Slot, index: number, item: IItem) => void;
  onUnequip?: (slot: Slot) => void;
};

export class InventoryView implements IDialogView<Props> {
  private shell?: any; private key?: string; private ctx!: ViewContext; private props!: Props;
  private state = { tab: '전체', sort: 'name' as 'name' | 'weight' | 'qty', rar: 'all' as 'all' | 'Common' | 'Rare' | 'Epic', q: '' };
  private selectedIndex = 0;
  private eqSlots: Slot[] = ['head', 'chest', 'hands', 'legs', 'weapon', 'weapon_ranged', 'offhand'];
  
  // 공통 툴팁 컴포넌트
  private tip!: TooltipComponent;
  
  private charContainer?: HTMLDivElement;
  private _ro?: ResizeObserver;

  constructor(private charRenderer: ICharacterRenderer) {}

  mount(ctx: ViewContext, props: Props) {
    this.ctx = ctx; this.props = props; this.shell = ctx.shell;
    
    // 1. 툴팁 초기화
    this.tip = new TooltipComponent(this.shell.sr);

    ctx.render.setTitle(this.shell, "인벤토리"); 
    ctx.render.setWide(this.shell, true);
    this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_INV, 'view:inv');
    
    this.render();
    
    // 2. 외부 클릭 시 툴팁 닫기 리스너 (전역)
    document.addEventListener('pointerdown', this.onGlobalDown, true);
  }

  update(next: Props) { 
    this.props = { ...this.props, ...next }; 
    this.render();
  }

  unmount() {
    if (this._ro) this._ro.disconnect(); 
    this.charRenderer.dispose();
    if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key);
    
    this.tip.destroy();
    document.removeEventListener('pointerdown', this.onGlobalDown, true);
  }

  private onGlobalDown = (e: Event) => {
    if (!this.tip.pinned) return;
    // 툴팁 내부 클릭은 닫지 않음
    if (this.tip.tip && this.tip.tip.contains(e.target as Node)) return;
    this.tip.hide();
  };

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

  private updateActions() {
    const selectedSlot = (this.selectedIndex >= 0 && this.selectedIndex < this.props.items.length) 
                          ? this.props.items[this.selectedIndex] : null;

    const actions = [
      ...(selectedSlot ? [{ id:'use', label: this.isEquippable(selectedSlot.item) ? '장착' : '사용', variant:'accent' as const, onClick:()=>this.equipOrUse(this.selectedIndex, selectedSlot.item) }]:[]),
      ...(selectedSlot ? [{ id:'drop', label:'버리기', variant:'danger' as const, onClick:()=>this.props.onDrop?.(selectedSlot.item) }]:[]),
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
      const it = this.resolveEquipItem(s) ?? null;
      slot.appendChild(cap);
      
      const iconWrap = createEl(doc, 'div');
      iconWrap.className = 'gnx-e-icon-wrap';
      iconWrap.innerHTML = renderIcon(it?.IconPath);
      slot.appendChild(iconWrap);

      // 드래그 앤 드롭 이벤트
      slot.onmouseenter = ()=> (slot as any).dataset.accept='true';
      slot.onmouseleave = ()=> (slot as any).dataset.accept='false';
      slot.ondragover = (e: DragEvent)=> e.preventDefault();
      slot.ondrop = (e: DragEvent)=>{ 
          e.preventDefault(); 
          const data = e.dataTransfer?.getData('text/plain'); 
          if (!data) return; 
          const obj = JSON.parse(data); 
          if (obj.type !== 'bag') return; 
          
          const index = obj.index as number; 
          const slotData = this.props.items[index]; 
          if (!slotData) return; 
          
          const item = slotData.item; 
          const typeStr = this.getItemTypeStr(item); 
          
          if (s==='weapon' && item.ItemType !== 'meleeattack') return; 
          if (s==='weapon_ranged' && item.ItemType !== 'rangeattack') return; 
          if (['head','chest','hands','legs','offhand'].includes(s) && typeStr !== '방어구') return; 
          
          this.props.onEquip?.(s, index, item); 
      };
      slot.oncontextmenu = (e)=>{ e.preventDefault(); if (it) this.props.onUnequip?.(s); };
      equip.appendChild(slot);
    });
    left.appendChild(equip);

    /* --- 오른쪽: 상단바 --- */
    const rHead = createEl(doc,'div'); rHead.className='gnx-righthead';
    const grpTop = createEl(doc,'div'); grpTop.className='gnx-rightgroup';
    const tabs = createEl(doc, 'div'); tabs.className = 'gnx-tabs';
    const cat = ['전체','무기','방어구','소모','물약'];
    tabs.innerHTML = '';
    cat.forEach(name=>{ 
        const b = createEl(doc, 'button'); b.className = 'gnx-tab'; b.textContent = name; 
        (b as any).dataset.active = String(name === this.state.tab); 
        b.onclick = () => { this.state.tab = name; this.render(); }; 
        tabs.appendChild(b); 
    });
    const bagInfo = createEl(doc, 'div'); bagInfo.className = 'gnx-baginfo';
    const currentCount = this.props.items.length; const maxCount = this.props.slots || 30;
    const totalWeight = this.props.items.reduce((acc, slot) => { const w = (slot.item as any).Weight ?? (slot.item.Stats?.weight ?? 0); return acc + (w * slot.count); }, 0);
    bagInfo.textContent = `가방 ${currentCount} / ${maxCount} · 무게 ${totalWeight.toFixed(1)}`;
    grpTop.appendChild(tabs); grpTop.appendChild(bagInfo);
    
    const grpFilters = createEl(doc,'div'); grpFilters.className='gnx-rightgroup';
    const selSort = createEl(doc,'select'); selSort.className='gnx-btn';
    ['name','weight','qty'].forEach(v=>{ 
        const o = createEl(doc,'option'); o.value=v; 
        o.textContent = v==='name'?'이름순':(v==='weight'?'무게순':'수량순'); 
        if (v===this.state.sort) o.selected = true; selSort.appendChild(o); 
    });
    selSort.onchange = ()=>{ this.state.sort = selSort.value as any; this.render(); };
    const inpS = createEl(doc,'input'); inpS.className = 'gnx-btn gnx-input'; (inpS as any).placeholder = '검색(이름)'; inpS.value = this.state.q; inpS.oninput = ()=>{ this.state.q = inpS.value.toLowerCase(); this.render(); };
    grpFilters.appendChild(selSort); grpFilters.appendChild(inpS);
    rHead.appendChild(grpTop); rHead.appendChild(grpFilters); right.appendChild(rHead);

    /* --- 오른쪽: 인벤토리 그리드 --- */
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
            
            // --- Hover Events ---
            cell.onmouseenter = (e) => { 
                if (this.tip.pinned) return; 
                this.tip.renderItem(it, qty);
                this.tip.move(e as MouseEvent); 
            };
            cell.onmousemove = (e) => { 
                if (!this.tip.pinned) this.tip.move(e as MouseEvent); 
            };
            cell.onmouseleave = () => { 
                if (!this.tip.pinned) this.tip.hide(); 
            };
            
            // --- Click Event (직접 바인딩 적용) ---
            cell.onclick = (e) => { 
                e.preventDefault(); e.stopPropagation();
                
                this.selectedIndex = realIndex; 
                this.updateSelection();
                this.updateActions();
                
                const isEquippable = this.isEquippable(it);
                const btnLabel = isEquippable ? '장착' : '사용';
                const actions = `
                    <div class="tt-actions">
                        <button class="tt-btn tt-btn--accent" data-action="use">${btnLabel}</button>
                        <button class="tt-btn" data-action="drop">버리기</button>
                        <button class="tt-btn" data-action="close">닫기</button>
                    </div>`;
                
                // 1. 툴팁 렌더링
                this.tip.renderItem(it, qty, { pin: true, actions });
                this.tip.move(e as MouseEvent);
                
                // 2. 버튼 이벤트 직접 바인딩
                const tipEl = this.tip.tip;
                if (tipEl) {
                    tipEl.querySelector('[data-action="use"]')?.addEventListener('click', () => {
                        this.equipOrUse(realIndex, it);
                        this.tip.hide();
                    });
                    tipEl.querySelector('[data-action="drop"]')?.addEventListener('click', () => {
                        this.props.onDrop?.(it);
                        this.tip.hide();
                    });
                    tipEl.querySelector('[data-action="close"]')?.addEventListener('click', () => {
                        this.tip.hide();
                    });
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

    this.updateActions();
  }

  private resolveEquipItem(slot: Slot): IItem | null | undefined {
    const direct = this.props.equip?.[slot];
    if (direct) return direct;

    const aliases = SLOT_ALIASES[slot] ?? [];
    for (const key of aliases) {
      const aliasItem = (this.props.equip as Record<string, IItem | null | undefined> | undefined)?.[key];
      if (aliasItem) return aliasItem;
    }
    return direct;
  }

  /* Helpers */
  private equipOrUse(index: number, it: IItem){ 
      const type = this.getItemTypeStr(it); 
      if (it.ItemType === 'meleeattack'){ this.props.onEquip?.('weapon', index, it); return; } 
      if (it.ItemType === 'rangeattack'){ this.props.onEquip?.('weapon_ranged', index, it); return; } 
      if (type === '방어구'){ this.props.onEquip?.(this.pickArmorSlot(it), index, it); return; } 
      this.props.onUse?.(it); 
  }
  
  private getItemTypeStr(it: IItem): string { return (it as any).ItemTypeTrans ?? it.ItemType; }
  private isEquippable(it: IItem): boolean { const t = this.getItemTypeStr(it); return t === '무기' || t === '방어구'; }
  
  private pickArmorSlot(it: IItem): Slot { 
      const name = it.Name; 
      if (name.includes('투구') || name.includes('Helm')) return 'head'; 
      if (name.includes('갑옷') || name.includes('Armor')) return 'chest'; 
      if (name.includes('장갑') || name.includes('Glove')) return 'hands'; 
      if (name.includes('부츠') || name.includes('Boots')) return 'legs'; 
      return 'offhand'; 
  }
  
  private filteredSortedIndices(maxCount: number): number[] {
    const indices: number[] = [];
    for (let i=0; i<this.props.items.length; i++){ const slot = this.props.items[i]; if (!this.isMatchFilter(slot.item)) continue; indices.push(i); }
    indices.sort((a,b)=>{ const A = this.props.items[a].item; const B = this.props.items[b].item; if (this.state.sort==='name') return A.Name.localeCompare(B.Name, 'ko'); if (this.state.sort==='weight') { const wA = (A as any).Weight ?? 0; const wB = (B as any).Weight ?? 0; return wB - wA; } return this.props.items[b].count - this.props.items[a].count; });
    if (this.state.tab === '전체' && this.state.q === '') { const remaining = maxCount - this.props.items.length; for(let k=0; k<remaining; k++) indices.push(-1); }
    return indices;
  }
  
  private isMatchFilter(it: IItem): boolean { 
      const typeStr = this.getItemTypeStr(it); 
      if (this.state.tab !== '전체' && typeStr !== this.state.tab) return false; 
      const rarity = (it as any).Level ?? 'Common'; 
      if (this.state.rar !== 'all' && rarity !== this.state.rar) return false; 
      if (this.state.q && !it.Name.toLowerCase().includes(this.state.q)) return false; 
      return true; 
  }
}
