// ============================================================================
// views/ShopView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';

type ShopItem = { id:string; icon:string; title:string; price:number };

export class ShopView implements IDialogView<{ items: ShopItem[]; onBuy:(id:string)=>void }> {
  private shell?: any;
  mount(ctx: ViewContext, props: { items: ShopItem[]; onBuy:(id:string)=>void }) {
    this.shell = ctx.render.openShell({ title:'상점 — 방랑 상인' });
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    const list = doc.createElement('div'); list.className='gnx-list';
    props.items.forEach(it=>{
      const row = doc.createElement('div'); row.className='gnx-rowitem';
      row.innerHTML = `<div class="gnx-row__icon">${it.icon}</div><div>${it.title}</div><div class="gnx-card__meta">${it.price}</div>`;
      const b=doc.createElement('button'); b.className='gnx-btn gnx-btn--accent'; b.textContent='구매';
      b.onclick=()=>{ props.onBuy(it.id); ctx.manager.close(); };
      row.appendChild(b); list.appendChild(row);
    });
    this.shell.body.appendChild(list);
    ctx.render.setActions(this.shell, [{ id:'close', label:'닫기' }]);
  }
  unmount() {}
}
