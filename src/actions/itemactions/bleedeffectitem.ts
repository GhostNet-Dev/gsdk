import { IActionComponent } from "@Glibs/types/actiontypes"

export default class BleedEffectComponent implements IActionComponent {
  id = 'bleed'
  constructor(private chance: number, private damagePerSecond: number) {}

  apply(target: any) {
    if (Math.random() < this.chance) {
      target.applyStatusEffect('bleed', this.damagePerSecond)
    }
  }
}
