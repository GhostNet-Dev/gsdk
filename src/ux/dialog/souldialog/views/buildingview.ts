import { createEl, css, renderIcon } from '../dlgstyle';
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { TechTreeDefBase } from '@Glibs/techtree/techtreedefs';
import { BuildingProperty } from '@Glibs/interactives/building/buildingdefs';
import { TooltipComponent } from '../core/tooltip';

type BuildingViewProps = {
    buildings: TechTreeDefBase[];
    canLevelUp: (id: string) => { ok: boolean; reason?: string };
    onBuild: (id: string) => void;
};

const CSS_BUILDING = css`
  .gnx-build-grid { 
    --cell: 100px; 
    display: grid; 
    gap: 12px; 
    grid-template-columns: repeat(auto-fill, minmax(var(--cell), 1fr)); 
  }
  .gnx-build-slot {
    aspect-ratio: 1 / 1;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015));
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 8px;
    position: relative;
    text-align: center;
    box-sizing: border-box;
    appearance: none;
    color: inherit;
    font-family: inherit;
  }
  .gnx-build-slot:hover {
    background: rgba(255,255,255,.08);
    border-color: var(--gnx-ui-accent-weak);
    transform: translateY(-2px);
  }
  .gnx-build-slot[data-selected="true"] {
    border-color: var(--gnx-ui-accent);
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--gnx-ui-accent) 40%, transparent);
  }
  .gnx-build-slot.gnx-disabled {
    opacity: 0.5;
    filter: grayscale(1);
    cursor: not-allowed;
  }
  .gnx-build-slot__icon {
    font-size: 32px;
    margin-bottom: 4px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .gnx-build-slot__name {
    font-size: 12px;
    font-weight: 600;
    color: var(--gnx-ui-fg);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .tt-actions { display: flex; gap: 8px; margin-top: 12px; }
  .tt-btn {
    flex: 1;
    appearance: none;
    border: 1px solid rgba(255,255,255,.2);
    background: rgba(255,255,255,.1);
    color: #fff;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
  }
  .tt-btn:hover { background: rgba(255,255,255,.2); }
  .tt-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .tt-btn--accent { background: var(--gnx-ui-accent); border-color: transparent; }
  .tt-btn--accent:hover:not(:disabled) { background: color-mix(in oklab, var(--gnx-ui-accent) 80%, white); }
`;

export class BuildingView implements IDialogView<BuildingViewProps> {
    private shell?: any;
    private ctx!: ViewContext;
    private props!: BuildingViewProps;
    private tip!: TooltipComponent;
    private selectedId: string | null = null;

    mount(ctx: ViewContext, props: BuildingViewProps) {
        this.ctx = ctx;
        this.props = props;
        this.shell = ctx.shell;
        this.tip = new TooltipComponent(this.shell.sr);

        ctx.render.setTitle(this.shell, '건설 — 기지 확장');
        ctx.render.setWide(this.shell, true);
        ctx.render.ensureScopedCSS(this.shell.sr, CSS_BUILDING, 'view:building');

        this.render();
        document.addEventListener('pointerdown', this.onGlobalDown, true);
    }

    private onGlobalDown = (e: Event) => {
        if (!this.tip.pinned) return;
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
        if (this.tip.tip && (path.includes(this.tip.tip) || this.tip.tip.contains(e.target as Node))) {
            return;
        }
        this.tip.hide();
    };

    private render() {
        const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
        this.shell.body.innerHTML = '';

        const grid = createEl(doc, 'div');
        grid.className = 'gnx-build-grid';

        this.props.buildings.forEach(node => {
            const check = this.props.canLevelUp(node.id);
            const isEnabled = check.ok;

            const slot = createEl(doc, 'button');
            slot.className = 'gnx-build-slot' + (isEnabled ? '' : ' gnx-disabled');
            slot.setAttribute('data-selected', String(this.selectedId === node.id));
            slot.type = 'button';
            
            slot.innerHTML = `
                <div class="gnx-build-slot__icon">${renderIcon(node.icon || '🏗️')}</div>
                <div class="gnx-build-slot__name">${node.name}</div>
            `;

            slot.onmouseenter = (e) => {
                if (this.tip.pinned) return;
                this.showTooltip(node, isEnabled, check.reason, false, e);
            };
            slot.onmousemove = (e) => {
                if (!this.tip.pinned) this.tip.move(e);
            };
            slot.onmouseleave = () => {
                if (!this.tip.pinned) this.tip.hide();
            };

            slot.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectedId = node.id;
                this.updateSelection();
                this.showTooltip(node, isEnabled, check.reason, true, e);
            };

            grid.appendChild(slot);
        });

        this.shell.body.appendChild(grid);
        this.ctx.render.setActions(this.shell, [
            { id: 'close', label: '닫기', onClick: () => this.ctx.manager.close() }
        ]);
    }

    private updateSelection() {
        const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
        const slots = doc.querySelectorAll('.gnx-build-slot');
        slots.forEach((el: any, i: number) => {
            const node = this.props.buildings[i];
            el.setAttribute('data-selected', String(this.selectedId === node.id));
        });
    }

    private showTooltip(node: TechTreeDefBase, isEnabled: boolean, reason: string | undefined, pinned: boolean, e: MouseEvent) {
        const costText = node.cost && node.cost[0]?.cost 
            ? Object.entries(node.cost[0].cost).map(([k, v]) => `${k === 'gold' ? '◈' : ''}${v}`).join(', ')
            : '무료';

        let reasonText = reason || '잠겨 있음';
        if (reason === 'insufficient funds') reasonText = '자금이 부족합니다';
        else if (reason?.startsWith('requirement not met')) {
            // "requirement not met: has(cc)" 같은 형식을 한국어로 변환 시도
            const req = reason.split(': ')[1] || '';
            if (req.includes('has(')) {
                const targetId = req.match(/has\(([^)]+)\)/)?.[1];
                const targetNode = this.props.buildings.find(b => b.id === targetId);
                reasonText = `선행 건물 필요: ${targetNode?.name || targetId}`;
            } else {
                reasonText = `요구 조건 미달: ${req}`;
            }
        }

        const body = `
            <div style="margin-bottom:8px; color:var(--gnx-ui-sub); font-size:13px;">${node.desc || ''}</div>
            <div style="color:var(--gnx-ui-accent); font-weight:700; font-size:14px;">비용: ${costText}</div>
            ${!isEnabled ? `<div style="color:#ff6b6b; font-size:12px; margin-top:8px; padding:4px 8px; background:rgba(255,107,107,0.1); border-radius:4px;">${reasonText}</div>` : ''}
        `;

        const actions = pinned ? `
            <div class="tt-actions">
                <button class="tt-btn tt-btn--accent" data-action="build" ${!isEnabled ? 'disabled' : ''}>건설</button>
                <button class="tt-btn" data-action="close">닫기</button>
            </div>
        ` : '';

        this.tip.show({
            title: node.name,
            body,
            icon: node.icon,
            pinned,
            actions
        });
        this.tip.move(e);

        if (pinned) {
            const tipEl = this.tip.tip;
            if (tipEl) {
                tipEl.querySelector('[data-action="build"]')?.addEventListener('click', () => {
                    if (isEnabled) {
                        this.props.onBuild(node.id);
                        this.ctx.manager.close();
                    }
                });
                tipEl.querySelector('[data-action="close"]')?.addEventListener('click', () => {
                    this.tip.hide();
                });
            }
        }
    }

    unmount() {
        this.tip.destroy();
        document.removeEventListener('pointerdown', this.onGlobalDown, true);
    }
}
