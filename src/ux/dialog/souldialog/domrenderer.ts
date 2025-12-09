// ============================================================================
// renderers/dom/DomRenderer.ts — Shadow DOM 지원 렌더러 + 위젯 유틸
// ============================================================================
import { StyleRegistry, createEl } from './dlgstyle';
import { SHELL_BASE, WIDGET_BASE, THEMES } from './themes';
import type { ActionSpec, RendererAPI, RendererShell } from './souldlgtypes';

export type DomRendererOpts = { useShadow?: boolean; root?: HTMLElement; theme?: keyof typeof THEMES };

export class DomRenderer implements RendererAPI {
  readonly styles = new StyleRegistry();
  private root: HTMLElement;
  private themeKey: keyof typeof THEMES;

  constructor(private opts: DomRendererOpts = {}) {
    this.root = opts.root ?? document.body;
    this.themeKey = opts.theme ?? 'souls';
    // 공통 링크 (아이콘·폰트 필요 시)
    this.styles.ensureLink(document, 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');
    // 문서 루트 테마 1회
    this.styles.ensureGlobal(document, THEMES[this.themeKey], 'theme:root');
  }

  openShell({ title, wide }: { title: string; wide?: boolean; icon?: string }): RendererShell {
    const host = document.createElement('div'); host.className = 'gnx-shell-host';
    this.root.appendChild(host);

    syncThemeVarsToHost(host, document.documentElement);

    const sr: Document | ShadowRoot = this.opts.useShadow ? host.attachShadow({ mode: 'open' }) : document;

    // 공통 CSS
    this.styles.ensureGlobal(sr, SHELL_BASE, 'core:shell');
    this.styles.ensureGlobal(sr, WIDGET_BASE, 'core:widgets');
    this.applyThemeTo(sr);

    const overlay = createEl(sr, 'div'); overlay.className = 'gnx-overlay';
    const dlg = createEl(sr, 'div'); dlg.className = 'gnx-dialog' + (wide ? ' gnx-dialog--wide' : '');
    const header = createEl(sr, 'div'); header.className = 'gnx-dialog__header';
    const titleEl = createEl(sr, 'div'); titleEl.className = 'gnx-dialog__title'; titleEl.textContent = title;
    const body = createEl(sr, 'div'); body.className = 'gnx-dialog__body';
    const actions = createEl(sr, 'div'); actions.className = 'gnx-dialog__actions';
    header.appendChild(titleEl); dlg.appendChild(header); dlg.appendChild(body); dlg.appendChild(actions);
    overlay.appendChild(dlg);

    if (sr instanceof ShadowRoot) sr.appendChild(overlay);
    else this.root.appendChild(overlay);

    // 포커스/ESC/바깥클릭
    setTimeout(() => overlay.setAttribute('data-open', 'true'), 0);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        // 기본: 바깥 클릭 닫기 → DialogManager.close를 통해 닫아야 하므로 noop
      }
    });

    return { host, sr, overlay, dlg, body, actions };
  }

  closeShell(shell: RendererShell) {
    shell.overlay.setAttribute('aria-hidden', 'true');
    shell.overlay.removeAttribute('data-open');
    if (shell.overlay instanceof HTMLElement) shell.overlay.remove();
    shell.host.remove();
  }

  setActions(shell: RendererShell, actions: ActionSpec[]) {
    shell.actions.innerHTML = '';
    const doc = (shell.sr instanceof ShadowRoot) ? shell.sr : document;
    actions.forEach(a => {
      const b = createEl(shell.sr, 'button');
      b.type = 'button'; b.className = 'gnx-btn' + (a.variant === 'accent' ? ' gnx-btn--accent' : a.variant === 'danger' ? ' gnx-btn--danger' : '');
      b.textContent = a.label;
      b.addEventListener('click', () => a.onClick?.());
      shell.actions.appendChild(b);
    });
  }

  setTitle(shell: RendererShell, title: string): void {
    // 생성 시 저장해 둔 title 엘리먼트로 반영
    // @ts-ignore
    const el: HTMLElement | undefined = shell._titleEl;
    if (el) el.textContent = title;
  }

  setWide(shell: RendererShell, on: boolean): void {
    // @ts-ignore
    const dlg: HTMLElement | undefined = shell._dialog;
    if (!dlg) return;
    dlg.classList.toggle('gnx-dialog--wide', !!on);
  }

  setTheme(name: keyof typeof THEMES) {
    this.themeKey = name;
    this.styles.ensureGlobal(document, THEMES[name], 'theme:root');
  }

  ensureScopedCSS(host: Document | ShadowRoot, css: string, key?: string) {
    return this.styles.ensureScoped(host, css, key ?? 'view');
  }

  releaseCSS(host: Document | ShadowRoot, key: string) {
    this.styles.release(host, key);
  }

  private applyThemeTo(host: Document | ShadowRoot) {
    const key = this.themeKey ?? 'souls';
    this.styles.ensureGlobal(host, THEMES[key], 'theme:' + key);
  }
}

// core/themeVars.ts
const THEME_VARS = [
  '--gnx-bg','--gnx-ui-bg','--gnx-ui-bg-strong',
  '--gnx-ui-fg','--gnx-ui-sub',
  '--gnx-ui-accent','--gnx-ui-accent-weak',
  '--gnx-ui-coin',
  '--gnx-radius','--gnx-blur','--gnx-shadow','--gnx-border','--gnx-card-glow',
  '--gnx-rar-common','--gnx-rar-rare','--gnx-rar-epic',
];

/** 문서(root)에서 계산된 CSS 변수를 host(=ShadowRoot의 host)에 복사 */
function syncThemeVarsToHost(host: HTMLElement, root: HTMLElement = document.documentElement) {
  const cs = getComputedStyle(root);
  for (const k of THEME_VARS) {
    const v = cs.getPropertyValue(k);
    if (v) host.style.setProperty(k, v.trim());
  }
}
