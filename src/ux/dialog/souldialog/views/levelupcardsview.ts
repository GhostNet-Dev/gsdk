// ============================================================================
// views/LevelupCardsView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';

const CSS_CARDS = css`
  .gnx-cardgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
`;

type Card = { id: string; title: string; desc?: string; rarity?: 'Common'|'Rare'|'Epic' };

export class LevelupCardsView implements IDialogView<{ title?: string; cards: Card[]; onPick:(id:string)=>void }> {
  private shell?: any; private key?: string;
  mount(ctx: ViewContext, props: { title?: string; cards: Card[]; onPick:(id:string)=>void }) {
    const title = props.title ?? '레벨 업 — 강화 선택';
    this.shell = ctx.render.openShell({ title });
    const host = this.shell.sr;
    this.key = ctx.render.ensureScopedCSS(host, CSS_CARDS, 'view:cards');

    const grid = createEl(this.shell.sr, 'div');
    grid.className = 'gnx-cardgrid';
    props.cards.forEach(c=>{
      const btn = createEl(this.shell.sr, 'button');
      btn.type='button'; btn.className='gnx-card'; if (c.rarity) (btn as any).dataset.rar=c.rarity;
      btn.innerHTML = `<span class="gnx-card__title">${c.title}</span>${c.rarity?`<span class="gnx-card__meta">${c.rarity}</span>`:''}${c.desc?`<span class="gnx-text">${c.desc}</span>`:''}`;
      btn.addEventListener('click', ()=>{ props.onPick(c.id); ctx.manager.close(); });
      grid.appendChild(btn);
    });
    this.shell.body.appendChild(grid);
    ctx.render.setActions(this.shell, [{ id:'skip', label:'건너뛰기' }]);
  }
  unmount() {}
}
