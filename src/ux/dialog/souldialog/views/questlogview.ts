// ============================================================================
// views/QuestLogView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';
// [변경] 통합된 UIQuest 타입 임포트
import type { UIQuest } from '../dlgstore';

const CSS_QUEST = css`
  :host { color: var(--gnx-ui-fg); }

  /* 리스트 스타일 */
  .gnx-list { color: var(--gnx-ui-fg); display: flex; flex-direction: column; gap: 8px; }
  
  /* 개별 퀘스트 행 스타일 */
  .gnx-rowitem { 
    display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start;
    padding: 12px;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
    transition: background 0.2s;
  }
  .gnx-rowitem:hover {
    background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
  }

  /* 아이콘 박스 */
  .gnx-row__icon {
    width: 40px; height: 40px; 
    background: rgba(255,255,255,0.06); border-radius: 8px;
    display: flex; justify-content: center; align-items: center;
    font-size: 20px;
  }

  /* 텍스트 및 배지 */
  .gnx-quest-title { font-weight: 700; font-size: 15px; margin-right: 8px; }
  .gnx-text-desc { color: var(--gnx-ui-sub); font-size: 13px; margin-top: 6px; line-height: 1.4; }
  
  .gnx-card__meta { 
    font-size: 11px; padding: 2px 6px; border-radius: 4px; background: rgba(255,255,255,0.1); vertical-align: middle;
  }
  
  /* 상태별 강조 색상 */
  .gnx-status-completable { color: var(--gnx-ui-accent); border: 1px solid var(--gnx-ui-accent-weak); background: rgba(216,182,107,0.1); }
  .gnx-status-tracking { color: #8ab4f8; border: 1px solid rgba(138,180,248,0.3); background: rgba(138,180,248,0.1); }

  /* 진행 바 */
  .gnx-bar { height: 6px; margin-top: 8px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
  .gnx-bar > i { display: block; height: 100%; background: var(--gnx-ui-accent); transition: width 0.3s ease; }
  
  /* 섹션 헤더 */
  .gnx-section-header { font-size: 14px; font-weight: 700; color: var(--gnx-ui-sub); margin: 12px 0 4px; }
`;

export class QuestLogView implements IDialogView<{ quests: UIQuest[]; trackedId?: string }> {
    private shell?: any; 
    private key?: string; 
    private ctx!: ViewContext; 
    private props!: { quests: UIQuest[]; trackedId?: string };

    mount(ctx: ViewContext, props: { quests: UIQuest[]; trackedId?: string }) {
        this.ctx = ctx; 
        this.props = props;
        this.shell = ctx.shell;
        
        ctx.render.setTitle(this.shell, '퀘스트 로그');
        const host = this.shell.sr;
        this.key = ctx.render.ensureScopedCSS(host, CSS_QUEST, 'view:quest');

        this.renderList();
        ctx.render.setActions(this.shell, [{ id: 'close', label: '닫기', onClick: () => this.ctx.manager.close() }]);
    }

    update(next: { quests: UIQuest[]; trackedId?: string }) {
        this.props = next;
        this.renderList();
    }

    unmount() {
        if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key);
    }

    private renderList() {
        const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
        this.shell.body.innerHTML = '';
        const list = createEl(doc, 'div'); list.className = 'gnx-list';

        // 1. 퀘스트 분류 (진행중+완료가능 / 완료됨)
        // COMPLETABLE은 ACTIVE 섹션 상단에 보여주는 것이 UX상 좋습니다.
        const active = this.props.quests
            .filter(q => q.status === 'ACTIVE' || q.status === 'COMPLETABLE')
            .sort((a, b) => {
                // 완료 가능(COMPLETABLE)을 최상단으로
                if (a.status === 'COMPLETABLE' && b.status !== 'COMPLETABLE') return -1;
                if (a.status !== 'COMPLETABLE' && b.status === 'COMPLETABLE') return 1;
                return 0;
            });
            
        const done = this.props.quests.filter(q => q.status === 'COMPLETED');

        // 2. 렌더링
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

    // [로직] 진행률(%) 계산
    private pct(q: UIQuest): number {
        // 완료된 퀘스트는 무조건 100%
        if (q.status === 'COMPLETED' || q.status === 'COMPLETABLE') return 100;
        
        if (!q.objectives || q.objectives.length === 0) return 0;

        let totalCurrent = 0;
        let totalMax = 0;

        q.objectives.forEach(obj => {
            const key = `${obj.type}_${obj.targetId}`;
            const max = obj.amount ?? 1;
            // 진행도 Map에서 현재 값 가져오기 (없으면 0)
            const current = q.progress[key] || 0;

            totalMax += max;
            totalCurrent += Math.min(current, max); // 초과 달성 방지
        });

        if (totalMax === 0) return 0;
        return Math.round((totalCurrent / totalMax) * 100);
    }

    private tracked(q: UIQuest) { return q.id === this.props.trackedId; }

    private row(q: UIQuest) {
        const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
        const row = createEl(doc, 'div'); row.className = 'gnx-rowitem';
        
        const isTracked = this.tracked(q);
        const percent = this.pct(q);
        
        // 상태 뱃지 및 아이콘 설정
        let statusBadge = '';
        let iconChar = '📜'; // 기본 아이콘
        
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

        // 이벤트 리스너 연결
        const btnDetail = row.querySelector('[data-q="detail"]') as HTMLButtonElement;
        const btnTrack = row.querySelector('[data-q="track"]') as HTMLButtonElement;

        if (btnDetail) {
            btnDetail.onclick = () => {
                this.ctx.manager.open('quest-detail', { quest: q, trackedId: this.props.trackedId }, { wide: true });
            };
        }

        if (btnTrack) {
            btnTrack.onclick = () => {
                const next = isTracked ? null : q.id;
                // 추적 상태 업데이트 (Store -> View 반영 흐름을 위해 updateWhere 사용)
                this.ctx.manager.updateWhere('quest-log', { quests: this.props.quests, trackedId: next });
                // 만약 상세 창이 뒤에 열려있다면 같이 업데이트
                this.ctx.manager.updateWhere('quest-detail', { quest: q, trackedId: next });
            };
        }

        return row;
    }
}