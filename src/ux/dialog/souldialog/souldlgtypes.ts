// ============================================================================
// core/types.ts — 공용 타입
// ============================================================================
export type DialogType =
  | 'narrative' | 'confirm' | 'cards' | 'shop'
  | 'quest-log' | 'quest-detail'
  | 'inventory' | 'character'
  | 'input' | 'warning' | 'tutorial' | 'scroll' | 'techtree';

export interface DialogDescriptor<TProps = any> {
  id: string;
  type: DialogType;
  props: TProps;
  options?: {
    modal?: boolean; 
    wide?: boolean; 
    title?: string; 
    icon?: string;
    confetti?: 'blast' | 'rain';
  };
}

export interface ActionSpec {
  id: string;
  label: string;
  variant?: 'default'|'accent'|'danger';
  onClick?: () => void;
}

export interface IDialogView<TProps = any> {
  mount(ctx: ViewContext, props: TProps): void;
  update?(props: TProps): void;
  unmount(): void;
}

export interface RendererShell {
  host: HTMLElement;
  sr: Document | ShadowRoot;
  overlay: HTMLElement;
  dlg: HTMLElement;
  body: HTMLElement;
  actions: HTMLElement;
}

export type RendererAPI = {
  openShell(opts: { title: string; wide?: boolean; icon?: string }): RendererShell;
  closeShell(shell: RendererShell): void;
  setActions(shell: RendererShell, actions: ActionSpec[]): void;
  setTheme(name: string): void;
  ensureScopedCSS(host: Document | ShadowRoot, css: string, key?: string): string;
  releaseCSS(host: Document | ShadowRoot, key: string): void;

  setTitle(shell: RendererShell, title: string): void;
  setWide(shell: RendererShell, on: boolean): void;
};

export interface ViewContext {
  manager: import('./dlgmanager').DialogManager;
  render: RendererAPI;
  shell: RendererShell
  events?: any; // IEventController 등 외부 이벤트 버스
}
