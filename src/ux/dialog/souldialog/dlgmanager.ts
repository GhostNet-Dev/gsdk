// ============================================================================
// core/manager.ts — 다이얼로그 스택/수명주기/업데이트
// ============================================================================
import IEventController from '@Glibs/interface/ievent';
import { DialogRegistry } from './dlgregistry';
import { ConfettiSystem } from './effects/confetti';
import type { DialogDescriptor, IDialogView, RendererAPI } from './souldlgtypes';

let IDSEQ = 0;

export class DialogManager {
  readonly registry = new DialogRegistry();
  private renderer: RendererAPI;
  private events?: any;
  // Rain 효과를 유발한 다이얼로그 ID를 추적
  private rainOwnerId: string | null = null;

  private opened: { desc: DialogDescriptor; view: IDialogView; shell: any }[] = [];
  private confetti = new ConfettiSystem(this.eventCtrl);

  constructor(
    private eventCtrl: IEventController,
    opts: { renderer: RendererAPI; events?: any }
  ) {
    this.renderer = opts.renderer;
    this.events = opts.events;
  }

  open<T>(type: DialogDescriptor['type'], props: T, options?: DialogDescriptor['options']) {
    const id = `dlg_${++IDSEQ}`;
    const view = this.registry.create<T>(type);
    const title = options?.title ?? this.titleFor(type);
    const shell = this.renderer.openShell({ title, wide: !!options?.wide, icon: options?.icon });
    (shell.overlay as HTMLElement).setAttribute('data-open','true');
    shell.overlay.addEventListener('click', (e) => {
      if (e.target === shell.overlay) {
        // 기본: 바깥 클릭 닫기 → DialogManager.close를 통해 닫아야 하므로 noop
        this.close()
      }
    })
// Confetti 로직 확장
    if (options?.confetti) {
      if (options.confetti === 'rain') {
        // 지속 효과 시작 + 현재 다이얼로그 ID 기록
        this.confetti.startRain();
        this.rainOwnerId = id;
      } else {
        // 'blast' 또는 true 인 경우: 한 방 터트리기
        this.confetti.blast(150);
      }
    }    
    const desc: DialogDescriptor = { id, type, props, options };
    this.opened.push({ desc, view, shell });

    view.mount({ manager: this, shell: shell, render: this.renderer, events: this.events }, props);
    return id;
  }

  close(id?: string) {
    if (!this.opened.length) return;
    const idx = id ? this.opened.findIndex(x=>x.desc.id===id) : this.opened.length-1;
    if (idx<0) return;
    const { desc, view, shell } = this.opened[idx];

    // 닫히는 다이얼로그가 Rain 효과의 주인이라면 효과 중지
    if (this.rainOwnerId === desc.id) {
      this.confetti.stopRain();
      this.rainOwnerId = null;
    }

    try { view.unmount(); } catch {}
    this.renderer.closeShell(shell);
    this.opened.splice(idx,1);
  }

  closeAll() {
    while (this.opened.length) this.close(this.opened[this.opened.length-1].desc.id);
  }

  updateWhere<T>(type: DialogDescriptor['type'], nextProps: T) {
    this.opened.forEach(o=>{
      if (o.desc.type===type && o.view.update) o.view.update(nextProps);
    });
  }

  private titleFor(type: DialogDescriptor['type']) {
    switch (type) {
      case 'narrative': return '내러티브';
      case 'confirm': return '확인';
      case 'cards': return '선택';
      case 'shop': return '상점';
      case 'quest-log': return '퀘스트 로그';
      case 'quest-detail': return '퀘스트 상세';
      case 'inventory': return '인벤토리';
      case 'character': return '캐릭터';
      case 'input': return '입력';
      case 'warning': return '경고';
      case 'tutorial': return '튜토리얼';
      case 'scroll': return '탐험 기록';
      default: return 'Dialog';
    }
  }
}
