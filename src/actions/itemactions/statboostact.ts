import { IActionComponent } from "@Glibs/types/actiontypes"

export class StatBoostAction implements IActionComponent {
  id = "statBoost"
  constructor(private stats: Record<string, number>) {}

  apply(target: any) {
    target.stats?.applyBonus?.(this.stats)
  }

  remove(target: any) {
    target.stats?.removeBonus?.(this.stats)
  }
}
