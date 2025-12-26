// ============================================================================
// views/InventoryView.ts  — Right-panel header (tabs+bag info + filters)
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import type { Item } from '../dlgstore';
// [수정 1] 캐릭터 렌더러 인터페이스 임포트
import { ICharacterRenderer } from './characterview';

type Slot = 'head'|'chest'|'hands'|'legs'|'weapon'|'offhand';

const CSS_INV = css`
  /* 2열 반응형 레이아웃: 왼(캐릭터+장착), 오른(상단바+필터+인벤) */
  .gnx-invwrap{
    display:grid; gap:14px;
    /* 왼쪽 패널 360px 고정, 오른쪽은 남는 공간(minmax로 최소 폭 보장) */
    grid-template-columns: 360px 1fr;
    align-items:start;
  }
  
  /* 화면이 좁아지면 1열로 변경 (모바일/태블릿) */
  @media (max-width:1000px){
    .gnx-invwrap{ grid-template-columns: 1fr; }
  }

  /* 왼쪽 패널 */
  .gnx-left{
    display:grid; gap:12px;
    grid-template-rows: auto auto;
  }
  .gnx-charview{
    height:280px; border-radius:14px;
    background:linear-gradient(135deg,#2b2b36,#15151b);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
    display:grid; place-items:center; color:var(--gnx-ui-fg);
    overflow: hidden;
  }

  /* [수정] 장비 슬롯 그리드: 동적 배치 */
  /* 기본: 3칸씩 2줄로 배치하여 가로 공간 절약 */
  .gnx-equip{
    display:grid; gap:10px;
    grid-template-columns: repeat(3, 1fr); 
  }
  /* 화면이 충분히 넓거나 모바일에서 1열 레이아웃일 때는 한 줄로(6칸) 표시 가능하면 표시 */
  @media (min-width: 1200px) {
     .gnx-equip{ grid-template-columns: repeat(6, 1fr); }
  }
  
  .gnx-e-slot{
    height:70px;border:1px solid rgba(255,255,255,.14);border-radius:10px;
    display:grid;place-items:center;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
    position:relative;font-size:20px; cursor:default;
  }
  .gnx-e-slot[data-accept="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);}
  .gnx-e-slot .cap{position:absolute;left:6px;top:4px;font:11px/1.2 system-ui;color:var(--gnx-ui-sub)}

  /* 오른쪽 패널 */
  .gnx-right{ 
      display:grid; gap:12px; 
      min-width: 0; /* [중요] Grid 자식의 overflow 방지 필수 설정 */
  }

  /* ... (헤더/탭 스타일은 기존 유지) ... */
  .gnx-righthead{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
  .gnx-rightgroup{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .gnx-tabs{display:flex;gap:6px;flex-wrap:wrap;}
  .gnx-tab{padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.18);cursor:pointer;background:rgba(255,255,255,.04);color:var(--gnx-ui-fg);}
  .gnx-tab[data-active="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);}
  .gnx-baginfo{ color: var(--gnx-ui-sub); }

  .gnx-btn{ appearance:none; border:1px solid rgba(255,255,255,.18); color:var(--gnx-ui-fg);
    background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
    padding:6px 10px; border-radius:10px; cursor:pointer; font-weight:600; min-height:34px;
  }
  .gnx-input{
    box-sizing:border-box; width: clamp(120px, 40vw, 240px);
    max-width: 100%; min-width: 120px; outline:none;
  }

  /* [수정] 인벤토리 그리드: 완전 반응형 (핵심 수정) */
  .gnx-invgrid{
    --cell: 84px;
    display:grid; 
    gap:10px; 
    /* justify-content:center; <--- 제거 (왼쪽 정렬이 더 자연스러움) */
    
    /* [핵심] 6개 고정이 아니라, 공간 남는 만큼 채우기 */
    grid-template-columns: repeat(auto-fill, minmax(var(--cell), 1fr));
  }
  
  .gnx-slot{
    /* width:var(--cell); <--- 고정 너비 제거하고 반응형으로 */
    aspect-ratio: 1 / 1; /* 정사각형 비율 유지 */
    height: auto;       /* 높이 자동 */
    
    border:1px solid rgba(255,255,255,.16);border-radius:12px;display:grid;place-items:center;position:relative;cursor:pointer;
    background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));transition:.08s;
  }
  .gnx-slot[data-selected="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);transform:translateY(-2px);}
  .gnx-slot .gnx-qty{position:absolute;right:6px;bottom:6px;font-size:12px;padding:2px 6px;border-radius:10px;background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.18);}
  .gnx-slot .gnx-icon{font-size:30px;user-select:none;}

  /* ... (툴팁 스타일 기존 유지) ... */
  .gnx-tip {
    position: fixed; z-index: 2147483600;
    min-width: 240px; max-width: 360px;
    padding: 10px 12px; border-radius: 12px;
    color: var(--gnx-ui-fg);
    background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
    border: 1px solid rgba(255,255,255,.18);
    box-shadow: var(--gnx-shadow, 0 8px 40px rgba(0,0,0,.55));
    backdrop-filter: blur(var(--gnx-blur, 8px));
    pointer-events: none; transition: opacity .08s ease; opacity: 0;
  }
  .gnx-tip[data-show="true"]{ opacity: 1; }
  .gnx-tip[data-pinned="true"]{ pointer-events: auto; cursor: default; }
  .gnx-tip .tt-title { font-weight:700; margin-bottom:4px; color: var(--gnx-title-fg, #f5f8ff); }
  .gnx-tip .tt-row   { font-size:12px; color: var(--gnx-ui-sub); margin:2px 0; }
  .gnx-tip .tt-badges{ display:flex; gap:6px; flex-wrap:wrap; margin:6px 0; }
  .gnx-tip .tt-badge { font-size:11px; padding:2px 8px; border-radius:999px; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14); }
  .gnx-tip .tt-desc  { margin-top:6px; color: var(--gnx-ui-fg); line-height:1.5; }
  .gnx-tip .tt-actions { margin-top:8px; display:flex; gap:8px; justify-content:flex-end; }
  .gnx-tip .tt-btn { appearance:none; border:1px solid rgba(255,255,255,.18); color:var(--gnx-ui-fg);
    background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
    padding:6px 10px; border-radius:10px; cursor:pointer; font-weight:600; }
  .gnx-tip .tt-btn--accent { border-color:var(--gnx-ui-accent-weak,#9a7c3e);
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.35),0 0 0 1px rgba(0,0,0,.25),var(--gnx-card-glow,0 0 18px rgba(216,182,107,.28));
    background:linear-gradient(180deg,color-mix(in oklab,var(--gnx-ui-accent,#d8b66b) 25%,transparent),rgba(255,255,255,.02)); color:#fff; }
`;

type Props = {
  items: (Item | null)[];
  slots?: number;
  equip?: Partial<Record<Slot, Item|null>>;
  onUse?: (it: Item) => void;
  onDrop?: (index: number) => void;
  onEquip?: (slot: Slot, index: number, item: Item) => void;
  onUnequip?: (slot: Slot) => void;
  // [수정 2] onMountCharacterView 제거 (내부에서 처리하므로 불필요)
};

export class InventoryView implements IDialogView<Props> {
  private shell?: any; private key?: string; private ctx!: ViewContext; private props!: Props;
  private state = { tab: '전체', sort: 'name' as 'name' | 'weight' | 'qty', rar: 'all' as 'all' | 'Common' | 'Rare' | 'Epic', q: '' };
  private selected = 0;
  private eqSlots: Slot[] = ['head', 'chest', 'hands', 'legs', 'weapon', 'offhand'];

  private tip?: HTMLDivElement;
  private tipPinned = false;
  private tipItemIndex: number | null = null;

  private charContainer?: HTMLDivElement;
  // [수정 3] ResizeObserver 참조 저장용
  private _ro?: ResizeObserver;

  // [수정 4] 생성자에서 Renderer 주입
  constructor(private charRenderer: ICharacterRenderer) {}

  mount(ctx: ViewContext, props: Props) {
    this.ctx = ctx; this.props = props;
    this.shell = ctx.shell
    ctx.render.setTitle(this.shell, "인벤토리");
    ctx.render.setWide(this.shell, true)
    this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_INV, 'view:inv');
    this.render();
  }
  update(next: Props) { this.props = next; this.render(); }

  unmount() {
    // [수정 5] 리소스 해제
    if (this._ro) this._ro.disconnect();
    this.charRenderer.dispose();

    if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key);
    this.destroyTip();
  }

  private render() {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    this.shell.body.innerHTML = '';

    // 기존의 ResizeObserver가 있다면 해제 (DOM이 재생성되므로)
    if (this._ro) { this._ro.disconnect(); this._ro = undefined; }

    /* ---------- 본문 2-컬럼 ---------- */
    const wrap = createEl(doc,'div'); wrap.className='gnx-invwrap';
    const left = createEl(doc,'section'); left.className='gnx-left';
    const right = createEl(doc,'section'); right.className='gnx-right';
    wrap.appendChild(left); wrap.appendChild(right);
    this.shell.body.appendChild(wrap);

    // 왼쪽: 캐릭터 미리보기 + 장착 슬롯
    this.charContainer = createEl(doc,'div') as HTMLDivElement;
    this.charContainer.className = 'gnx-charview';
    // [수정 6] 텍스트 제거 및 렌더러 마운트
    this.charContainer.textContent = ''; 
    left.appendChild(this.charContainer);

    // 렌더러 부착
    this.charRenderer.mount(this.charContainer);
    
    // ResizeObserver 설정 (반응형 대응)
    this._ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect;
            this.charRenderer.resize(width, height);
        }
    });
    this._ro.observe(this.charContainer);

    const equip = createEl(doc,'div'); equip.className='gnx-equip';
    this.eqSlots.forEach(s=>{
      const slot = createEl(doc,'div'); slot.className='gnx-e-slot'; (slot as any).dataset.slot=s;
      const cap = createEl(doc,'div'); cap.className='cap'; cap.textContent = s;
      const it = this.props.equip?.[s] ?? null;
      slot.appendChild(cap);
      
      const iconWrap = createEl(doc, 'div');
      iconWrap.style.cssText = 'width:100%;height:100%;padding:14px;box-sizing:border-box;display:flex;justify-content:center;align-items:center;';
      iconWrap.innerHTML = renderIcon(it?.icon);
      slot.appendChild(iconWrap);

      slot.onmouseenter = ()=> (slot as any).dataset.accept='true';
      slot.onmouseleave = ()=> (slot as any).dataset.accept='false';
      slot.ondragover = (e: DragEvent)=> e.preventDefault();
      slot.ondrop = (e: DragEvent)=>{
        e.preventDefault();
        const data = e.dataTransfer?.getData('text/plain'); if (!data) return;
        const obj = JSON.parse(data);
        if (obj.type!=='bag') return;
        const index = obj.index as number;
        const item = this.props.items[index] as Item;
        if (!item) return;
        if (s==='weapon' && item.cat!=='무기') return;
        if (['head','chest','hands','legs','offhand'].includes(s) && item.cat!=='방어구') return;
        this.props.onEquip?.(s, index, item);
      };
      slot.oncontextmenu = (e)=>{
        e.preventDefault();
        if (it) this.props.onUnequip?.(s);
      };
      equip.appendChild(slot);
    });
    left.appendChild(equip);

    // 오른쪽 헤더: (상단바 + 필터/정렬/검색) — 모두 오른쪽에!
    const rHead = createEl(doc,'div'); rHead.className='gnx-righthead';

    // 상단바(탭 + 가방정보)
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
    const count = this.props.items.filter(Boolean).length;
    const weight= this.props.items.reduce((s,it)=> s + (it?.wt||0)*(it?.qty||0),0);
    bagInfo.textContent = `가방 ${count} / ${this.props.items.length} · 무게 ${weight.toFixed(1)}`;
    grpTop.appendChild(tabs); grpTop.appendChild(bagInfo);

    // 필터/정렬/검색
    const grpFilters = createEl(doc,'div'); grpFilters.className='gnx-rightgroup';
    const selSort = createEl(doc,'select'); selSort.className='gnx-btn';
    ['name','weight','qty'].forEach(v=>{
      const o = createEl(doc,'option'); o.value=v; o.textContent = v==='name'?'이름순':(v==='weight'?'무게순':'수량순');
      if (v===this.state.sort) o.selected = true; selSort.appendChild(o);
    });
    selSort.onchange = ()=>{ this.state.sort = selSort.value as any; this.render(); };

    const selRar = createEl(doc,'select'); selRar.className='gnx-btn';
    ['all','Common','Rare','Epic'].forEach(v=>{
      const o = createEl(doc,'option'); o.value=v; o.textContent = v==='all'?'전체 등급':v;
      if (v===this.state.rar) o.selected = true; selRar.appendChild(o);
    });
    selRar.onchange = ()=>{ this.state.rar = selRar.value as any; this.render(); };

    const inpS = createEl(doc,'input'); inpS.className = 'gnx-btn gnx-input';
    (inpS as any).placeholder = '검색(이름)';
    inpS.value = this.state.q;
    inpS.oninput = ()=>{ this.state.q = inpS.value.toLowerCase(); this.render(); };

    grpFilters.appendChild(selSort); grpFilters.appendChild(selRar); grpFilters.appendChild(inpS);

    // 오른쪽 상단 헤더 조립
    rHead.appendChild(grpTop);
    rHead.appendChild(grpFilters);
    right.appendChild(rHead);

    // 오른쪽: 인벤토리 그리드(툴팁 상세)
    const grid = createEl(doc,'div'); grid.className='gnx-invgrid';
    const order = this.filteredSortedIndices();
    order.forEach(i=>{
      const it = this.props.items[i];
      const cell = createEl(doc,'button'); cell.className='gnx-slot'; (cell as any).dataset.selected = String(i === this.selected);
      cell.type='button';
      if (it){
        cell.innerHTML = `<div class="gnx-icon" title="${it.name}">${renderIcon(it.icon)}</div><div class="gnx-qty">${it.qty}</div>`;
        cell.draggable = true;
        cell.ondragstart = (e: DragEvent)=> e.dataTransfer?.setData('text/plain', JSON.stringify({ type:'bag', index:i }));

        // Tooltip
        cell.onmouseenter = (e)=>{ if (this.tipPinned) return; this.showTip(it,i); this.moveTip(e as MouseEvent); };
        cell.onmousemove  = (e)=>{ if (this.tipPinned) return; this.moveTip(e as MouseEvent); };
        cell.onmouseleave = ()=>{ if (this.tipPinned) return; this.hideTip(); };
        cell.onclick = (e)=>{
          if (!it) return;
          if (!this.tipPinned){ this.showTip(it,i,true); this.moveTip(e as MouseEvent); }
          else { if (this.tipItemIndex===i){ this.tipPinned=false; this.hideTip(); } else { this.showTip(it,i,true); this.moveTip(e as MouseEvent); } }
        };
      } else {
        cell.innerHTML = `<div class="gnx-icon" style="opacity:.25">—</div>`;
      }
      cell.addEventListener('mousedown', ()=>{ this.selected=i; });
      grid.appendChild(cell);
    });
    right.appendChild(grid);

    // 하단 액션
    const it = this.props.items[this.selected];
    const actions = [
      ...(it ? [{
        id:'use',
        label:(it.cat==='무기'||it.cat==='방어구')?'장착':'사용',
        variant:'accent' as const,
        onClick:()=>this.equipOrUse(this.selected, it)
      }]:[]),
      ...(this.props.items[this.selected] ? [{
        id:'drop',
        label:'버리기',
        variant:'danger' as const,
        onClick:()=>this.props.onDrop?.(this.selected)
      }]:[]),
      { id:'close', label:'닫기', onClick:()=>this.ctx.manager.close() },
    ];
    this.ctx.render.setActions(this.shell, actions);

    // Tooltip DOM
    this.ensureTip();
  }

  /* ----------------------------- Tooltip logic ----------------------------- */
  private ensureTip(){
    if (this.tip) return;
    const root = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    this.tip = createEl(root,'div') as HTMLDivElement;
    this.tip.className='gnx-tip';
    this.tip.setAttribute('data-show','false');
    this.tip.innerHTML='';
    this.tip.addEventListener('click',(e)=>{
      if (!this.tipPinned) return;
      const target = e.target as HTMLElement;
      const act = target.closest('[data-action]') as HTMLElement|null;
      if (!act) return;

      const action = act.getAttribute('data-action')!;
      const idx = this.tipItemIndex;
      if (idx==null) return;
      const item = this.props.items[idx] as Item | null;
      if (!item) return;

      if (action==='close'){ this.tipPinned=false; this.hideTip(); return; }
      if (action==='use'){ this.equipOrUse(idx, item); this.tipPinned=false; this.hideTip(); return; }
      if (action==='drop'){ this.props.onDrop?.(idx); this.tipPinned=false; this.hideTip(); return; }
    });
    root.appendChild(this.tip);
  }
  private destroyTip(){
    if (this.tip && this.tip.parentNode) this.tip.parentNode.removeChild(this.tip);
    this.tip = undefined; this.tipPinned=false; this.tipItemIndex=null;
  }
  private showTip(it: Item, index:number, pin=false){
    this.ensureTip(); if (!this.tip) return;
    this.tipPinned = pin; this.tipItemIndex = index;
    this.tip.setAttribute('data-pinned', pin?'true':'false');

    const primaryLabel = (it.cat==='무기'||it.cat==='방어구')?'장착':'사용';
    const actions = pin ? `
      <div class="tt-actions">
        <button class="tt-btn tt-btn--accent" data-action="use">${primaryLabel}</button>
        <button class="tt-btn" data-action="drop">버리기</button>
        <button class="tt-btn" data-action="close">닫기</button>
      </div>` : '';

      this.tip.innerHTML = `
      <div class="tt-title" style="display:flex;align-items:center;gap:6px">
        <div style="width:24px;height:24px;display:flex;justify-content:center;align-items:center">${renderIcon(it.icon)}</div>
        ${escapeHtml(it.name)}
      </div>
      <div class="tt-badges">
        <span class="tt-badge">${it.rarity}</span>
        <span class="tt-badge">${it.cat}</span>
        ${('set' in (it as any) && (it as any).set) ? `<span class="tt-badge">세트: ${escapeHtml((it as any).set)}</span>`:''}
        <span class="tt-badge">수량: ${it.qty}</span>
        <span class="tt-badge">무게: ${it.wt}</span>
      </div>
      <div class="tt-desc">${escapeHtml(it.desc || '')}</div>
      ${actions}
    `;
    this.tip.setAttribute('data-show','true');
  }
  private hideTip(){
    if (!this.tip) return;
    this.tip.setAttribute('data-show','false');
    this.tip.removeAttribute('data-pinned');
    this.tipItemIndex = null;
  }
  private moveTip(e: MouseEvent){
    if (!this.tip) return;
    const PAD=14, GAP=12;
    const tipRect = this.tip.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = e.clientX + PAD, y = e.clientY + PAD;
    if (x + tipRect.width + GAP > vw) x = e.clientX - PAD - tipRect.width;
    if (y + tipRect.height + GAP > vh) y = e.clientY - PAD - tipRect.height;
    if (x < GAP) x = GAP; if (y < GAP) y = GAP;
    this.tip.style.left = `${x}px`; this.tip.style.top = `${y}px`;
  }

  /* ------------------------------ Actions ---------------------------------- */
  private equipOrUse(index:number, it: Item){
    if (it.cat==='무기'){ this.props.onEquip?.('weapon', index, it); return; }
    if (it.cat==='방어구'){ this.props.onEquip?.(this.pickArmorSlot(it), index, it); return; }
    this.props.onUse?.(it);
  }
  private pickArmorSlot(it: Item): Slot {
    const sub = (it as any).subcat as string | undefined;
    if (sub==='머리') return 'head';
    if (sub==='상체') return 'chest';
    if (sub==='장갑') return 'hands';
    if (sub==='하체') return 'legs';
    return 'offhand';
  }

  /* ------------------------------ Helpers ---------------------------------- */
  private filteredSortedIndices(){
    const idx:number[]=[];
    const catOK=(it:Item|null)=> this.state.tab==='전체'||(it&&it.cat===this.state.tab);
    const rarOK=(it:Item|null)=> this.state.rar==='all'||(it&&it.rarity===this.state.rar);
    const qOK  =(it:Item|null)=> !this.state.q || (it && it.name.toLowerCase().includes(this.state.q));
    for (let i=0;i<this.props.items.length;i++){
      const it=this.props.items[i];
      if (!it) { idx.push(i); continue; }
      if (!catOK(it) || !rarOK(it) || !qOK(it)) continue;
      idx.push(i);
    }
    const filled=idx.filter(i=>!!this.props.items[i]);
    const empty =idx.filter(i=>!this.props.items[i]);
    filled.sort((a,b)=>{
      const A=this.props.items[a]!, B=this.props.items[b]!;
      if (this.state.sort==='name')   return A.name.localeCompare(B.name,'ko');
      if (this.state.sort==='weight') return (B.wt - A.wt);
      return (B.qty - A.qty);
    });
    return [...filled, ...empty];
  }
}
function escapeHtml(s:string){
  return s.replace(/[&<>"']/g,(m)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" } as any)[m]);
}