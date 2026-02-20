import * as THREE from "three"
import { MonsterId } from "@Glibs/types/monstertypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { ActionDef } from "../actiontypes"

export class FireballAction implements IActionComponent {
  id = "fireball"
  private cooldown = 3000
  private lastUsed = 0

  constructor(private def: ActionDef) {
    if (typeof def.cooldown === "number") {
      this.cooldown = def.cooldown * 1000
    }
  }

  activate(target: IActionUser, context?: ActionContext) {
    const now = performance.now()
    if (now - this.lastUsed < this.cooldown) return

    const source = context?.source
    const eventCtrl = source?.eventCtrl
    const player = source?.player
    const baseSpec = source?.baseSpec ?? target.baseSpec

    if (!eventCtrl || !player || !baseSpec) return

    const level = Math.max(1, context?.level ?? 1)
    const levelDefs = Array.isArray(this.def.levels) ? this.def.levels : []
    const levelStat = levelDefs[Math.min(levelDefs.length - 1, level - 1)]

    const damage = typeof levelStat?.damage === "number" ? levelStat.damage : 10
    const speed = typeof levelStat?.speed === "number" ? levelStat.speed : 10
    const radius = typeof levelStat?.radius === "number" ? levelStat.radius : 1

    const startPos = new THREE.Vector3()
    player.GetMuzzlePosition(startPos)

    const attackDir = new THREE.Vector3()
    player.Meshs.getWorldDirection(attackDir)

    this.lastUsed = now
    eventCtrl.SendEventMessage(EventTypes.Projectile, {
      id: MonsterId.Fireball,
      ownerSpec: baseSpec,
      damage,
      src: startPos,
      dir: attackDir.multiplyScalar(Math.max(0.1, speed / 10)),
      range: Math.max(4, radius * 8),
    })
  }

  isAvailable(): boolean {
    return performance.now() - this.lastUsed >= this.cooldown
  }
}
