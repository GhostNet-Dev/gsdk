// ============================================================================
// views/characterview.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import { IItem } from '@Glibs/interface/iinven';
import { TooltipComponent } from '../core/tooltip';

// 1. 아이콘 매핑
const STAT_ICONS: Record<string, string> = {
    STR: '💪', DEX: '🦶', INT: '🧠', FAI: '🙏', VIT: '💗',
    HP: '❤️', MP: '💧', 
    Attck: '⚔️', Def: '🛡️', // Props 키와 일치시킴
    Crit: '💥', Speed: '👟', Weight: '⚖️',
    FIRE: '🔥', ICE: '❄️', ELEC: '⚡'
};

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

// [변경] Props 구조: Caller가 계산한 최종 값을 받음
type Props = {
    // 모든 스탯의 최종 합산 값 (기본 + 장비 + 버프)
    base: { 
        STR: number; DEX: number; INT: number; FAI: number; VIT: number;
        HP: number; MP: number;
        Attck: number; Def: number;
        Crit?: number; Speed?: number; Weight?: number; // 선택적 속성들
    };
    // 저항력 최종 값
    resistBase: { fire: number; elec: number; ice: number };
    // 장비 데이터 (아이콘 표시 및 툴팁용)
    equip: Partial<Record<EquipSlot, IItem | null | undefined>>;
    
    charRenderer: ICharacterRenderer;
    onUnequip?: (slot: EquipSlot) => void;
    onReplace?: (slot: EquipSlot) => void;
    onInspect?: (slot: EquipSlot, item: IItem) => void;
};

const CSS_CHAR = css`
    :host { color: var(--gnx-ui-fg); }
    .gnx-char { display:grid; grid-template-columns:320px 1fr; gap:20px; color:inherit; }
    @media (max-width:950px) { .gnx-char { grid-template-columns:1fr; } }

    /* Portrait Area */
    .gnx-char-portrait {
        height:280px; border-radius:14px;
        background:linear-gradient(135deg,#2b2b36,#15151b);
        display:grid; place-items:center;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
        overflow: hidden;
    }

    /* Stats Area */
    .gnx-stats { 
        display:flex; flex-direction: column; gap:20px; margin-top:16px; 
    }
    
    .gnx-stat-group h4 {
        margin: 0 0 8px 0; font-size: 13px; color: var(--gnx-ui-accent); 
        text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;
        border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;
    }

    .gnx-stat-list { display: grid; gap: 8px; }

    .gnx-stat {
        display:grid; grid-template-columns: 24px 80px 1fr auto; gap:6px; align-items:center;
        font-size: 13px;
    }
    .gnx-stat .icon { text-align: center; font-size: 14px; line-height: 1; opacity: 0.9; }
    .gnx-stat .label { color: var(--gnx-ui-sub); font-weight: 500; }
    .gnx-stat .val { font-weight:700; min-width: 40px; text-align: right; font-feature-settings: "tnum"; }

    .gnx-bar { height:4px; border-radius:4px; position:relative; overflow:hidden; background:rgba(255,255,255,.08); }
    .gnx-bar>i { position:absolute; left:0; top:0; bottom:0; background:var(--gnx-ui-fg); opacity: 0.6; }

    /* Equipment Grid */
    .gnx-equip-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; align-content: start; }
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
    private tip!: TooltipComponent; 
    private charContainerRef?: HTMLDivElement;
    private _ro?: ResizeObserver;

    constructor(private charRenderer: ICharacterRenderer) { }

    mount(ctx: ViewContext, props: Props) {
        this.ctx = ctx;
        this.props = props;
        this.shell = ctx.shell;
        this.tip = new TooltipComponent(this.shell.sr);

        ctx.render.setTitle(this.shell, '캐릭터 정보');
        ctx.render.setWide(this.shell, true);
        ctx.render.ensureScopedCSS(this.shell.sr, CSS_CHAR, 'view:char');

        this.render();
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

        // --- LEFT PANEL ---
        const left = createEl(doc, 'div');
        
        // 1. Portrait
        this.charContainerRef = createEl(doc, 'div');
        this.charContainerRef.className = 'gnx-char-portrait';
        left.appendChild(this.charContainerRef);

        // 2. Stats Area (단순 렌더링)
        const statsArea = createEl(doc, 'div'); statsArea.className = 'gnx-stats';
        
        // Caller가 이미 계산해서 준 값을 사용
        const { base, resistBase } = this.props;

        // --- Group 1: Attributes ---
        const attrGroup = createEl(doc, 'div'); attrGroup.className = 'gnx-stat-group';
        attrGroup.innerHTML = `<h4>Attributes</h4>`;
        const attrList = createEl(doc, 'div'); attrList.className = 'gnx-stat-list';
        
        // 순회할 키 목록
        const attrs = ['STR', 'DEX', 'INT', 'FAI', 'VIT'] as const;
        attrs.forEach(key => {
            // maxRef는 UI 바(bar)의 시각적 기준값 (예: 100이면 꽉 참)
            attrList.appendChild(this.createStatRow(key, STAT_ICONS[key], base[key], 100));
        });
        attrGroup.appendChild(attrList);
        statsArea.appendChild(attrGroup);

        // --- Group 2: Combat Stats ---
        const combatGroup = createEl(doc, 'div'); combatGroup.className = 'gnx-stat-group';
        combatGroup.innerHTML = `<h4>Combat Stats</h4>`;
        const combatList = createEl(doc, 'div'); combatList.className = 'gnx-stat-list';

        // Props 키와 UI 라벨 매핑
        combatList.appendChild(this.createStatRow('HP', STAT_ICONS['HP'], base.HP, 1000));
        combatList.appendChild(this.createStatRow('MP', STAT_ICONS['MP'], base.MP, 500));
        combatList.appendChild(this.createStatRow('Attack', STAT_ICONS['Attck'], base.Attck, 300));
        combatList.appendChild(this.createStatRow('Defense', STAT_ICONS['Def'], base.Def, 300));
        
        if (base.Crit !== undefined) 
            combatList.appendChild(this.createStatRow('Crit Rate', STAT_ICONS['Crit'], base.Crit, 50, '%'));
        if (base.Speed !== undefined) 
            combatList.appendChild(this.createStatRow('Speed', STAT_ICONS['Speed'], base.Speed, 200));
        if (base.Weight !== undefined) 
            combatList.appendChild(this.createStatRow('Weight', STAT_ICONS['Weight'], base.Weight, 100));

        combatGroup.appendChild(combatList);
        statsArea.appendChild(combatGroup);

        // --- Group 3: Resistances ---
        const resistGroup = createEl(doc, 'div'); resistGroup.className = 'gnx-stat-group';
        resistGroup.innerHTML = `<h4>Resistances</h4>`;
        const resistList = createEl(doc, 'div'); resistList.className = 'gnx-stat-list';

        // resistBase 객체 순회
        const resMap: Record<string, string> = { fire: 'FIRE', ice: 'ICE', elec: 'ELEC' };
        Object.entries(resistBase).forEach(([k, v]) => {
            const iconKey = resMap[k] || k.toUpperCase();
            resistList.appendChild(this.createStatRow(k.toUpperCase(), STAT_ICONS[iconKey], v, 100));
        });
        
        resistGroup.appendChild(resistList);
        statsArea.appendChild(resistGroup);

        left.appendChild(statsArea);

        // --- RIGHT: Equip Grid (기존 로직 유지 - 변경 없음) ---
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

            // Hover & Click logic (tooltip)
            cell.onmouseenter = (e) => {
                (cell as HTMLElement).dataset.hover = 'true';
                if (item && !this.tip.pinned) {
                    this.tip.renderItem(item);
                    this.tip.move(e);
                }
            };
            cell.onmousemove = (e) => { if (!this.tip.pinned) this.tip.move(e); };
            cell.onmouseleave = () => {
                (cell as HTMLElement).dataset.hover = 'false';
                if (!this.tip.pinned) this.tip.hide();
            };

            cell.onpointerdown = (e) => {
                if (e.pointerType !== 'mouse') return;
                e.stopPropagation();

                const buttons: string[] = [];
                buttons.push(`<button class="tt-btn" data-action="close">닫기</button>`);

                if (item) {
                    if (this.props.onInspect) buttons.push(`<button class="tt-btn" data-action="inspect">자세히</button>`);
                    if (this.props.onReplace) buttons.push(`<button class="tt-btn tt-btn--accent" data-action="replace">교체</button>`);
                    if (this.props.onUnequip) buttons.push(`<button class="tt-btn" style="border-color:#ff5a6a; color:#ff5a6a;" data-action="unequip">해제</button>`);
                    
                    const actions = `<div class="tt-actions">${buttons.join('')}</div>`;
                    this.tip.renderItem(item, 1, { pin: true, actions });
                } else {
                    if (this.props.onReplace) buttons.push(`<button class="tt-btn tt-btn--accent" data-action="replace">장비 장착</button>`);
                    const actions = `<div class="tt-actions">${buttons.join('')}</div>`;
                    this.tip.show({ title: `[${slot}]`, body: '장비가 없습니다.', actions, pinned: true });
                }
                this.tip.move(e);

                const tipEl = this.tip.tip;
                if (tipEl) {
                    tipEl.querySelector('[data-action="close"]')?.addEventListener('click', () => this.tip.hide());
                    if (item) {
                        if (this.props.onInspect) tipEl.querySelector('[data-action="inspect"]')?.addEventListener('click', () => this.props.onInspect?.(slot, item));
                        if (this.props.onUnequip) tipEl.querySelector('[data-action="unequip"]')?.addEventListener('click', () => { this.props.onUnequip?.(slot); this.tip.hide(); });
                    }
                    if (this.props.onReplace) tipEl.querySelector('[data-action="replace"]')?.addEventListener('click', () => { this.props.onReplace?.(slot); this.tip.hide(); });
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

    // [수정] 단순 렌더링 헬퍼 (보너스 계산 로직 제거)
    private createStatRow(label: string, icon: string = '', value: number, maxRef: number, suffix = '') {
        const row = createEl(this.shell.sr, 'div'); row.className = 'gnx-stat';
        
        // UI 바를 위한 단순 비율 (100% 넘으면 꽉 참)
        let percent = (value / maxRef) * 100;
        if (percent > 100) percent = 100;
        
        row.innerHTML = `
            <div class="icon">${icon}</div>
            <div class="label">${label}</div>
            <div class="gnx-bar"><i style="width:${percent}%"></i></div>
            <div class="val">
                ${Math.round(value)}${suffix}
            </div>
        `;
        return row;
    }
}