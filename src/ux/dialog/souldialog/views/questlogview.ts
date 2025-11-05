// ============================================================================
// views/QuestLogView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { css } from '../dlgstyle';
import type { Quest } from '../dlgstore';

const CSS_QUEST = css`
  .gnx-rowitem .gnx-bar{height:6px;margin-top:6px}
`;

export class QuestLogView implements IDialogView<{ quests: Quest[]; trackedId?: string }> {
  private shell?: any; private key?: string; private ctx!: ViewContext; private props!: { quests: Quest[]; trackedId?: string };

  mount(ctx: ViewContext, props: { quests: Quest[]; trackedId?: string }) {
    this.ctx = ctx; this.props = props;
    this.shell = ctx.render.openShell({ title:'퀘스트 로그' });
    const host = this.shell.sr;
    this.key = ctx.render.ensureScopedCSS(host, CSS_QUEST, 'view:quest');

    this.renderList();
    ctx.render.setActions(this.shell, [{ id:'close', label:'닫기' }]);
  }

  update(next: { quests: Quest[]; trackedId?: string }) {
    this.props = next;
    this.renderList();
  }

  unmount() {
    if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key);
  }

  private renderList() {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    this.shell.body.innerHTML = '';
    const list = doc.createElement('div'); list.className='gnx-list';

    const active = this.props.quests.filter(q=>q.status==='active');
    const done   = this.props.quests.filter(q=>q.status==='completed');

    if (active.length) {
      const h = doc.createElement('div'); h.className='gnx-text'; h.innerHTML='<b>진행중</b>'; list.appendChild(h);
      active.forEach(q => list.appendChild(this.row(q)));
    }
    if (done.length) {
      const h = doc.createElement('div'); h.className='gnx-text'; h.style.marginTop='6px'; h.innerHTML='<b>완료</b>'; list.appendChild(h);
      done.forEach(q => list.appendChild(this.row(q)));
    }
    this.shell.body.appendChild(list);
  }

  private pct(q: Quest) { return Math.max(0, Math.min(100, Math.round((q.done/q.total)*100))); }
  private tracked(q: Quest) { return q.id === this.props.trackedId; }

  private row(q: Quest) {
    const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
    const row = doc.createElement('div'); row.className='gnx-rowitem';
    const tracked = this.tracked(q);
    row.innerHTML = `
      <div class="gnx-row__icon">📜</div>
      <div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
          <b>${q.title}</b>
          <span class="gnx-card__meta">${q.status==='completed'?'완료':'진행중'}</span>
          <span class="gnx-card__meta">${q.region}</span>
          <span class="gnx-card__meta">${q.done}/${q.total}</span>
          ${tracked?'<span class="gnx-card__meta gnx-rar-rare">추적 중</span>':''}
        </div>
        <div class="gnx-bar"><i style="width:${this.pct(q)}%"></i></div>
        <div class="gnx-text" style="margin-top:6px">${q.desc}</div>
      </div>
      <div style="display:grid; gap:6px">
        <button class="gnx-btn" data-q="detail">자세히</button>
        <button class="gnx-btn ${tracked?'gnx-btn--accent':''}" data-q="track">${tracked?'추적 해제':'추적'}</button>
      </div>`;
    const btnD = row.querySelector('[data-q="detail"]') as HTMLButtonElement;
    const btnT = row.querySelector('[data-q="track"]') as HTMLButtonElement;
    btnD.onclick = ()=> this.ctx.manager.open('quest-detail', { quest: q, trackedId: this.props.trackedId }, { wide:true });
    btnT.onclick = ()=> {
      const next = tracked ? null : q.id;
      // 여기선 외부 store가 있다고 가정하지 않고, 상위에서 updateWhere로 반영하는 패턴 사용 권장
      this.ctx.manager.updateWhere('quest-log', { quests: this.props.quests, trackedId: next });
      this.ctx.manager.updateWhere('quest-detail', { quest: q, trackedId: next });
    };
    return row;
  }
}
