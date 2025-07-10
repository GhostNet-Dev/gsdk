import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"

export class RegenAction implements IActionComponent {
  id = "regen"
  private interval = 1.0
  private lastTick = 0

  constructor(private amount: number) {}

  activate(target: IActionUser, ctx?: ActionContext) {
    const now = performance.now() / 1000
    if (now - this.lastTick >= this.interval) {
      this.lastTick = now
      target.baseSpec.ReceiveCalcHeal?.(this.amount)
      console.log(`[Regen] Restored ${this.amount} HP to ${target.name ?? "Unknown"}`)
    }
  }
}
