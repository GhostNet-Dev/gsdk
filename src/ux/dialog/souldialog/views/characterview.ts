// ============================================================================
// views/characterview.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css, renderIcon } from '../dlgstyle';
import { IItem } from '@Glibs/interface/iinven';
import { TooltipComponent } from '../core/tooltip';

// ----------------------------------------------------------------------------
// 1. Interfaces & Types
// ----------------------------------------------------------------------------

export interface ICharacterRenderer {
    mount(container: HTMLElement): void;
    resize(width: number, height: number): void;
    dispose(): void;
}

export type EquipSlot = 
    | 'head' | 'chest' | 'hands' | 'legs' 
    | 'weapon' | 'weapon_ranged' | 'offhand' 
    | 'ring1' | 'ring2' | 'amulet';

const SLOTS: EquipSlot[] = ['head', 'chest', 'hands', 'legs', 'weapon', 'weapon_ranged', 'offhand', 'ring1', 'ring2', 'amulet'];

export interface IStatValue {
    total: number; // 최종 수치
    bonus: number; // 보너스 수치 (Total - Base)
}

// 스탯 그룹화를 위한 Props 구조 정의
type Props = {
    // 1. 기본 속성 (STR, DEX...)
    attributes: Record<string, IStatValue>;
    // 2. 전투 스탯 (Att, Def, Crit...)
    combat: Record<string, IStatValue>;
    // 3. 자원 (HP, MP...)
    resources: Record<string, IStatValue>;
    // 4. 저항력 (Fire, Ice...)
    resistances: Record<string, IStatValue>;
    // 5. 보조 (Speed, Exp...)
    auxiliary: Record<string, IStatValue>;
    // 6. 특수 효과 (LifeSteal...)
    special: Record<string, IStatValue>;
    
    // 장비 및 렌더러
    equip: Partial<Record<EquipSlot, IItem | null | undefined>>;
    charRenderer: ICharacterRenderer;
    
    // 콜백
    onUnequip?: (slot: EquipSlot) => void;
    onReplace?: (slot: EquipSlot) => void;
    onInspect?: (slot: EquipSlot, item: IItem) => void;
};

// ----------------------------------------------------------------------------
// 2. Constants & Mappings
// ----------------------------------------------------------------------------

// 스탯 키 -> 아이콘 매핑
const STAT_ICONS: Record<string, string> = {
    // Attributes
    strength: '💪', dexterity: '🦶', constitution: '🧱', 
    intelligence: '🧠', wisdom: '🦉', agility: '🐆', 
    luck: '🍀', vitality: '💗', faith: '🙏',

    // Combat
    attack: '⚔️', magicAttack: '🔮', defense: '🛡️', magicDefense: '💠',
    criticalRate: '💥', criticalDamage: '💢', accuracy: '🎯', evasion: '🍃',
    penetration: '🔩', block: '🚧', attackSpeed: '💨', attackRange: '📏',

    // Resources
    hp: '❤️', hpRegen: '💓', mp: '💧', mpRegen: '🚿', 
    stamina: '⚡', staminaRegen: '🔋',

    // Resistances
    fireResistance: '🔥', iceResistance: '❄️', poisonResistance: '☠️',
    electricResistance: '⚡', stunResistance: '😵', slowResistance: '🐢',
    debuffResistance: '🛡️', knockbackResistance: '🗿',

    // Auxiliary & Special
    movementSpeed: '👟', castingSpeed: '⏱️', 
    goldBonus: '💰', expBonus: '📚', itemDropRate: '🎁',
    lifeSteal: '🩸', reflectDamage: '🔙', cooldownReduction: '⌛', thorns: '🌵'
};

// 스탯 키 -> 표시 라벨 (StatDescriptions 기반 요약)
const STAT_LABELS: Record<string, string> = {
    strength: '힘', dexterity: '민첩', constitution: '체질',
    intelligence: '지능', wisdom: '지혜', agility: '기민',
    luck: '운', vitality: '활력', faith: '신앙',
    
    attack: '공격력', magicAttack: '마법공격', defense: '방어력', magicDefense: '마법방어',
    criticalRate: '치명확률', criticalDamage: '치명피해', accuracy: '명중률', evasion: '회피율',
    block: '막기', penetration: '관통', attackSpeed: '공속',
    
    hp: '체력', mp: '마나', stamina: '스테미너',
    hpRegen: '체력재생', mpRegen: '마나재생', staminaRegen: '스테재생',

    fireResistance: '화염저항', iceResistance: '냉기저항', electricResistance: '전기저항',
    poisonResistance: '독 저항', stunResistance: '기절저항',
    
    movementSpeed: '이동속도', castingSpeed: '시전속도', 
    goldBonus: '골드획득', expBonus: '경험치', itemDropRate: '드랍률',
    lifeSteal: '흡혈', reflectDamage: '반사', cooldownReduction: '쿨감', thorns: '가시'
};

// 그룹별 설정 (Max 값 기준, 접미사 등)
const GROUP_CONFIG = {
    attributes: { max: 100, suffix: '' },
    combat: { max: 1000, suffix: '' },
    resources: { max: 2000, suffix: '' },
    resistances: { max: 100, suffix: '%' },
    auxiliary: { max: 200, suffix: '%' },
    special: { max: 100, suffix: '%' }
};

// ----------------------------------------------------------------------------
// 3. CSS Styles
// ----------------------------------------------------------------------------

const CSS_CHAR = css`
    :host { color: var(--gnx-ui-fg); }
    .gnx-char { display:grid; grid-template-columns:340px 1fr; gap:20px; color:inherit; height: 100%; }
    @media (max-width:950px) { .gnx-char { grid-template-columns:1fr; } }

    /* --- Left Panel: Portrait & Stats --- */
    .gnx-left-panel {
        display: flex; flex-direction: column; gap: 16px;
        overflow-y: auto; padding-right: 4px; /* 스크롤바 여유 */
        max-height: 75vh;
    }
    .gnx-left-panel::-webkit-scrollbar { width: 4px; }
    .gnx-left-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

    .gnx-char-portrait {
        min-height:280px; border-radius:14px;
        background:linear-gradient(135deg,#2b2b36,#15151b);
        display:grid; place-items:center;
        box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);
        overflow: hidden; flex-shrink: 0;
    }

    .gnx-stats { display:flex; flex-direction: column; gap:24px; }
    
    .gnx-stat-group h4 {
        margin: 0 0 10px 0; font-size: 13px; color: var(--gnx-ui-accent); 
        text-transform: uppercase; letter-spacing: 1px; opacity: 0.9;
        border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;
    }

    /* [2열 그리드 레이아웃] */
    .gnx-stat-list { 
        display: grid; 
        grid-template-columns: 1fr 1fr; 
        gap: 8px 16px; 
    }
    /* 모바일 대응 */
    @media (max-width: 400px) { .gnx-stat-list { grid-template-columns: 1fr; } }

    .gnx-stat {
        display:grid; grid-template-columns: 20px 60px 1fr auto; gap:6px; align-items:center;
        font-size: 12px;
    }
    .gnx-stat .icon { text-align: center; font-size: 14px; line-height: 1; opacity: 0.9; }
    .gnx-stat .label { color: var(--gnx-ui-sub); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    
    .gnx-val-wrap { 
        text-align: right; min-width: 50px; 
        display: flex; justify-content: flex-end; align-items: center; gap: 4px;
    }
    .gnx-val-total { font-weight:700; font-feature-settings: "tnum"; font-size: 13px; }
    .gnx-val-bonus { font-size: 10px; font-weight: 500; }
    .gnx-val-bonus.pos { color: #4ade80; }
    .gnx-val-bonus.neg { color: #f87171; }

    .gnx-bar { height:4px; border-radius:4px; position:relative; overflow:hidden; background:rgba(255,255,255,.08); }
    .gnx-bar>i { position:absolute; left:0; top:0; bottom:0; background:var(--gnx-ui-fg); opacity: 0.6; }

    /* --- Right Panel: Equipment --- */
    .gnx-equip-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; align-content: start; }
    @media (max-width:700px) { .gnx-equip-grid { grid-template-columns:repeat(3,1fr); } }
    
    .gnx-eslot {
        height:78px; border:1px solid rgba(255,255,255,.14); border-radius:10px;
        display:grid; place-items:center; position:relative;
        background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.015));
        cursor:pointer; overflow: hidden; transition: border-color 0.2s;
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

// ----------------------------------------------------------------------------
// 4. CharacterView Class
// ----------------------------------------------------------------------------

export class CharacterView implements IDialogView<Props> {
    private shell!: any;
    private ctx!: ViewContext;
    private props!: Props;
    private tip!: TooltipComponent; 
    private charContainerRef?: HTMLDivElement;
    private _ro?: ResizeObserver;
    private key?: string;

    constructor(private charRenderer: ICharacterRenderer) { }

    mount(ctx: ViewContext, props: Props) {
        this.ctx = ctx;
        this.props = props;
        this.shell = ctx.shell;
        this.tip = new TooltipComponent(this.shell.sr);

        ctx.render.setTitle(this.shell, 'Character Sheet');
        ctx.render.setWide(this.shell, true);
        this.key = ctx.render.ensureScopedCSS(this.shell.sr, CSS_CHAR, 'view:char');

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
        if (this.key) this.ctx.render.releaseCSS(this.shell.sr, this.key);
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

        // --- LEFT PANEL (Portrait + Stats) ---
        const left = createEl(doc, 'div'); left.className = 'gnx-left-panel';
        
        // 1. Portrait
        this.charContainerRef = createEl(doc, 'div');
        this.charContainerRef.className = 'gnx-char-portrait';
        left.appendChild(this.charContainerRef);

        // 2. Stats Area
        const statsArea = createEl(doc, 'div'); statsArea.className = 'gnx-stats';
        
        // 그룹 정의 (데이터, 라벨, MaxRef, Suffix)
        const groups = [
            { key: 'attributes', title: 'Attributes', data: this.props.attributes, ...GROUP_CONFIG.attributes },
            { key: 'combat', title: 'Combat Stats', data: this.props.combat, ...GROUP_CONFIG.combat },
            { key: 'resources', title: 'Resources', data: this.props.resources, ...GROUP_CONFIG.resources },
            { key: 'resistances', title: 'Resistances', data: this.props.resistances, ...GROUP_CONFIG.resistances },
            { key: 'auxiliary', title: 'Auxiliary', data: this.props.auxiliary, ...GROUP_CONFIG.auxiliary },
            { key: 'special', title: 'Special Effects', data: this.props.special, ...GROUP_CONFIG.special },
        ];

        groups.forEach(g => {
            // 데이터가 비어있으면 렌더링 스킵
            if (!g.data || Object.keys(g.data).length === 0) return;

            const groupDiv = createEl(doc, 'div'); groupDiv.className = 'gnx-stat-group';
            groupDiv.innerHTML = `<h4>${g.title}</h4>`;
            
            const list = createEl(doc, 'div'); list.className = 'gnx-stat-list';

            Object.entries(g.data).forEach(([key, val]) => {
                const label = STAT_LABELS[key] || key; // 한글 라벨 없으면 키 사용
                const icon = STAT_ICONS[key] || '🔹';  // 아이콘 없으면 기본값
                
                // 특수 케이스: Crit Rate 등은 max 기준을 다르게 잡을 수 있음
                let currentMax = g.max;
                if (key.includes('Rate') || key.includes('Bonus') || key.includes('Resistance')) currentMax = 100;

                list.appendChild(this.createStatRow(label, icon, val, currentMax, g.suffix));
            });

            groupDiv.appendChild(list);
            statsArea.appendChild(groupDiv);
        });

        left.appendChild(statsArea);

        // --- RIGHT PANEL (Equip Grid) ---
        const right = createEl(doc, 'div');
        const grid = createEl(doc, 'div'); grid.className = 'gnx-equip-grid';

        SLOTS.forEach((slot) => {
            const item = this.props.equip?.[slot];
            const cell = this.createEquipSlot(doc, slot, item);
            grid.appendChild(cell);
        });

        right.appendChild(grid);
        
        wrap.appendChild(left); 
        wrap.appendChild(right);
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

    // --- Helper: Stat Row Creation ---
    private createStatRow(label: string, icon: string, stat: IStatValue, maxRef: number, suffix = '') {
        const row = createEl(this.shell.sr, 'div'); row.className = 'gnx-stat';
        
        // Bar Percent Calculation
        let percent = 0;
        if (maxRef > 0) {
            percent = (stat.total / maxRef) * 100;
            if (percent > 100) percent = 100;
            if (percent < 0) percent = 0;
        }
        
        // Bonus Text
        let bonusHtml = '';
        if (stat.bonus !== 0) {
            const isPos = stat.bonus > 0;
            const sign = isPos ? '+' : ''; // 음수일 때는 자동으로 '-'가 붙으므로 sign 불필요
            const cls = isPos ? 'pos' : 'neg';
            // 보너스 수치는 소수점 제거
            bonusHtml = `<span class="gnx-val-bonus ${cls}">(${sign}${Math.round(stat.bonus)}${suffix})</span>`;
        }

        // Total Value Formatting (소수점 1자리까지 표시하되 정수면 제거)
        const displayVal = Number.isInteger(stat.total) ? stat.total : stat.total.toFixed(1);

        row.innerHTML = `
            <div class="icon">${icon}</div>
            <div class="label" title="${label}">${label}</div>
            <div class="gnx-bar"><i style="width:${percent}%"></i></div>
            <div class="gnx-val-wrap">
                ${bonusHtml}
                <span class="gnx-val-total">${displayVal}${suffix}</span>
            </div>
        `;
        return row;
    }

    // --- Helper: Equip Slot Creation ---
    private createEquipSlot(doc: Document | ShadowRoot, slot: EquipSlot, item: IItem | null | undefined) {
        const cell = createEl(doc, 'div'); 
        cell.className = 'gnx-eslot';
        
        cell.innerHTML = `
            <div class="gnx-e-icon-wrap">
                ${item ? renderIcon(item.IconPath) : '<span style="opacity:0.25; font-size:24px">—</span>'}
            </div>
            <div class="slot-name">${slot}</div>
        `;

        // Interaction
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

        // Click Handler (Tooltip Pin & Actions)
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
                this.tip.show({ title: `[${slot}]`, body: '장착된 아이템이 없습니다.', actions, pinned: true });
            }
            
            this.tip.move(e);
            
            // Button Event Binding
            const tipEl = this.tip.tip;
            if (tipEl) {
                tipEl.querySelector('[data-action="close"]')?.addEventListener('click', () => this.tip.hide());
                if (item) {
                    tipEl.querySelector('[data-action="inspect"]')?.addEventListener('click', () => this.props.onInspect?.(slot, item));
                    tipEl.querySelector('[data-action="unequip"]')?.addEventListener('click', () => { this.props.onUnequip?.(slot); this.tip.hide(); });
                }
                tipEl.querySelector('[data-action="replace"]')?.addEventListener('click', () => { this.props.onReplace?.(slot); this.tip.hide(); });
            }
        };

        return cell;
    }
}