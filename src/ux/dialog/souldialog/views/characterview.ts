// ============================================================================
// views/characterview.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import { IItem } from '@Glibs/interface/iinven';
import { TooltipComponent } from '../core/tooltip';

export interface ICharacterRenderer {
    mount(container: HTMLElement): void;
    resize(width: number, height: number): void;
    dispose(): void;
}

type EquipSlot = 
    | 'head' | 'chest' | 'hands' | 'legs' 
    | 'weapon' | 'offhand' 
    | 'ring1' | 'ring2' | 'amulet';

const SLOTS: EquipSlot[] = ['head', 'chest', 'hands', 'legs', 'weapon', 'offhand', 'ring1', 'ring2', 'amulet'];

type Props = {
    base: { STR: number; DEX: number; INT: number; FAI: number; VIT: number };
    resistBase: { fire: number; elec: number; ice: number };
    equip: Partial<Record<EquipSlot, IItem | null | undefined>>;
    charRenderer: ICharacterRenderer;
    onUnequip?: (slot: EquipSlot) => void;
    onReplace?: (slot: EquipSlot) => void;
    onInspect?: (slot: EquipSlot, item: IItem) => void;
};

const CSS_CHAR = css`
    :host { color: var(--gnx-ui-fg); }
    .gnx-char { display:grid; grid-template-columns:280px 1fr; gap:16px; color:inherit; }
    @media (max-width:900px) { .gnx-char { grid-template-columns:1fr; } }

    /* Portrait Area */
    .gnx-char-portrait {
        height:280px; border-radius:14px;
        background:linear-gradient(135deg,#2b2b36,#15151b);
        display:grid; place-items:center;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
        overflow: hidden;
    }

    /* Stats Area */
    .gnx-stats { display:grid; gap:10px; margin-top:12px; }
    .gnx-stat {
        display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center;
        border:1px solid rgba(255,255,255,.10); border-radius:10px; padding:8px 10px;
        background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
    }
    .gnx-stat .label { font-weight:600; }
    .gnx-stat .val { font-weight:700; }
    .gnx-plus { color:var(--gnx-ui-accent); font-weight:700; margin-left:6px; }

    .gnx-bar { height:6px; border-radius:6px; position:relative; overflow:hidden; background:rgba(255,255,255,.12); }
    .gnx-bar>i { position:absolute; left:0; top:0; bottom:0; background:color-mix(in oklab,var(--gnx-ui-accent) 60%,transparent); }

    /* Equipment Grid */
    .gnx-equip-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; }
    @media (max-width:700px) { .gnx-equip-grid { grid-template-columns:repeat(3,1fr); } }
    
    .gnx-eslot {
        height:78px; border:1px solid rgba(255,255,255,.14); border-radius:10px;
        display:grid; place-items:center; position:relative;
        background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
        cursor:pointer; overflow: hidden;
    }
    .gnx-eslot[data-hover="true"] {
        border-color:var(--gnx-ui-accent);
        box-shadow:0 0 0 2px color-mix(in oklab,var(--gnx-ui-accent) 40%,transparent);
    }
    .gnx-eslot .slot-name {
        position:absolute; left:8px; bottom:6px; font-size:11px; color:var(--gnx-ui-sub); z-index: 2;
    }
    .gnx-e-icon-wrap {
        position: absolute; inset: 0; padding: 8px;
        display: flex; justify-content: center; align-items: center; z-index: 1;
    }
`;

export class CharacterView implements IDialogView<Props> {
    private shell!: any;
    private ctx!: ViewContext;
    private props!: Props;
    
    // 공통 툴팁 컴포넌트
    private tip!: TooltipComponent; 
    
    private charContainerRef?: HTMLDivElement;
    private _ro?: ResizeObserver;

    constructor(private charRenderer: ICharacterRenderer) { }

    mount(ctx: ViewContext, props: Props) {
        this.ctx = ctx;
        this.props = props;
        this.shell = ctx.shell;
        
        // 1. 툴팁 초기화
        this.tip = new TooltipComponent(this.shell.sr);

        ctx.render.setTitle(this.shell, '캐릭터');
        ctx.render.setWide(this.shell, true);
        ctx.render.ensureScopedCSS(this.shell.sr, CSS_CHAR, 'view:char');

        this.render();
        
        // 2. 외부 클릭 시 닫기
        document.addEventListener('pointerdown', this.onGlobalDown, true); 
        
        this.mountRenderer();
    }

    update(next: Props) {
        this.props = next;
        this.render();
    }

    unmount() {
        if (this._ro) this._ro.disconnect();
        this.charRenderer.dispose();
        
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

        const wrap = createEl(doc, 'div'); wrap.className = 'gnx-char';

        // --- LEFT: Portrait + Stats ---
        const left = createEl(doc, 'div');
        
        // Portrait Container
        this.charContainerRef = createEl(doc, 'div');
        this.charContainerRef.className = 'gnx-char-portrait';
        left.appendChild(this.charContainerRef);

        // Stats
        const statsArea = createEl(doc, 'div'); statsArea.className = 'gnx-stats';
        
        const sums = this.computeEquipSums();
        const atkBase = Math.round(this.props.base.STR * 1.2 + this.props.base.DEX * 0.5);
        const defBase = Math.round(10 + this.props.base.VIT * 0.8);
        const wt = sums.wt;

        statsArea.appendChild(this.createStatRow('공격력', atkBase + sums.atk, sums.atk, 100/3));
        statsArea.appendChild(this.createStatRow('방어도', defBase + sums.def, sums.def, 100/3));
        statsArea.appendChild(this.createStatRow('장비 중량', Math.min(100, wt * 12), wt, 1, true));
        
        left.appendChild(statsArea);

        // --- RIGHT: Equip Grid ---
        const right = createEl(doc, 'div');
        const grid = createEl(doc, 'div'); grid.className = 'gnx-equip-grid';

        SLOTS.forEach((slot) => {
            const item = this.props.equip?.[slot];
            const cell = createEl(doc, 'div'); 
            cell.className = 'gnx-eslot';
            
            cell.innerHTML = `
                <div class="gnx-e-icon-wrap">
                    ${item ? renderIcon(item.IconPath) : '<span style="opacity:0.25; font-size:24px">—</span>'}
                </div>
                <div class="slot-name">${slot}</div>
            `;

            // Hover Event
            cell.onmouseenter = (e) => {
                (cell as HTMLElement).dataset.hover = 'true';
                if (item && !this.tip.pinned) {
                    this.tip.renderItem(item);
                    this.tip.move(e);
                }
            };
            
            cell.onmousemove = (e) => {
                if (!this.tip.pinned) this.tip.move(e);
            };

            cell.onmouseleave = () => {
                (cell as HTMLElement).dataset.hover = 'false';
                if (!this.tip.pinned) this.tip.hide();
            };

            // Click Event (직접 바인딩 적용)
            cell.onpointerdown = (e) => {
                if (e.pointerType !== 'mouse') return;
                e.stopPropagation();

                let actions = '';
                if (item) {
                    actions = `
                        <div class="tt-actions">
                            <button class="tt-btn" data-action="close">닫기</button>
                            <button class="tt-btn" data-action="inspect">자세히</button>
                            <button class="tt-btn tt-btn--accent" data-action="replace">교체</button>
                            <button class="tt-btn" style="border-color:#ff5a6a; color:#ff5a6a;" data-action="unequip">해제</button>
                        </div>`;
                    this.tip.renderItem(item, 1, { pin: true, actions });
                } else {
                    actions = `
                        <div class="tt-actions">
                             <button class="tt-btn" data-action="close">닫기</button>
                             <button class="tt-btn tt-btn--accent" data-action="replace">장비 장착</button>
                        </div>`;
                    this.tip.show({ 
                        title: `[${slot}]`, 
                        body: '장비가 없습니다.', 
                        actions, pinned: true 
                    });
                }
                this.tip.move(e);

                // [중요] 버튼 리스너 직접 연결
                const tipEl = this.tip.tip;
                if (tipEl) {
                    tipEl.querySelector('[data-action="close"]')?.addEventListener('click', () => this.tip.hide());
                    
                    if (item) {
                        tipEl.querySelector('[data-action="inspect"]')?.addEventListener('click', () => {
                             this.props.onInspect?.(slot, item);
                        });
                        tipEl.querySelector('[data-action="unequip"]')?.addEventListener('click', () => {
                             this.props.onUnequip?.(slot);
                             this.tip.hide();
                        });
                    }
                    
                    tipEl.querySelector('[data-action="replace"]')?.addEventListener('click', () => {
                         this.props.onReplace?.(slot);
                         this.tip.hide();
                    });
                }
            };

            grid.appendChild(cell);
        });

        right.appendChild(grid);
        wrap.appendChild(left); wrap.appendChild(right);
        this.shell.body.appendChild(wrap);

        this.ctx.render.setActions(this.shell, [{ id: 'close', label: '닫기', onClick: () => this.ctx.manager.close() }]);
    }

    private mountRenderer() {
        if (this.charContainerRef) {
            this.charContainerRef.textContent = '';
            this.charRenderer.mount(this.charContainerRef);
            
            this._ro = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    this.charRenderer.resize(width, height);
                }
            });
            this._ro.observe(this.charContainerRef);
        }
    }

    private createStatRow(label: string, total: number, bonus: number, scale = 1, clamp = false) {
        const row = createEl(this.shell.sr, 'div'); row.className = 'gnx-stat';
        
        const width = clamp ? Math.min(100, total * scale) : (total / scale);
        
        row.innerHTML = `
            <div class="label">${label}</div>
            <div class="gnx-bar"><i style="width:${width}%"></i></div>
            <div class="val">
                ${Math.round(total)}
                ${bonus > 0 ? `<span class="gnx-plus">(+${Math.round(bonus)})</span>` : ''}
            </div>
        `;
        return row;
    }

    private computeEquipSums() {
        let atk = 0, def = 0, wt = 0;
        SLOTS.forEach(s => {
            const it = this.props.equip?.[s];
            if (!it) return;
            
            if (it.Stats) {
                atk += (it.Stats.attack || 0);
                def += (it.Stats.defense || 0);
                wt += (it.Stats.weight || 0);
            }
            if ((it as any).Weight) wt += (it as any).Weight;
        });
        return { atk, def, wt };
    }
}