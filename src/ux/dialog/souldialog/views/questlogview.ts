// ============================================================================
// views/questlogview.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';
import type { UIQuest } from '../dlgstore';
import { IItem } from '@Glibs/interface/iinven'; // IItem 타입 임포트 필요

const CSS_QUEST = css`
  :host { color: var(--gnx-ui-fg); }
  /* (기존 CSS 유지...) */
  .gnx-rowitem { align-items: start; transition: background 0.2s; }
  .gnx-rowitem:hover { background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)); }
  .gnx-quest-title { font-weight: 700; font-size: 15px; margin-right: 8px; }
  .gnx-text-desc { color: var(--gnx-ui-sub); font-size: 13px; margin-top: 6px; line-height: 1.4; }
  .gnx-status-completable { color: var(--gnx-ui-accent); border: 1px solid var(--gnx-ui-accent-weak); background: rgba(216,182,107,0.1); }
  .gnx-status-tracking { color: #8ab4f8; border: 1px solid rgba(138,180,248,0.3); background: rgba(138,180,248,0.1); }
  .gnx-section-header { font-size: 14px; font-weight: 700; color: var(--gnx-ui-sub); margin: 12px 0 4px; }
`;

// [수정 1] Props에 getItem 함수 추가
type Props = { 
    quests: UIQuest[]; 
    trackedId?: string;
    getItem?: (id: string) => IItem | undefined; 
};

export class QuestLogView implements IDialogView<Props> {
    private shell?: any; 
    private key?: string; 
    private ctx!: ViewContext; 
    private props!: Props;

    mount(ctx: ViewContext, props: Props) {
        this.ctx = ctx; 
        this.props = props;
        this.shell = ctx.shell;
        
        ctx.render.setTitle(this.shell, '퀘스트 로그');
        const host = this.shell.sr;
        this.key = ctx.render.ensureScopedCSS(host, CSS_QUEST, 'view:quest');

        this.renderList();
        ctx.render.setActions(this.shell, [{ id: 'close', label: '닫기', onClick: () => this.ctx.manager.close() }]);
    }

    update(next: Props) {
        this.props = next;
        this.renderList();
    }

    unmount() {
        if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key);
    }

    private renderList() {
        const doc = this.shell.sr;
        this.shell.body.innerHTML = '';
        const list = createEl(doc, 'div'); list.className = 'gnx-list';

        const active = this.props.quests
            .filter(q => q.status === 'ACTIVE' || q.status === 'COMPLETABLE')
            .sort((a, b) => {
                if (a.status === 'COMPLETABLE' && b.status !== 'COMPLETABLE') return -1;
                if (a.status !== 'COMPLETABLE' && b.status === 'COMPLETABLE') return 1;
                return 0;
            });
            
        const done = this.props.quests.filter(q => q.status === 'COMPLETED');

        if (active.length > 0) {
            const h = createEl(doc, 'div'); h.className = 'gnx-section-header'; h.textContent = '진행 중';
            list.appendChild(h);
            active.forEach(q => list.appendChild(this.row(q)));
        }

        if (done.length > 0) {
            const h = createEl(doc, 'div'); h.className = 'gnx-section-header'; h.textContent = '완료';
            list.appendChild(h);
            done.forEach(q => list.appendChild(this.row(q)));
        }

        if (active.length === 0 && done.length === 0) {
            const empty = createEl(doc, 'div'); 
            empty.className = 'gnx-text'; 
            empty.style.textAlign = 'center';
            empty.style.padding = '40px 0';
            empty.style.opacity = '0.5';
            empty.textContent = '현재 보유한 퀘스트가 없습니다.';
            list.appendChild(empty);
        }

        this.shell.body.appendChild(list);
    }

    private pct(q: UIQuest): number {
        if (q.status === 'COMPLETED' || q.status === 'COMPLETABLE') return 100;
        if (!q.objectives || q.objectives.length === 0) return 0;

        let totalCurrent = 0, totalMax = 0;
        q.objectives.forEach(obj => {
            const key = `${obj.type}_${obj.targetId}`;
            const max = obj.amount ?? 1;
            const current = q.progress[key] || 0;
            totalMax += max;
            totalCurrent += Math.min(current, max);
        });

        if (totalMax === 0) return 0;
        return Math.round((totalCurrent / totalMax) * 100);
    }

    private row(q: UIQuest) {
        const doc = this.shell.sr;
        const row = createEl(doc, 'div'); row.className = 'gnx-rowitem';
        
        const isTracked = q.id === this.props.trackedId;
        const percent = this.pct(q);
        
        let statusBadge = '';
        let iconChar = '📜'; 
        
        if (q.status === 'COMPLETED') {
            statusBadge = '<span class="gnx-card__meta">완료</span>';
            iconChar = '✅';
        } else if (q.status === 'COMPLETABLE') {
            statusBadge = '<span class="gnx-card__meta gnx-status-completable">보상 수령 가능</span>';
            iconChar = '🎁';
        } else if (isTracked) {
            statusBadge = '<span class="gnx-card__meta gnx-status-tracking">추적 중</span>';
        }

        row.innerHTML = `
            <div class="gnx-row__icon">${iconChar}</div>
            
            <div style="min-width:0">
                <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
                    <span class="gnx-quest-title">${q.title}</span>
                    ${statusBadge}
                </div>
                
                <div class="gnx-bar"><i style="width:${percent}%"></i></div>
                <div class="gnx-text-desc">${q.description}</div>
            </div>

            <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="gnx-btn" data-q="detail">상세</button>
                ${q.status !== 'COMPLETED' ? 
                    `<button class="gnx-btn ${isTracked ? 'gnx-btn--accent' : ''}" data-q="track">
                        ${isTracked ? '해제' : '추적'}
                    </button>` : ''
                }
            </div>
        `;

        const btnDetail = row.querySelector('[data-q="detail"]') as HTMLButtonElement;
        const btnTrack = row.querySelector('[data-q="track"]') as HTMLButtonElement;

        if (btnDetail) {
            btnDetail.onclick = () => {
                // [수정 2] 상세 뷰를 열 때 getItem 함수를 전달합니다.
                this.ctx.manager.open('quest-detail', { 
                    quest: q, 
                    trackedId: this.props.trackedId,
                    getItem: this.props.getItem 
                }, { wide: true });
            };
        }

        if (btnTrack) {
            btnTrack.onclick = () => {
                const next = isTracked ? null : q.id;
                const nextProps = { ...this.props, trackedId: next };
                
                this.ctx.manager.updateWhere('quest-log', nextProps);
                this.ctx.manager.updateWhere('quest-detail', { quest: q, trackedId: next });
            };
        }

        return row;
    }
}