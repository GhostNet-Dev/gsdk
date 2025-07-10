import { ActionDef, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"

export class Buff {
  private remaining?: number

  constructor(
    public id: string,
    public actions: IActionComponent[],
    public defs: ActionDef[],
    public duration?: number // seconds
  ) {
    this.remaining = duration
  }

  applyTo(target: IActionUser) {
    this.defs.forEach((def, i) => {
      if (def.trigger === "onBuffApply") {
        target.applyAction(this.actions[i])
      }
    })
  }

  tick(target: IActionUser, delta: number): boolean {
    if (this.duration != null) {
      this.remaining! -= delta
      if (this.remaining! <= 0) return false
    }

    this.defs.forEach((def, i) => {
      if (def.trigger === "onBuffTick") {
        target.applyAction(this.actions[i])
      }
    })

    return true
  }

  removeFrom(target: IActionUser) {
    this.defs.forEach((def, i) => {
      if (def.trigger === "onBuffRemove") {
        target.applyAction(this.actions[i])
      }
    })
  }
}
