import { Modifier } from "@Glibs/inventory/stat/modifier"
import { IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { ModifierType, StatKey } from "@Glibs/types/stattypes"

export class StatBoostAction implements IActionComponent {
  id = "statBoost"
  private modifiers: Modifier[] = []

  constructor(
    private stats: Partial<Record<StatKey, number>>, 
    private source = "statBoost",
    private type: ModifierType = "add"  // ← 추가: 'add' or 'mul'
  ) { }

  apply(target: IActionUser) {
    if (!target.baseSpec.stats) return

    this.modifiers = Object.entries(this.stats).map(([stat, value]) =>
      new Modifier(stat as StatKey, value!, this.type, this.source)
    )

    this.modifiers.forEach(m => target.baseSpec.stats!.addModifier(m))
  }

  remove(target: IActionUser) {
    if (!target.baseSpec.stats) return
    target.baseSpec.stats.removeModifierBySource(this.source)
  }
}
