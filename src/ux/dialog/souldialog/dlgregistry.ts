// ============================================================================
// core/registry.ts — 타입별 View 생성기 등록
// ============================================================================
import type { DialogType, IDialogView } from './souldlgtypes';

export class DialogRegistry {
  private map = new Map<DialogType, () => IDialogView<any>>();

  register<T>(type: DialogType, factory: () => IDialogView<T>) {
    this.map.set(type, factory as any);
  }

  create<T>(type: DialogType): IDialogView<T> {
    const f = this.map.get(type);
    if (!f) throw new Error(`View not registered for type: ${type}`);
    return f() as any;
  }
}
