// ============================================================================
// views/QuestDetailView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { css } from '../dlgstyle';
import type { Quest } from '../dlgstore';

const CSS_QDETAIL = css`
  .gnx-qdetail{display:grid;gap:10px}
  .gnx-cardgrid{grid-template-columns:repeat(2,1fr)}
`;

export class QuestDetailView implements IDialogView<{ quest: Quest; trackedId?: string }> {
  private shell?: any; private key?: string; private ctx!: ViewContext; private props!: { quest: Quest; trackedId?: string };
  mount(ctx: ViewContext, props: { quest: Quest; trackedId?: string }) {
    this.ctx = ctx; this.props = props;
    this.shell = ctx.render.openShell({ title: `퀘스트 상세 — ${props.quest.title}`, wide: true });
    this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_QDETAIL, 'view:qdetail');
    this.render();
    this.setActions();
  }
  update(next: { quest: Quest; trackedId?: string }) { this.props = next; this.render(); this.setActions(); }
  unmount() { if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key); }

  private render() {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    this.shell.body.innerHTML = '';
    const { quest: q, trackedId } = this.props;
    const pct = Math.round((q.done/q.total)*100);
    const wrap = doc.createElement('div'); wrap.className='gnx-qdetail gnx-text';
    wrap.innerHTML = `
      <div><b>지역</b>: ${q.region} · <b>상태</b>: ${q.status==='completed'?'완료':'진행중'}</div>
      <div><b>설명</b>: ${q.desc}</div>
      <div>
        <div style="display:flex; gap:8px; align-items:center; margin:6px 0 4px">
          <b>진행도</b> <span class="gnx-card__meta">${q.done}/${q.total}</span>
          ${q.id===trackedId ? '<span class="gnx-card__meta gnx-rar-rare">추적 중</span>' : ''}
        </div>
        <div class="gnx-bar" style="height:8px"><i style="width:${pct}%"></i></div>
      </div>
      <div style="display:grid; gap:6px">
        <b>목표</b>
        <div class="gnx-list">
          <div class="gnx-rowitem"><div class="gnx-row__icon">🔥</div><div>${q.title} 관련 목표</div><div class="gnx-card__meta">${q.done}/${q.total}</div></div>
        </div>
      </div>
      <div style="display:grid; gap:6px">
        <b>보상</b>
        <div class="gnx-cardgrid">
          <div class="gnx-card" data-rar="Common"><span class="gnx-card__title">영혼 250</span></div>
          <div class="gnx-card" data-rar="Rare"><span class="gnx-card__title">녹주석 파편</span></div>
        </div>
      </div>
    `;
    this.shell.body.appendChild(wrap);
  }

  private setActions() {
    const tracked = this.props.quest.id === this.props.trackedId;
    this.ctx.render.setActions(this.shell, [
      { id:'back',  label:'퀘스트 목록', onClick:()=> this.ctx.manager.open('quest-log', { quests:[this.props.quest], trackedId:this.props.trackedId }) },
      { id:'track', label: tracked ? '추적 해제' : '추적', variant:'accent', onClick:()=>{
        const next = tracked ? null : this.props.quest.id;
        this.ctx.manager.updateWhere('quest-detail', { quest: this.props.quest, trackedId: next });
        this.ctx.manager.updateWhere('quest-log', { quests: [this.props.quest], trackedId: next });
      }},
    ]);
  }
}
