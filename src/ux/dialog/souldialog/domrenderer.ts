// ============================================================================
// renderers/dom/DomRenderer.ts — Shadow DOM 지원 렌더러 + 위젯 유틸 (Scroll Hints 추가됨)
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
    // 공통 링크 (아이콘·폰트)
    this.styles.ensureLink(document, 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');
    // 문서 루트 테마 1회
    this.styles.ensureGlobal(document, THEMES[this.themeKey], 'theme:root');
  }

  // [수정] openShell 서명에 dismissible 옵션 추가
  openShell({ title, wide, dismissible }: { title: string; wide?: boolean; icon?: string; dismissible?: boolean }): RendererShell {
    const host = document.createElement('div'); host.className = 'gnx-shell-host';
    this.root.appendChild(host);

    syncThemeVarsToHost(host, document.documentElement);

    const sr: Document | ShadowRoot = this.opts.useShadow ? host.attachShadow({ mode: 'open' }) : document;

    // 공통 CSS
    this.styles.ensureGlobal(sr, SHELL_BASE, 'core:shell');
    this.styles.ensureGlobal(sr, WIDGET_BASE, 'core:widgets');
    this.applyThemeTo(sr);

    const overlay = createEl(sr, 'div'); overlay.className = 'gnx-overlay';
    
    // [수정] 외부 클릭이 불가할 때 시각적 피드백(예: cursor: not-allowed) 처리를 위해 속성 추가
    overlay.setAttribute('data-dismissible', String(dismissible ?? true));
    
    const dlg = createEl(sr, 'div'); dlg.className = 'gnx-dialog' + (wide ? ' gnx-dialog--wide' : '');
    
    // 1. 헤더 생성
    const header = createEl(sr, 'div'); header.className = 'gnx-dialog__header';
    const titleEl = createEl(sr, 'div'); titleEl.className = 'gnx-dialog__title'; titleEl.textContent = title;
    
    // 2. 바디 래퍼 & 스크롤 인디케이터 생성
    // (bodyWrap은 relative 포지션을 가져서 absolute 인디케이터의 기준점이 됨)
    const bodyWrap = createEl(sr, 'div'); bodyWrap.className = 'gnx-body-wrap';
    
    // 상단 인디케이터 (▲)
    const hintTop = createEl(sr, 'div'); hintTop.className = 'gnx-scroll-hint top'; 
    hintTop.innerHTML = '<span>▲</span>';
    
    // 실제 스크롤 바디
    const body = createEl(sr, 'div'); body.className = 'gnx-dialog__body';
    
    // 하단 인디케이터 (▼)
    const hintBot = createEl(sr, 'div'); hintBot.className = 'gnx-scroll-hint bottom';
    hintBot.innerHTML = '<span>▼</span>';

    // 조립: Wrap 내부에 [힌트, 바디, 힌트] 배치
    bodyWrap.appendChild(hintTop);
    bodyWrap.appendChild(body);
    bodyWrap.appendChild(hintBot);

    // 3. 액션 바 생성
    const actions = createEl(sr, 'div'); actions.className = 'gnx-dialog__actions';
    
    header.appendChild(titleEl); 
    dlg.appendChild(header); 
    dlg.appendChild(bodyWrap); // * 중요: body 대신 bodyWrap 추가
    dlg.appendChild(actions);
    overlay.appendChild(dlg);

    if (sr instanceof ShadowRoot) sr.appendChild(overlay);
    else this.root.appendChild(overlay);

    // --- 스크롤 감지 로직 ---
    const updateHints = () => {
      const { scrollTop, scrollHeight, clientHeight } = body;
      const threshold = 4; // 오차 허용 범위

      // 상단 힌트: 스크롤이 조금이라도 내려가 있으면 표시
      if (scrollTop > threshold) hintTop.setAttribute('data-visible', 'true');
      else hintTop.removeAttribute('data-visible');

      // 하단 힌트: (전체 높이 - 현재 스크롤 - 화면 높이)가 남아있으면 표시
      if (scrollHeight - scrollTop - clientHeight > threshold) hintBot.setAttribute('data-visible', 'true');
      else hintBot.removeAttribute('data-visible');
    };

    // A. 사용자가 스크롤할 때 체크
    body.addEventListener('scroll', updateHints, { passive: true });

    // B. 컨텐츠 크기가 변경될 때 체크 (이미지 로딩, 동적 컨텐츠 등)
    const ro = new ResizeObserver(() => updateHints());
    ro.observe(body);
    // 자식 요소들이 변경되어 높이가 바뀌는 것도 감지하기 위해 body 관찰로 충분하나
    // 필요하다면 body.firstElementChild 등을 관찰할 수도 있음.
    
    // 초기 실행 (레이아웃 잡힌 직후 힌트 상태 갱신)
    requestAnimationFrame(updateHints);

    // Shell 객체에 observer 참조 저장 (cleanup용, JS 객체 확장)
    const shellObj: any = { host, sr, overlay, dlg, body, actions, _titleEl: titleEl, _dialog: dlg, _ro: ro };

    // 포커스/ESC/바깥클릭 등 초기화
    setTimeout(() => overlay.setAttribute('data-open', 'true'), 0);
    
    // [수정] 원본에 있던 overlay.addEventListener는 dlgmanager.ts에서 전담하여 처리하도록 제거했습니다.

    return shellObj;
  }

  closeShell(shell: RendererShell) {
    // [추가] 리소스 정리 (Observer 해제)
    const anyShell = shell as any;
    if (anyShell._ro) {
      anyShell._ro.disconnect();
    }

    shell.overlay.setAttribute('aria-hidden', 'true');
    shell.overlay.removeAttribute('data-open');
    if (shell.overlay instanceof HTMLElement) shell.overlay.remove();
    shell.host.remove();
  }

  setActions(shell: RendererShell, actions: ActionSpec[]) {
    shell.actions.innerHTML = '';
    actions.forEach(a => {
      const b = createEl(shell.sr, 'button');
      b.type = 'button'; b.className = 'gnx-btn' + (a.variant === 'accent' ? ' gnx-btn--accent' : a.variant === 'danger' ? ' gnx-btn--danger' : '');
      b.textContent = a.label;
      b.addEventListener('click', () => a.onClick?.());
      shell.actions.appendChild(b);
    });
  }

  setTitle(shell: RendererShell, title: string): void {
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