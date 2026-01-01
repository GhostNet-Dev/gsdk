import { createEl, renderIcon, getRarityClass, renderStatsHtml } from '../dlgstyle';

export class TooltipComponent {
    public tip?: HTMLDivElement;
    public pinned = false;
    
    // 타겟 식별용 (Inventory: index, Character/Shop: string ID)
    public targetIndex: number | null = null;
    public targetId: string | null = null;

    constructor(private sr: Document | ShadowRoot) {}

    public ensure() {
        if (this.tip?.isConnected) return;
        this.tip = createEl(this.sr, 'div') as HTMLDivElement;
        this.tip.className = 'gnx-tip'; 
        this.sr.appendChild(this.tip);
    }

    /**
     * [추가됨] 일반적인 내용을 툴팁으로 표시하는 메서드
     * (아이템 객체가 없는 빈 슬롯이나, 단순 메시지 표시에 사용)
     */
    public show(opts: { 
        title: string; 
        body?: string; 
        actions?: string; 
        pinned?: boolean;
        icon?: string; 
    }) {
        this.ensure();
        this.pinned = !!opts.pinned;
        this.tip!.setAttribute('data-show', 'true');
        this.tip!.setAttribute('data-pinned', String(this.pinned));
        this.tip!.style.pointerEvents = this.pinned ? 'auto' : 'none';

        const iconHtml = opts.icon 
            ? `<div style="width:24px;height:24px;">${renderIcon(opts.icon)}</div>` 
            : '';

        this.tip!.innerHTML = `
            <div class="tt-title">
                ${iconHtml}
                <span>${opts.title}</span>
            </div>
            <div class="tt-desc">${opts.body || ''}</div>
            ${opts.actions || ''}
        `;
    }

    /**
     * IItem 객체 전용 렌더링 메서드
     */
    public renderItem(item: any, count: number = 1, options: { pin?: boolean; actions?: string } = {}) {
        this.ensure();
        this.pinned = !!options.pin;
        this.tip!.setAttribute('data-show', 'true');
        this.tip!.setAttribute('data-pinned', String(this.pinned));
        this.tip!.style.pointerEvents = this.pinned ? 'auto' : 'none';

        const rarityClass = getRarityClass(item.Level);
        
        this.tip!.innerHTML = `
            <div class="tt-title">
                <div style="width:24px;height:24px;">${renderIcon(item.IconPath)}</div>
                <span class="${rarityClass}">${item.Name}</span>
            </div>
            ${count > 1 ? `<div style="font-size:12px;opacity:0.8;">수량: ${count}개</div>` : ''}
            ${renderStatsHtml(item)}
            <div class="tt-desc">${item.Description || ''}</div>
            ${options.actions || ''}
        `;
    }

    public move(e: MouseEvent | { clientX: number, clientY: number }) {
        if (!this.tip) return;
        const rect = this.tip.getBoundingClientRect();
        
        // 뷰포트 경계 체크 및 위치 보정
        let x = e.clientX + 16; 
        let y = e.clientY + 16;
        
        if (x + rect.width > window.innerWidth - 12) x = e.clientX - rect.width - 16;
        if (y + rect.height > window.innerHeight - 12) y = e.clientY - rect.height - 16;
        
        this.tip.style.left = `${Math.max(12, x)}px`;
        this.tip.style.top = `${Math.max(12, y)}px`;
    }

    public hide() {
        if (this.tip) this.tip.setAttribute('data-show', 'false');
        this.pinned = false;
        this.targetIndex = null;
        this.targetId = null;
    }
    
    public destroy() {
        this.tip?.remove();
    }
}