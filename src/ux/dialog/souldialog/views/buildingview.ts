import { createEl, css, renderIcon } from '../dlgstyle';
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { TechTreeDefBase } from '@Glibs/techtree/techtreedefs';
import { BuildingProperty } from '@Glibs/interactives/building/buildingdefs';

type BuildingViewProps = {
    buildings: TechTreeDefBase[];
    canLevelUp: (id: string) => { ok: boolean; reason?: string };
    onBuild: (id: string) => void;
};

const CSS_BUILDING = css`
  .gnx-build-list { display: grid; gap: 10px; }
  .gnx-build-row {
    display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center;
    border: 1px solid rgba(255,255,255,.1); border-radius: 12px; padding: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.01));
    transition: all 0.2s ease;
  }
  .gnx-build-row:not(.gnx-disabled):hover {
    background: rgba(255,255,255,.08);
    border-color: var(--gnx-ui-accent-weak);
  }
  .gnx-build-row.gnx-disabled {
    opacity: 0.5;
    filter: grayscale(1);
    cursor: not-allowed;
  }
  .gnx-row__icon {
    width: 44px; height: 44px; border-radius: 10px; display: grid; place-items: center;
    background: rgba(255,255,255,.08); font-size: 24px;
  }
  .gnx-build-info { display: flex; flex-direction: column; gap: 2px; }
  .gnx-build-name { font-weight: 700; font-size: 16px; }
  .gnx-build-desc { font-size: 13px; color: var(--gnx-ui-sub); }
  .gnx-build-cost { font-weight: 700; color: var(--gnx-ui-accent); text-align: right; }
  .gnx-build-req { font-size: 11px; color: var(--gnx-ui-sub); margin-top: 4px; }

  .gnx-btn-build {
    appearance: none; border: 1px solid rgba(255,255,255,.2); color: #fff;
    background: var(--gnx-ui-accent); padding: 8px 16px; border-radius: 10px;
    cursor: pointer; font-weight: 700; transition: transform 0.1s;
  }
  .gnx-btn-build:active { transform: scale(0.95); }
  .gnx-disabled .gnx-btn-build { background: #555; border-color: transparent; cursor: not-allowed; }
`;

export class BuildingView implements IDialogView<BuildingViewProps> {
    private shell?: any;
    private ctx!: ViewContext;
    private props!: BuildingViewProps;

    mount(ctx: ViewContext, props: BuildingViewProps) {
        this.ctx = ctx;
        this.props = props;
        this.shell = ctx.shell;

        ctx.render.setTitle(this.shell, '건설 — 기지 확장');
        ctx.render.ensureScopedCSS(this.shell.sr, CSS_BUILDING, 'view:building');

        const doc = (this.shell.sr instanceof ShadowRoot) ? this.shell.sr : document;
        const list = createEl(doc, 'div');
        list.className = 'gnx-build-list';

        props.buildings.forEach(node => {
            const check = props.canLevelUp(node.id);
            const isEnabled = check.ok;
            const prop = node.tech as BuildingProperty;

            const row = createEl(doc, 'div');
            row.className = 'gnx-build-row' + (isEnabled ? '' : ' gnx-disabled');
            
            const costText = node.cost && node.cost[0]?.cost 
                ? Object.entries(node.cost[0].cost).map(([k, v]) => `${k === 'gold' ? '◈' : ''}${v}`).join(', ')
                : '무료';

            row.innerHTML = `
                <div class="gnx-row__icon">${node.icon || '🏗️'}</div>
                <div class="gnx-build-info">
                    <div class="gnx-build-name">${node.name}</div>
                    <div class="gnx-build-desc">${node.desc || ''}</div>
                    ${!isEnabled ? `<div class="gnx-build-req">요구조건: ${check.reason || '잠겨 있음'}</div>` : ''}
                </div>
                <div class="gnx-build-cost">${costText}</div>
            `;

            const buildBtn = createEl(doc, 'button');
            buildBtn.className = 'gnx-btn-build';
            buildBtn.textContent = '건설';
            buildBtn.disabled = !isEnabled;
            buildBtn.onclick = (e) => {
                e.stopPropagation();
                if (isEnabled) {
                    this.props.onBuild(node.id);
                    this.ctx.manager.close();
                }
            };
            row.appendChild(buildBtn);

            if (isEnabled) {
                row.onclick = () => {
                    this.props.onBuild(node.id);
                    this.ctx.manager.close();
                };
            }

            list.appendChild(row);
        });

        this.shell.body.appendChild(list);
        this.ctx.render.setActions(this.shell, [
            { id: 'close', label: '닫기', onClick: () => this.ctx.manager.close() }
        ]);
    }

    unmount() {}
}
