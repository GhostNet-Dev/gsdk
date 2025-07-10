import { IActionComponent } from "@Glibs/types/actiontypes"

export class FireballAction implements IActionComponent {
  id = "fireball"
  private cooldown = 3000
  private lastUsed = 0

  activate(target: any) {
    const now = performance.now()
    if (now - this.lastUsed < this.cooldown) return
    this.lastUsed = now
    console.log("[FireballAction] Hit", target.name)
  }

  isAvailable(): boolean {
    return performance.now() - this.lastUsed >= this.cooldown
  }
}
