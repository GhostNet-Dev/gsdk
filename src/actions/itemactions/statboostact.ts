import { Modifier } from "@Glibs/inventory/stat/modifier"
import { IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { ModifierType, StatKey } from "@Glibs/types/stattypes"
import { ActionContext, ActionDef } from "../actiontypes"

export class StatBoostAction implements IActionComponent {
  id = "statBoost"
  private modifiers: Modifier[] = []

  constructor(
    private def: ActionDef,
    private source = "statBoost",
    private type: ModifierType = "add"  // ← 추가: 'add' or 'mul'
  ) { }

  apply(target: IActionUser, context?: ActionContext) {
    if (!target.baseSpec.stats) return

    if ("stats" in this.def) {
      this.modifiers = Object.entries(this.def.stats).map(([stat, value]) =>
        new Modifier(stat as StatKey, value! as number, this.type, this.source))
     } else {
      const level = context?.level ?? 0
      this.modifiers = Object.entries(this.def.levels[level]).map(([stat, value]) =>
        new Modifier(stat as StatKey, value! as number, this.type, this.source))
    }

    this.modifiers.forEach(m => target.baseSpec.stats!.addModifier(m))
  }

  remove(target: IActionUser) {
    if (!target.baseSpec.stats) return
    target.baseSpec.stats.removeModifierBySource(this.source)
  }
}
