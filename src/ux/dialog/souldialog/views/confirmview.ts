// ============================================================================
// views/ConfirmView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';

const CSS_CONFIRM = css`
  .gnx-confirm{display:grid;gap:8px}
`;

export class ConfirmView implements IDialogView<{ title?: string; body: string; onOk?: () => void; onCancel?: () => void; }> {
    private shell?: any; private cssKey?: string;
    mount(ctx: ViewContext, props: { title?: string; body: string; onOk?: () => void; onCancel?: () => void; }) {
        const title = props.title ?? '확인';
        this.shell = ctx.shell
        ctx.render.setTitle(this.shell, title);
        const host = this.shell.sr;
        this.cssKey = ctx.render.ensureScopedCSS(host, CSS_CONFIRM, 'view:confirm');
        const div = createEl(this.shell.sr, 'div');
        div.className = 'gnx-confirm gnx-text';
        div.innerHTML = props.body;
        this.shell.body.appendChild(div);
        ctx.render.setActions(this.shell, [
            { id: 'cancel', label: '취소', onClick: () => { props.onCancel?.(); ctx.manager.close(); } },
            { id: 'ok', label: '확인', variant: 'accent', onClick: () => { props.onOk?.(); ctx.manager.close(); } },
        ]);
    }
    unmount() { }
}
