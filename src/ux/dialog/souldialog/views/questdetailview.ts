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

  /* 보상 섹션 */
  .gnx-reward-section { margin-top: 8px; }
  .gnx-reward-header { 
    font-size: 12px; font-weight: 700; color: var(--gnx-ui-sub); 
    margin-bottom: 6px; text-transform: uppercase; 
  }
  .gnx-reward-header.choice { color: var(--gnx-ui-accent); }

  .gnx-reward-list { display: flex; flex-wrap: wrap; gap: 8px; }

  /* 보상 태그 */
  .gnx-reward-tag {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    font-size: 13px; font-weight: 600;
  }
  
  .gnx-reward-tag.item-reward { cursor: pointer; padding-left: 6px; }
  .gnx-reward-tag.item-reward:hover { 
    background: rgba(255,255,255,0.1); 
    border-color: var(--gnx-ui-fg);
  }

  /* 선택 보상 강조 스타일 */
  .gnx-reward-tag.choice-reward {
    border-color: var(--gnx-ui-accent-weak);
    background: color-mix(in oklab, var(--gnx-ui-accent) 10%, rgba(255,255,255,0.05));
  }

  .gnx-reward-icon { 
    width: 24px; height: 24px; 
    display: flex; justify-content: center; align-items: center;
    font-size: 16px; 
  }
  
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
    private tip!: TooltipComponent;

    mount(ctx: ViewContext, props: Props) {
        this.ctx = ctx; 
        this.props = props;
        this.shell = ctx.shell;
        this.tip = new TooltipComponent(this.shell.sr);

        ctx.render.setTitle(this.shell, '퀘스트 상세');
        ctx.render.setWide(this.shell, true);
        this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_QDETAIL, 'view:qdetail');
        
        this.render();
        this.setActions();

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
        
        const wrap = createEl(doc, 'div'); 
        wrap.className = 'gnx-qdetail gnx-text';

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

        // 3. UI 조립
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
                <b style="display:block; margin-bottom:4px;">보상</b>
                <div class="js-reward-container"></div> 
            </div>
        `;
        
        // 4. 보상 렌더링 (고정 + 선택)
        const rewardContainer = wrap.querySelector('.js-reward-container');
        if (rewardContainer) {
            // A. 고정 보상
            const fixedRewards = q.rewards || {};
            const hasFixed = fixedRewards.experience || fixedRewards.gold || (fixedRewards.items && fixedRewards.items.length > 0);
            
            if (hasFixed) {
                const fixedDiv = this.renderRewardGroup(doc, fixedRewards, '확정 보상', false);
                rewardContainer.appendChild(fixedDiv);
            }

            // B. 선택 보상
            const selective = q.selectiveRewards;
            const hasSelective = selective && (selective.experience || selective.gold || (selective.items && selective.items.length > 0));

            if (hasSelective) {
                const selDiv = this.renderRewardGroup(doc, selective!, '선택 보상 (택 1)', true);
                rewardContainer.appendChild(selDiv);
            }

            if (!hasFixed && !hasSelective) {
                rewardContainer.innerHTML = '<span class="gnx-text" style="opacity:0.5; font-size:13px;">보상 없음</span>';
            }
        }
        
        this.shell.body.appendChild(wrap);
    }

    // 보상 그룹(고정/선택) 렌더링 헬퍼
    private renderRewardGroup(doc: Document | ShadowRoot, rewards: any, label: string, isChoice: boolean) {
        const wrapper = createEl(doc, 'div');
        wrapper.className = 'gnx-reward-section';

        const header = createEl(doc, 'div');
        header.className = `gnx-reward-header ${isChoice ? 'choice' : ''}`;
        header.textContent = label;
        wrapper.appendChild(header);

        const list = createEl(doc, 'div');
        list.className = 'gnx-reward-list';

        // XP
        if (rewards.experience) {
            list.appendChild(this.createRewardTag('✨', `XP +${rewards.experience}`, isChoice));
        }
        // Gold
        if (rewards.gold) {
            const tag = this.createRewardTag('💰', `${rewards.gold} G`, isChoice);
            (tag.querySelector('.gnx-reward-icon') as HTMLElement).style.color = 'var(--gnx-ui-coin)';
            list.appendChild(tag);
        }
        // Items
        if (rewards.items) {
            rewards.items.forEach((rw: any) => {
                const itemData = this.props.getItem ? this.props.getItem(rw.itemId) : undefined;
                if (itemData) {
                    const tag = this.createItemTag(doc, itemData, rw.amount, isChoice);
                    list.appendChild(tag);
                } else {
                    // 아이템 데이터 없을 경우 Fallback
                    list.appendChild(this.createRewardTag('🎁', `${rw.itemId} x${rw.amount}`, isChoice));
                }
            });
        }
        // Skills (옵션: 필요하다면 추가)
        if (rewards.skills) {
             rewards.skills.forEach((sk: any) => {
                list.appendChild(this.createRewardTag('⚡', `스킬: ${sk.skillId}`, isChoice));
             });
        }

        wrapper.appendChild(list);
        return wrapper;
    }

    private createRewardTag(icon: string, text: string, isChoice: boolean) {
        const div = createEl(this.shell.sr, 'div');
        div.className = `gnx-reward-tag ${isChoice ? 'choice-reward' : ''}`;
        div.innerHTML = `<span class="gnx-reward-icon">${icon}</span> ${text}`;
        return div;
    }

    private createItemTag(doc: Document | ShadowRoot, item: IItem, count: number, isChoice: boolean) {
        const tag = createEl(doc, 'div');
        tag.className = `gnx-reward-tag item-reward ${isChoice ? 'choice-reward' : ''}`;
        
        const iconHtml = renderIcon(item.IconPath);
        tag.innerHTML = `<span class="gnx-reward-icon">${iconHtml}</span> ${item.Name} x${count}`;

        // 툴팁 이벤트
        tag.onmouseenter = (e) => {
            if (!this.tip.pinned) {
                this.tip.renderItem(item, count);
                this.tip.move(e);
            }
        };
        tag.onmousemove = (e) => { if (!this.tip.pinned) this.tip.move(e); };
        tag.onmouseleave = () => { if (!this.tip.pinned) this.tip.hide(); };
        
        tag.onclick = (e) => {
            e.stopPropagation();
            const actions = `<div class="tt-actions"><button class="tt-btn" data-action="close">닫기</button></div>`;
            this.tip.renderItem(item, count, { pin: true, actions });
            this.tip.move(e);
            const btn = this.tip.tip?.querySelector('[data-action="close"]');
            if(btn) (btn as HTMLElement).onclick = () => this.tip.hide();
        };

        return tag;
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
            // [중요] 완료는 QuestCompleteView를 통해 처리되도록 유도 (여기서는 상세만 봄)
            // 혹은 바로 완료 API를 호출할 수도 있지만, 선택 보상이 있다면 CompleteView를 여는 것이 안전합니다.
            actions.push({ id: 'complete', label: '완료하기', variant: 'accent', onClick: () => { 
                console.log('Open QuestCompleteView requested');
                this.ctx.manager.close(); // 실제 로직은 외부에서 CompleteView 호출 필요
            }});
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