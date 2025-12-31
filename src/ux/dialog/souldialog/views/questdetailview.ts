// ============================================================================
// views/QuestDetailView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import type { UIQuest } from '../dlgstore';
import { IItem } from '@Glibs/interface/iinven';

// 스탯 라벨 매핑 (툴팁용)
const STAT_LABELS: Record<string, string> = {
    attack: '공격력', defense: '방어력', hp: '생명력', mp: '마나',
    speed: '이동 속도', criticalRate: '치명타 확률', criticalDamage: '치명타 피해', weight: '무게'
};

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
    display: flex; align-items: center; gap: 8px; /* 간격 넓힘 */
    padding: 6px 10px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1); /* 테두리 추가 */
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    transition: 0.2s;
  }
  
  /* [추가] 인터랙티브 아이템 보상 스타일 */
  .gnx-reward-tag.item-reward { cursor: pointer; padding-left: 6px; }
  .gnx-reward-tag.item-reward:hover { 
    background: rgba(255,255,255,0.1); 
    border-color: var(--gnx-ui-accent);
    box-shadow: 0 0 8px rgba(216,182,107,0.2);
  }

  /* 아이콘 래퍼 */
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

  /* ===== 툴팁 스타일 (InventoryView와 동일) ===== */
  .gnx-tip {
    position: fixed; z-index: 2147483600;
    min-width: 240px; max-width: 320px;
    padding: 12px; border-radius: 12px;
    color: var(--gnx-ui-fg);
    background: linear-gradient(180deg, rgba(30,33,40,0.98), rgba(20,23,30,0.99));
    border: 1px solid rgba(255,255,255,.18);
    box-shadow: 0 8px 40px rgba(0,0,0,.65);
    backdrop-filter: blur(4px);
    pointer-events: none; transition: opacity .08s ease; opacity: 0;
  }
  .gnx-tip[data-show="true"]{ opacity: 1; }
  .gnx-tip[data-pinned="true"]{ pointer-events: auto; cursor: default; }
  
  .gnx-tip .tt-title { font-weight:700; font-size: 15px; margin-bottom:8px; display:flex; align-items:center; gap:8px; }
  .gnx-tip .tt-stats { margin: 10px 0; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; gap: 4px; }
  .tt-stat-row { font-size: 13px; color: #8ab4f8; display: flex; justify-content: space-between; }
  .tt-stat-row.enchant { color: #d87cff; }
  .gnx-tip .tt-desc { margin-top:8px; color: var(--gnx-ui-sub); line-height:1.5; font-size: 13px; font-style: italic; }
  
  .gnx-tip .tt-actions { margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,.1); text-align:right; }
  .gnx-tip .tt-btn { background:none; border:1px solid rgba(255,255,255,.3); color:#fff; border-radius:6px; padding:4px 8px; cursor:pointer; font-size:12px; }

  .gnx-rar-common{ color:var(--gnx-rar-common); }
  .gnx-rar-rare{   color:var(--gnx-rar-rare); }
  .gnx-rar-epic{   color:var(--gnx-rar-epic); }
`;

// [추가] getItem을 Props로 받습니다.
type Props = { 
    quest: UIQuest; 
    trackedId?: string;
    getItem?: (itemId: string) => IItem | undefined; // 아이템 조회 함수
};

export class QuestDetailView implements IDialogView<Props> {
    private shell?: any; 
    private key?: string; 
    private ctx!: ViewContext; 
    private props!: Props;

    // 툴팁 관련 상태
    private tip?: HTMLDivElement;
    private tipPinned = false;
    private tipTargetId: string | null = null;

    mount(ctx: ViewContext, props: Props) {
        this.ctx = ctx; 
        this.props = props;
        this.shell = ctx.shell;

        ctx.render.setTitle(this.shell, '퀘스트 상세');
        ctx.render.setWide(this.shell, true);
        this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_QDETAIL, 'view:qdetail');
        
        // 전역 클릭 (툴팁 닫기용)
        document.addEventListener('pointerdown', this.onGlobalDown, true);

        this.render();
        this.setActions();
    }

    update(next: Props) { 
        this.props = next; 
        this.render(); 
        this.setActions(); 
    }

    unmount() { 
        if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key); 
        document.removeEventListener('pointerdown', this.onGlobalDown, true);
        this.destroyTip();
    }

    private render() {
        const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
        this.shell.body.innerHTML = '';
        const { quest: q, trackedId } = this.props;
        const wrap = createEl(doc, 'div'); wrap.className = 'gnx-qdetail gnx-text';

        // 1. 상태 텍스트
        let statusText = '진행중', statusClass = 'gnx-status-active';
        if (q.status === 'COMPLETABLE') { statusText = '보상 수령 가능'; statusClass = 'gnx-status-completable'; }
        else if (q.status === 'COMPLETED') { statusText = '완료됨'; statusClass = 'gnx-status-completed'; }

        // 2. 목표 HTML 생성
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

        // 3. 보상 리스트 Element 생성 (rewardList)
        const rewardList = createEl(doc, 'div'); rewardList.className = 'gnx-reward-list';
        
        if (q.rewards) {
            // 경험치
            if (q.rewards.experience) {
                rewardList.appendChild(this.createRewardTag('✨', `경험치 +${q.rewards.experience}`));
            }
            // 골드
            if (q.rewards.gold) {
                const tag = this.createRewardTag('💰', `${q.rewards.gold} G`);
                (tag.querySelector('.gnx-reward-icon') as HTMLElement).style.color = 'var(--gnx-ui-coin)';
                rewardList.appendChild(tag);
            }
            // 아이템
            if (q.rewards.items) {
                q.rewards.items.forEach(rw => {
                    // [디버깅] 아이템 조회 로그
                    const itemData = this.props.getItem ? this.props.getItem(rw.itemId) : undefined;
                    console.log(`[QuestView] Item Lookup: ${rw.itemId} =>`, itemData); // 이 로그를 확인해보세요!

                    if (itemData) {
                        // 성공: 아이템 데이터가 있을 때 (아이콘 + 툴팁 적용)
                        const iconHtml = renderIcon(itemData.IconPath);
                        const tag = createEl(doc, 'div');
                        tag.className = 'gnx-reward-tag item-reward';
                        tag.innerHTML = `<span class="gnx-reward-icon">${iconHtml}</span> ${itemData.Name} x${rw.amount}`;
                        
                        // 이벤트 리스너 연결
                        tag.addEventListener('mouseenter', (e) => { 
                            if (!this.tipPinned) { this.showTip(itemData, rw.amount); this.placeTip(e as MouseEvent); }
                        });
                        tag.addEventListener('mousemove', (e) => { 
                            if (!this.tipPinned) this.placeTip(e as MouseEvent); 
                        });
                        tag.addEventListener('mouseleave', () => { 
                            if (!this.tipPinned) this.hideTip(); 
                        });
                        tag.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.tipPinned = true;
                            this.showTip(itemData, rw.amount, true);
                            this.placeTip(e as MouseEvent);
                        });
                        rewardList.appendChild(tag);
                    } else {
                        // 실패: 데이터가 없을 때 (기본 텍스트 + 선물상자 아이콘)
                        rewardList.appendChild(this.createRewardTag('🎁', `${rw.itemId} x${rw.amount}`));
                    }
                });
            }
        }
        
        if (!rewardList.hasChildNodes()) {
            rewardList.innerHTML = '<span class="gnx-text" style="opacity:0.5">보상 없음</span>';
        }

        // 4. 최종 DOM 조립 (순서 명확화)
        // 보상 컨테이너(.js-reward-container)를 명시적으로 만듭니다.
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
                <div class="js-reward-container"></div> </div>
        `;
        
        // 만들어둔 rewardList를 정확한 위치에 삽입
        const container = wrap.querySelector('.js-reward-container');
        if (container) {
            container.appendChild(rewardList);
        }
        
        this.shell.body.appendChild(wrap);
    }

    private createRewardTag(icon: string, text: string) {
        const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
        const div = createEl(doc, 'div');
        div.className = 'gnx-reward-tag';
        div.innerHTML = `<span class="gnx-reward-icon">${icon}</span> ${text}`;
        return div;
    }

    private setActions() {
        // (기존과 동일)
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

    /* -------------------------------------------------------------------------- */
    /* Tooltip Logic (InventoryView 이식)                                         */
    /* -------------------------------------------------------------------------- */
    
    private onGlobalDown = (e: Event) => {
        if (!this.tip || !this.tipPinned) return;
        if (this.tip.contains(e.target as Node)) return; // 툴팁 내부 클릭은 무시
        this.tipPinned = false;
        this.hideTip();
    }

    private ensureTip() {
        if (this.tip) return;
        const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
        this.tip = createEl(doc, 'div') as HTMLDivElement;
        this.tip.className = 'gnx-tip';
        this.shell.sr.appendChild(this.tip);
    }

    private destroyTip() {
        if (this.tip) this.tip.remove();
        this.tip = undefined;
    }

    private showTip(item: IItem, count: number, pinned = false) {
        this.ensureTip();
        if (!this.tip) return;

        this.tip.setAttribute('data-pinned', String(pinned));
        this.tipTargetId = (item as any).Id ?? item.Name;

        const rarity = (item as any).Level ?? 'Common';
        const rarClass = rarity === 'Epic' ? 'gnx-rar-epic' : (rarity === 'Rare' ? 'gnx-rar-rare' : 'gnx-rar-common');
        
        let statsHtml = '';
        if (item.Stats) {
            statsHtml += '<div class="tt-stats">';
            for (const [k, v] of Object.entries(item.Stats)) {
                if (typeof v === 'number' && v !== 0) {
                    statsHtml += `<div class="tt-stat-row"><span>${STAT_LABELS[k]||k}</span><span>${v>0?'+'+v:v}</span></div>`;
                }
            }
            statsHtml += '</div>';
        }

        const actionsHtml = pinned ? `
            <div class="tt-actions">
                <button class="tt-btn">닫기</button>
            </div>` : '';

        this.tip.innerHTML = `
            <div class="tt-title">
                <div style="width:24px;height:24px;">${renderIcon(item.IconPath)}</div>
                <span class="${rarClass}">${item.Name}</span>
            </div>
            <div style="font-size:12px; opacity:0.8;">수량: ${count}개</div>
            ${statsHtml}
            <div class="tt-desc">${item.Description || '설명 없음'}</div>
            ${actionsHtml}
        `;

        if (pinned) {
            const btn = this.tip.querySelector('.tt-btn');
            if (btn) btn.addEventListener('click', () => { this.tipPinned = false; this.hideTip(); });
        }

        this.tip.setAttribute('data-show', 'true');
    }

    private hideTip() {
        if (this.tip) this.tip.setAttribute('data-show', 'false');
    }

    private placeTip(e: MouseEvent) {
        if (!this.tip) return;
        
        // 툴팁 크기와 화면 크기 가져오기
        const rect = this.tip.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        const padding = 12;    // 화면 끝에서의 여백
        const cursorGap = 16;  // 마우스 커서와의 거리

        // 1. 기본 위치: 마우스 오른쪽 하단
        let x = e.clientX + cursorGap;
        let y = e.clientY + cursorGap;

        // 2. 가로(X축) 보정
        // 오른쪽 화면 밖으로 나가는 경우 -> 마우스 왼쪽으로 이동
        if (x + rect.width + padding > vw) {
            x = e.clientX - rect.width - cursorGap;
        }
        // 왼쪽 화면 밖으로 나가는 경우 (너무 왼쪽에서 툴팁이 떴을 때) -> 강제로 왼쪽 여백에 맞춤
        if (x < padding) {
            x = padding;
        }

        // 3. 세로(Y축) 보정
        // 아래쪽 화면 밖으로 나가는 경우 -> 마우스 위쪽으로 이동
        if (y + rect.height + padding > vh) {
            y = e.clientY - rect.height - cursorGap;
        }
        // 위쪽 화면 밖으로 나가는 경우 -> 강제로 위쪽 여백에 맞춤
        if (y < padding) {
            y = padding;
        }

        // 4. 위치 적용
        this.tip.style.left = `${x}px`;
        this.tip.style.top = `${y}px`;
    }
}