// ============================================================================
// views/NarrativeView.ts
// ============================================================================
import type { IDialogView, ViewContext } from '../souldlgtypes';
import { createEl, css } from '../dlgstyle';

const CSS_NARR = css`
  .gnx-narr-body{display:grid;gap:8px}
`;

export class NarrativeView implements IDialogView<{ title?: string; body: string }> {
  private shell?: any;
  private cssKey?: string;
  mount(ctx: ViewContext, props: { title?: string; body: string }) {
    const title = props.title ?? '내러티브';
    this.shell = ctx.shell
    ctx.render.setTitle(this.shell, title);
    const host = this.shell.sr;
    this.cssKey = ctx.render.ensureScopedCSS(host, CSS_NARR, 'view:narr');

    const div = createEl(host, 'div');
    div.className = 'gnx-narr-body gnx-text';
    div.innerHTML = props.body;
    this.shell.body.appendChild(div);

    ctx.render.setActions(this.shell, [{ id:'ok', label:'확인', variant:'accent', onClick:()=> ctx.manager.close() }]);
  }
  unmount() {
    if (this.shell && this.cssKey) this.shell && this.shell.sr && this.shell.sr && this.shell;
  }
}
