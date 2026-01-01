// ============================================================================
// views/questdetailview.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import type { UIQuest } from '../dlgstore';
import { IItem } from '@Glibs/interface/iinven';
import { TooltipComponent } from '../core/tooltip';

const CSS_QDETAIL = css`
  :host { color: var(--gnx-ui-fg); }
  .gnx-qdetail{ display:grid; gap:14px; }
  
  /* 목표 리스트 */
  .gnx-obj-list { display: flex; flex-direction: column; gap: 4px; }
  .gnx-obj-item { 
    display: flex; justify-content: space-between; align-items: center; 
    padding: 8px 10px; 
    background: rgba(255,255,255,0.03); 
    border-radius: 8px; 
    border: 1px solid rgba(255,255,255,0.05);
  }
  .gnx-obj-item.done { color: var(--gnx-ui-sub); text-decoration: line-through; opacity: 0.7; }

  /* 보상 리스트 */
  .gnx-reward-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .gnx-reward-tag {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    transition: 0.2s;
  }
  
  .gnx-reward-tag.item-reward { cursor: pointer; padding-left: 6px; }
  .gnx-reward-tag.item-reward:hover { 
    background: rgba(255,255,255,0.1); 
    border-color: var(--gnx-ui-accent);
    box-shadow: 0 0 8px rgba(216,182,107,0.2);
  }

  .gnx-reward-icon { 
    width: 24px; height: 24px; 
    display: flex; justify-content: center; align-items: center;
    font-size: 16px; 
  }
  .gnx-reward-icon img { max-width: 100%; max-height: 100%; }
  
  /* 상태 배지 */
  .gnx-status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.1); }
  .gnx-status-active { color: #fff; border: 1px solid rgba(255,255,255,0.2); }
  .gnx-status-completable { color: var(--gnx-ui-accent); border: 1px solid var(--gnx-ui-accent); background: rgba(216,182,107,0.1); }
  .gnx-status-completed { color: #88ff88; border: 1px solid #88ff88; background: rgba(136,255,136,0.1); }
`;

type Props = { 
    quest: UIQuest; 
    trackedId?: string;
    getItem?: (itemId: string) => IItem | undefined;
};

export class QuestDetailView implements IDialogView<Props> {
    private shell?: any; 
    private key?: string; 
    private ctx!: ViewContext; 
    private props!: Props;

    // [리팩토링] TooltipComponent 사용
    private tip!: TooltipComponent;

    mount(ctx: ViewContext, props: Props) {
        this.ctx = ctx; 
        this.props = props;
        this.shell = ctx.shell;
        this.tip = new TooltipComponent(this.shell.sr); // 초기화

        ctx.render.setTitle(this.shell, '퀘스트 상세');
        ctx.render.setWide(this.shell, true);
        this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_QDETAIL, 'view:qdetail');
        
        this.render();
        this.setActions();

        // 전역 클릭 (툴팁 닫기용)
        document.addEventListener('pointerdown', this.onGlobalDown, true);
    }

    update(next: Props) { 
        this.props = next; 
        this.render(); 
        this.setActions(); 
    }

    unmount() { 
        if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key); 
        this.tip.destroy();
        document.removeEventListener('pointerdown', this.onGlobalDown, true);
    }

    private onGlobalDown = (e: Event) => {
        if (!this.tip.pinned) return;
        if (this.tip.tip && this.tip.tip.contains(e.target as Node)) return;
        this.tip.hide();
    };

    private render() {
        const doc = this.shell.sr;
        this.shell.body.innerHTML = '';
        const { quest: q, trackedId } = this.props;
        const wrap = createEl(doc, 'div'); wrap.className = 'gnx-qdetail gnx-text';

        // 1. 상태 텍스트
        let statusText = '진행중', statusClass = 'gnx-status-active';
        if (q.status === 'COMPLETABLE') { statusText = '보상 수령 가능'; statusClass = 'gnx-status-completable'; }
        else if (q.status === 'COMPLETED') { statusText = '완료됨'; statusClass = 'gnx-status-completed'; }

        // 2. 목표 HTML
        let objectivesHtml = '';
        if (q.objectives?.length) {
            q.objectives.forEach(obj => {
                const key = `${obj.type}_${obj.targetId}`;
                const current = q.status === 'COMPLETED' ? (obj.amount??1) : (q.progress[key]||0);
                const max = obj.amount ?? 1;
                const isDone = current >= max;
                objectivesHtml += `
                    <div class="gnx-obj-item ${isDone ? 'done' : ''}">
                        <span>${obj.targetId} (${obj.type})</span>
                        <span class="gnx-card__meta">${current} / ${max}</span>
                    </div>`;
            });
        } else {
            objectivesHtml = `<div class="gnx-text" style="opacity:0.5; padding:4px;">목표 정보 없음</div>`;
        }

        // 3. 보상 리스트 생성
        const rewardList = createEl(doc, 'div'); rewardList.className = 'gnx-reward-list';
        
        if (q.rewards) {
            if (q.rewards.experience) rewardList.appendChild(this.createRewardTag('✨', `경험치 +${q.rewards.experience}`));
            if (q.rewards.gold) {
                const tag = this.createRewardTag('💰', `${q.rewards.gold} G`);
                (tag.querySelector('.gnx-reward-icon') as HTMLElement).style.color = 'var(--gnx-ui-coin)';
                rewardList.appendChild(tag);
            }
            if (q.rewards.items) {
                q.rewards.items.forEach(rw => {
                    const itemData = this.props.getItem ? this.props.getItem(rw.itemId) : undefined;
                    
                    if (itemData) {
                        // [리팩토링] 아이템 보상 태그 + 툴팁 연결
                        const iconHtml = renderIcon(itemData.IconPath);
                        const tag = createEl(doc, 'div');
                        tag.className = 'gnx-reward-tag item-reward';
                        tag.innerHTML = `<span class="gnx-reward-icon">${iconHtml}</span> ${itemData.Name} x${rw.amount}`;
                        
                        // Hover: 툴팁 표시
                        tag.onmouseenter = (e) => {
                            if (!this.tip.pinned) {
                                this.tip.renderItem(itemData, rw.amount);
                                this.tip.move(e);
                            }
                        };
                        tag.onmousemove = (e) => { if (!this.tip.pinned) this.tip.move(e); };
                        tag.onmouseleave = () => { if (!this.tip.pinned) this.tip.hide(); };
                        
                        // Click: 툴팁 고정
                        tag.onclick = (e) => {
                            e.stopPropagation();
                            // 간단한 닫기 버튼만 제공
                            const actions = `<div class="tt-actions"><button class="tt-btn" data-action="close">닫기</button></div>`;
                            this.tip.renderItem(itemData, rw.amount, { pin: true, actions });
                            this.tip.move(e);
                            
                            // 버튼 리스너 바인딩
                            const btn = this.tip.tip?.querySelector('[data-action="close"]');
                            if(btn) (btn as HTMLElement).onclick = () => this.tip.hide();
                        };
                        
                        rewardList.appendChild(tag);
                    } else {
                        // 데이터 없음
                        rewardList.appendChild(this.createRewardTag('🎁', `${rw.itemId} x${rw.amount}`));
                    }
                });
            }
        }
        
        if (!rewardList.hasChildNodes()) rewardList.innerHTML = '<span class="gnx-text" style="opacity:0.5">보상 없음</span>';

        // 4. 최종 조립
        wrap.innerHTML = `
            <div>
                <span class="gnx-status-badge ${statusClass}">${statusText}</span>
                ${q.id === trackedId ? '<span class="gnx-card__meta gnx-rar-rare" style="margin-left:8px">🚩 추적 중</span>' : ''}
            </div>
            <div style="font-size: 16px; font-weight: 700; margin-top: 4px;">${q.title}</div>
            <div class="gnx-text" style="line-height: 1.6;">${q.description}</div>
            
            <div style="margin-top: 12px;">
                <b style="display:block; margin-bottom:8px;">목표</b>
                <div class="gnx-obj-list">${objectivesHtml}</div>
            </div>

            <div style="margin-top: 12px;">
                <b style="display:block; margin-bottom:8px;">보상</b>
                <div class="js-reward-container"></div> 
            </div>
        `;
        
        const container = wrap.querySelector('.js-reward-container');
        if (container) container.appendChild(rewardList);
        
        this.shell.body.appendChild(wrap);
    }

    private createRewardTag(icon: string, text: string) {
        const div = createEl(this.shell.sr, 'div');
        div.className = 'gnx-reward-tag';
        div.innerHTML = `<span class="gnx-reward-icon">${icon}</span> ${text}`;
        return div;
    }

    private setActions() {
        const { quest, trackedId } = this.props;
        const isCompletable = quest.status === 'COMPLETABLE';
        const isCompleted = quest.status === 'COMPLETED';
        const tracked = quest.id === trackedId;

        const actions: any[] = [
            { id: 'back', label: '목록으로', onClick: () => this.ctx.manager.open('quest-log', { quests: [quest], trackedId }) }
        ];

        if (isCompletable) {
            actions.push({ id: 'complete', label: '보상 받기', variant: 'accent', onClick: () => { console.log('Complete Req'); this.ctx.manager.close(); } });
        } else if (!isCompleted) {
            actions.push({ id: 'track', label: tracked ? '추적 해제' : '추적', variant: tracked?'default':'accent', onClick: () => {
                const next = tracked ? null : quest.id;
                this.ctx.manager.updateWhere('quest-detail', { ...this.props, trackedId: next });
                this.ctx.manager.updateWhere('quest-log', { quests: [quest], trackedId: next });
            }});
        }
        this.ctx.render.setActions(this.shell, actions);
    }
}