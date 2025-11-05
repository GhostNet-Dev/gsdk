// ============================================================================
// views/InventoryView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { css } from '../dlgstyle';
import type { Item } from '../dlgstore';

const CSS_INV = css`
  .gnx-invbar{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;}
  .gnx-tabs{display:flex;gap:6px;flex-wrap:wrap;}
  .gnx-tab{padding:6px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.18);cursor:pointer;background:rgba(255,255,255,.04);color:var(--gnx-ui-fg);}
  .gnx-tab[data-active="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);}
  .gnx-invwrap{display:grid;grid-template-columns:1fr 320px;gap:14px;}
  @media (max-width:1000px){.gnx-invwrap{grid-template-columns:1fr}}
  .gnx-invgrid{--cell:84px;display:grid;grid-template-columns:repeat(6,var(--cell));gap:10px;justify-content:center;}
  @media (max-width:700px){.gnx-invgrid{grid-template-columns:repeat(4,var(--cell));}}
  .gnx-slot{width:var(--cell);height:var(--cell);border:1px solid rgba(255,255,255,.16);border-radius:12px;display:grid;place-items:center;position:relative;cursor:pointer;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));transition:.08s;}
  .gnx-slot[data-selected="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);transform:translateY(-2px);}
  .gnx-slot .gnx-qty{position:absolute;right:6px;bottom:6px;font-size:12px;padding:2px 6px;border-radius:10px;background:rgba(0,0,0,.35);color:#fff;border:1px solid rgba(255,255,255,.18);}
  .gnx-slot .gnx-icon{font-size:30px;user-select:none;}
  .gnx-equip-mini{display:grid;grid-template-columns:repeat(6, 44px);gap:6px;padding:6px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));}
  .gnx-e-mini{width:44px;height:44px;border:1px dashed rgba(255,255,255,.20);border-radius:8px;display:grid;place-items:center;position:relative;background:rgba(255,255,255,.03);font-size:20px;}
  .gnx-e-mini[data-accept="true"]{border-color:var(--gnx-ui-accent);box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);}
  .gnx-detail{border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;display:grid;gap:10px;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));}
`;

type Props = {
  items: (Item|null)[];
  slots?: number;
  onUse?: (it: Item) => void;
  onDrop?: (index: number) => void;
};

export class InventoryView implements IDialogView<Props> {
  private shell?: any; private key?: string; private ctx!: ViewContext; private props!: Props;
  private state = { tab:'전체', sort:'name' as 'name'|'weight'|'qty', rar:'all' as 'all'|'Common'|'Rare'|'Epic', q:'' };
  private selected = 0;
  private eqSlots = ['head','chest','hands','legs','weapon','offhand'] as const;

  mount(ctx: ViewContext, props: Props) {
    this.ctx = ctx; this.props = props;
    this.shell = ctx.render.openShell({ title:'인벤토리', wide:true });
    this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_INV, 'view:inv');
    this.render();
  }
  update(next: Props) { this.props = next; this.render(); }
  unmount() { if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key); }

  private render() {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    this.shell.body.innerHTML = '';

    // 상단 바
    const bar = doc.createElement('div'); bar.className='gnx-invbar';
    const left = doc.createElement('div'); left.style.display='flex'; left.style.gap='12px'; left.style.alignItems='center';
    const tabs = doc.createElement('div'); tabs.className='gnx-tabs';
    const cat = ['전체','무기','방어구','소모','키'];
    tabs.innerHTML = '';
    cat.forEach(name=>{
      const b = doc.createElement('button'); b.className='gnx-tab'; b.textContent=name;
      (b as any).dataset.active = String(name===this.state.tab);
      b.onclick = ()=> { this.state.tab = name; this.render(); };
      tabs.appendChild(b);
    });
    const bagInfo = doc.createElement('div'); bagInfo.className='gnx-text';
    const count = this.props.items.filter(Boolean).length;
    const weight = this.props.items.reduce((s,it)=> s+(it?.wt||0)*(it?.qty||0),0);
    bagInfo.textContent = `가방 ${count} / ${this.props.items.length} · 무게 ${weight.toFixed(1)}`;

    left.appendChild(tabs); left.appendChild(bagInfo);

    const right = doc.createElement('div'); right.style.display='flex'; right.style.gap='10px'; right.style.alignItems='center'; right.style.flexWrap='wrap';

    // equip mini
    const mini = doc.createElement('div'); mini.className='gnx-equip-mini';
    this.eqSlots.forEach(s=>{
      const d = doc.createElement('div'); d.className='gnx-e-mini'; (d as any).dataset.slot=s;
      d.onmouseenter=()=> (d as any).dataset.accept='true';
      d.onmouseleave=()=> (d as any).dataset.accept='false';
      d.ondragover=(e: any)=> e.preventDefault();
      d.ondrop=(e: any)=>{
        e.preventDefault();
        const data = e.dataTransfer?.getData('text/plain'); if (!data) return;
        const obj = JSON.parse(data); if (obj.type!=='bag') return;
        const item = this.props.items[obj.index] as Item; if (!item) return;
        if (s==='weapon' && item.cat!=='무기') return; // 간단한 검사
        if (['head','chest','hands','legs','offhand'].includes(s) && item.cat!=='방어구') return;
        // 실제 장착: 여기선 단순히 아이콘만 표시
        d.textContent = item.icon;
        const newItems = this.props.items.slice(); newItems[obj.index] = null;
        this.update({ ...this.props, items: newItems });
      };
      mini.appendChild(d);
    });

    const selSort = doc.createElement('select'); selSort.className='gnx-btn'; ['name','weight','qty'].forEach(v=>{
      const o=doc.createElement('option'); o.value=v; o.textContent=(v==='name'?'이름순':v==='weight'?'무게순':'수량순'); if (v===this.state.sort) o.selected=true; selSort.appendChild(o);
    });
    selSort.onchange=()=>{ this.state.sort = selSort.value as any; this.render(); };

    const selRar = doc.createElement('select'); selRar.className='gnx-btn'; ['all','Common','Rare','Epic'].forEach(v=>{
      const o=doc.createElement('option'); o.value=v; o.textContent=(v==='all'?'전체 등급':v); if (v===this.state.rar) o.selected=true; selRar.appendChild(o);
    });
    selRar.onchange=()=>{ this.state.rar = selRar.value as any; this.render(); };

    const inpS = doc.createElement('input'); inpS.className='gnx-btn'; (inpS as any).style.width='160px'; (inpS as any).placeholder='검색(이름)';
    inpS.value = this.state.q; inpS.oninput = ()=>{ this.state.q = inpS.value.toLowerCase(); this.render(); };

    right.appendChild(mini); right.appendChild(selSort); right.appendChild(selRar); right.appendChild(inpS);
    bar.appendChild(left); bar.appendChild(right);
    this.shell.body.appendChild(bar);

    // 그리드 + 디테일
    const wrap = doc.createElement('div'); wrap.className='gnx-invwrap';
    const grid = doc.createElement('div'); grid.className='gnx-invgrid';
    const detail = doc.createElement('aside'); detail.className='gnx-detail';

    const order = this.filteredSortedIndices();
    order.forEach(i=>{
      const it = this.props.items[i];
      const cell = doc.createElement('button'); cell.className='gnx-slot'; (cell as any).dataset.selected = String(i===this.selected);
      cell.type='button';
      if (it) {
        cell.innerHTML = `<div class="gnx-icon" title="${it.name}">${it.icon}</div><div class="gnx-qty">${it.qty}</div>`;
        cell.draggable = true;
        cell.ondragstart=(e: any)=> e.dataTransfer?.setData('text/plain', JSON.stringify({type:'bag', index:i}));
      } else {
        cell.innerHTML = `<div class="gnx-icon" style="opacity:.25">—</div>`;
      }
      cell.onclick=()=>{ this.selected = i; this.render(); };
      grid.appendChild(cell);
    });

    const it = this.props.items[this.selected];
    detail.innerHTML = it ? `<div class="gnx-text"><b>${it.icon} ${it.name}</b></div>
      <div class="gnx-text">희귀도: <b class="${it.rarity==='Epic'?'gnx-rar-epic': it.rarity==='Rare'?'gnx-rar-rare':'gnx-rar-common'}">${it.rarity}</b></div>
      <div class="gnx-text">분류: ${it.cat}${it.set?` · 세트: ${it.set}`:''}</div>
      <div class="gnx-text">수량: ${it.qty} · 무게: ${it.wt}</div>
      <div class="gnx-text">${it.desc}</div>` : `<div class="gnx-text">좌측에서 아이템을 선택하세요.</div>`;

    wrap.appendChild(grid); wrap.appendChild(detail);
    this.shell.body.appendChild(wrap);

    // 하단 액션
    const actions = [
      ...(it ? [{ id:'use', label:'사용/장착', variant:'accent' as const, onClick:()=> this.props.onUse?.(it) }] : []),
      ...(this.props.items[this.selected] ? [{ id:'drop', label:'버리기', variant:'danger' as const, onClick:()=> this.props.onDrop?.(this.selected) }] : []),
      { id:'close', label:'닫기' },
    ];
    this.ctx.render.setActions(this.shell, actions);
  }

  private filteredSortedIndices() {
    const idx: number[] = [];
    const catOK = (it: Item|null) => this.state.tab==='전체' || (it && it.cat===this.state.tab);
    const rarOK = (it: Item|null) => this.state.rar==='all' || (it && it.rarity===this.state.rar);
    const qOK   = (it: Item|null) => !this.state.q || (it && it.name.toLowerCase().includes(this.state.q));
    for (let i=0;i<this.props.items.length;i++) {
      const it = this.props.items[i];
      if (!it) { idx.push(i); continue; }
      if (!catOK(it) || !rarOK(it) || !qOK(it)) continue;
      idx.push(i);
    }
    const filled = idx.filter(i=> !!this.props.items[i]);
    const empty  = idx.filter(i=> !this.props.items[i]);
    filled.sort((a,b)=>{
      const A=this.props.items[a]!, B=this.props.items[b]!;
      if (this.state.sort==='name')   return A.name.localeCompare(B.name,'ko');
      if (this.state.sort==='weight') return (B.wt - A.wt);
      return (B.qty - A.qty);
    });
    return [...filled, ...empty];
  }
}
