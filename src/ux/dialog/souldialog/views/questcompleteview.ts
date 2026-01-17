// ============================================================================
// views/questcompleteview.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import { UIQuest } from '../dlgstore'; // UIQuest가 User의 Quest 인터페이스를 확장한다고 가정
import { IItem } from '@Glibs/interface/iinven';
import { TooltipComponent } from '../core/tooltip';

export type QuestCompleteProps = {
    quest: UIQuest; 
    getItem: (itemId: string) => IItem | undefined;
    // 선택 보상이 있었다면 선택한 인덱스, 없었다면 null 반환
    onComplete: (selectedChoiceIndex: number | null) => void;
};

const CSS_QC = css`
    :host { color: var(--gnx-ui-fg); text-align: center; }
    .gnx-qc-body { display: flex; flex-direction: column; gap: 20px; align-items: center; padding: 10px 0; }
    
    .gnx-qc-icon { 
        font-size: 48px; margin-bottom: -10px; 
        animation: gnx-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }
    @keyframes gnx-pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .gnx-qc-title { font-size: 18px; font-weight: 700; color: var(--gnx-ui-accent); margin-bottom: 4px; }
    .gnx-qc-desc { color: var(--gnx-ui-sub); font-size: 14px; max-width: 80%; line-height: 1.5; margin: 0 auto; }

    .gnx-qc-section { width: 100%; display: flex; flex-direction: column; gap: 10px; }
    .gnx-qc-label { font-size: 13px; font-weight: 600; color: var(--gnx-ui-sub); text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }

    /* 기본 재화 보상 */
    .gnx-qc-basic { display: flex; justify-content: center; gap: 24px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; }
    .gnx-qc-val { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 15px; }

    /* 아이템 그리드 */
    .gnx-qc-grid { display: flex; justify-content: center; flex-wrap: wrap; gap: 12px; }
    
    .gnx-qc-slot {
        position: relative; width: 72px; height: 72px;
        background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 12px; cursor: pointer;
        display: flex; justify-content: center; align-items: center;
        transition: 0.2s;
    }
    .gnx-qc-slot:hover { border-color: var(--gnx-ui-fg); transform: translateY(-2px); }
    
    .gnx-qc-slot[data-selected="true"] {
        border-color: var(--gnx-ui-accent);
        background: color-mix(in oklab, var(--gnx-ui-accent) 15%, rgba(0,0,0,0.3));
        box-shadow: 0 0 0 2px var(--gnx-ui-accent);
        transform: scale(1.05);
    }
    
    .gnx-qc-qty {
        position: absolute; right: 4px; bottom: 4px;
        font-size: 11px; padding: 1px 5px; border-radius: 8px;
        background: rgba(0,0,0,0.6); color: #fff;
    }
`;

export class QuestCompleteView implements IDialogView<QuestCompleteProps> {
    private shell: any;
    private ctx!: ViewContext;
    private props!: QuestCompleteProps;
    private key?: string;
    private tip!: TooltipComponent;

    private selectedChoice: number | null = null; // selectiveRewards.items 내의 인덱스

    mount(ctx: ViewContext, props: QuestCompleteProps) {
        this.ctx = ctx;
        this.props = props;
        this.shell = ctx.shell;
        this.tip = new TooltipComponent(this.shell.sr);

        this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_QC, 'view:qc');
        ctx.render.setTitle(this.shell, '퀘스트 완료');

        this.render();
        document.addEventListener('pointerdown', this.onGlobalDown, true);
    }

    update(props: QuestCompleteProps) {
        this.props = props;
        this.render();
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
        const { quest } = this.props;
        
        // 1. 고정 보상 데이터
        const rewards = quest.rewards || {};
        // 2. 선택 보상 데이터 (없을 수도 있음)
        const selective = quest.selectiveRewards;

        const container = createEl(doc, 'div');
        container.className = 'gnx-qc-body';

        // --- 헤더 ---
        const header = createEl(doc, 'div');
        header.innerHTML = `
            <div class="gnx-qc-icon">🎉</div>
            <div class="gnx-qc-title">${quest.title}</div>
            <div class="gnx-qc-desc">퀘스트를 완료했습니다!</div>
        `;
        container.appendChild(header);

        // --- 기본 재화 (고정 보상의 경험치/골드 표시) ---
        if (rewards.experience || rewards.gold) {
            const basic = createEl(doc, 'div');
            basic.className = 'gnx-qc-basic';
            let html = '';
            if (rewards.experience) html += `<div class="gnx-qc-val" style="color:#d87cff"><span>✨</span> +${rewards.experience} XP</div>`;
            if (rewards.gold) html += `<div class="gnx-qc-val" style="color:var(--gnx-ui-coin)"><span>💰</span> +${rewards.gold} G</div>`;
            basic.innerHTML = html;
            container.appendChild(basic);
        }

        // --- 섹션 1: 고정 아이템 보상 ---
        if (rewards.items && rewards.items.length > 0) {
            const fixedItems = rewards.items.map(r => ({
                item: this.props.getItem(r.itemId),
                count: r.amount
            })).filter(r => r.item !== undefined) as { item: IItem, count: number }[];

            if (fixedItems.length > 0) {
                const section = createEl(doc, 'div'); section.className = 'gnx-qc-section';
                section.innerHTML = `<div class="gnx-qc-label">획득 보상</div>`;
                // selectable = false
                const grid = this.createItemGrid(fixedItems, false); 
                section.appendChild(grid);
                container.appendChild(section);
            }
        }

        // --- 섹션 2: 선택 보상 (selectiveRewards) ---
        if (selective && selective.items && selective.items.length > 0) {
            const selectItems = selective.items.map(r => ({
                item: this.props.getItem(r.itemId),
                count: r.amount
            })).filter(r => r.item !== undefined) as { item: IItem, count: number }[];

            if (selectItems.length > 0) {
                const section = createEl(doc, 'div'); section.className = 'gnx-qc-section';
                section.innerHTML = `<div class="gnx-qc-label" style="color:var(--gnx-ui-accent)">보상 선택 (1개)</div>`;
                // selectable = true
                const grid = this.createItemGrid(selectItems, true);
                section.appendChild(grid);
                container.appendChild(section);
            }
        }

        this.shell.body.appendChild(container);
        this.updateActions();
    }

    private createItemGrid(items: { item: IItem, count: number }[], selectable: boolean) {
        const grid = createEl(this.shell.sr, 'div');
        grid.className = 'gnx-qc-grid';

        items.forEach((rw, idx) => {
            const slot = createEl(this.shell.sr, 'div');
            slot.className = 'gnx-qc-slot';
            
            // 선택 가능하고, 현재 인덱스가 선택된 상태라면 스타일 적용
            if (selectable && this.selectedChoice === idx) {
                slot.setAttribute('data-selected', 'true');
            }

            slot.innerHTML = `
                <div style="width:40px;height:40px;">${renderIcon(rw.item.IconPath)}</div>
                ${rw.count > 1 ? `<div class="gnx-qc-qty">${rw.count}</div>` : ''}
            `;

            // Hover: 툴팁
            slot.onmouseenter = (e) => {
                if (this.tip.pinned) return;
                this.tip.renderItem(rw.item, rw.count);
                this.tip.move(e);
            };
            slot.onmousemove = (e) => { if (!this.tip.pinned) this.tip.move(e); };
            slot.onmouseleave = () => { if (!this.tip.pinned) this.tip.hide(); };

            if (selectable) {
                // 선택형: 클릭 시 선택 처리
                slot.onclick = () => {
                    this.selectedChoice = idx;
                    this.render(); // 다시 그려서 선택 스타일 업데이트
                };
            } else {
                // 고정형: 클릭 시 툴팁 고정
                slot.onclick = (e) => {
                    e.stopPropagation();
                    const actions = `<div class="tt-actions"><button class="tt-btn" data-action="close">닫기</button></div>`;
                    this.tip.renderItem(rw.item, rw.count, { pin: true, actions });
                    this.tip.move(e);
                    const btn = this.tip.tip?.querySelector('[data-action="close"]');
                    if (btn) (btn as HTMLElement).onclick = () => this.tip.hide();
                };
            }

            grid.appendChild(slot);
        });
        return grid;
    }

    private updateActions() {
        const selective = this.props.quest.selectiveRewards;
        const hasSelectiveItems = selective && selective.items && selective.items.length > 0;
        
        // 선택 보상이 존재하는데, 아직 선택하지 않았다면 완료 불가
        const canComplete = !hasSelectiveItems || (this.selectedChoice !== null);

        this.ctx.render.setActions(this.shell, [
            { 
                id: 'complete', 
                // 버튼 텍스트 분기
                label: hasSelectiveItems ? (canComplete ? '보상 받기' : '보상을 선택하세요') : '확인', 
                variant: canComplete ? 'accent' : 'default',
                onClick: () => {
                    if (!canComplete) return; 
                    this.ctx.manager.close();
                    // 선택된 인덱스 (없으면 null) 반환
                    this.props.onComplete(this.selectedChoice);
                }
            }
        ]);
    }
}