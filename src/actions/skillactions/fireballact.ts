import * as THREE from "three"
import IEventController from "@Glibs/interface/ievent"
import { MonsterId } from "@Glibs/types/monstertypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { ActionDef } from "../actiontypes"

export class FireballAction implements IActionComponent {
  id = "fireball"
  private cooldown = 3000
  private lastUsed = 0

  constructor(private eventCtrl: IEventController, private def: ActionDef) {
    if (typeof def.cooldown === "number") {
      this.cooldown = def.cooldown * 1000
    }
  }

  activate(_target: IActionUser, _context?: ActionContext) {
    // learn/apply 단계에서 호출될 수 있는 초기화 훅
    // Fireball은 지속 효과가 없어 별도 activate 동작이 필요하지 않습니다.
  }

  trigger(target: IActionUser, triggerType: "onCast", context?: ActionContext) {
    if (triggerType !== "onCast") return
    this.castProjectile(target, context)
  }

  private castProjectile(target: IActionUser, context?: ActionContext) {
    const now = performance.now()
    if (now - this.lastUsed < this.cooldown) return

    const caster = this.getCasterObject(target)
    if (!caster) return

    const baseSpec = target.baseSpec
    if (!baseSpec) return

    const level = Math.max(1, context?.level ?? 1)
    const levelDefs = Array.isArray(this.def.levels) ? this.def.levels : []
    const levelStat = levelDefs[Math.min(levelDefs.length - 1, level - 1)]

    const damage = typeof levelStat?.damage === "number" ? levelStat.damage : 10
    const speed = typeof levelStat?.speed === "number" ? levelStat.speed : 10
    const radius = typeof levelStat?.radius === "number" ? levelStat.radius : 1

    const startPos = this.resolveCastOrigin(caster)

    const attackDir = this.resolveDirection(startPos, caster, context)

    const defaultRange = Math.max(12, radius * 24)
    const destination = this.asVector3(context?.destination)
    const range = destination
      ? Math.max(defaultRange, startPos.distanceTo(destination) + radius * 2)
      : defaultRange

    this.lastUsed = now
    this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
      id: MonsterId.Fireball,
      ownerSpec: baseSpec,
      damage,
      src: startPos,
      dir: attackDir.multiplyScalar(Math.max(0.1, speed / 10)),
      range,
    })
  }

  private resolveCastOrigin(caster: THREE.Object3D): THREE.Vector3 {
    const socketNames = [
      "muzzlePoint",
      "hand_r",
      "RightHand",
      "mixamorigRightHand",
      "mixamorig:RightHand",
      "spine_03",
      "Head",
      "mixamorigHead",
      "mixamorig:Head",
    ]

    for (const socketName of socketNames) {
      const socket = caster.getObjectByName(socketName)
      if (socket) return socket.getWorldPosition(new THREE.Vector3())
    }

    const fallback = caster.getWorldPosition(new THREE.Vector3())
    const box = new THREE.Box3().setFromObject(caster)
    if (!box.isEmpty()) {
      const height = Math.max(0.4, box.max.y - box.min.y)
      fallback.y += height * 0.55
    } else {
      fallback.y += 1.05
    }
    return fallback
  }

  private getCasterObject(target: IActionUser): THREE.Object3D | undefined {
    const obj = target.objs
    if (!obj) return
    if (obj instanceof THREE.Object3D) return obj
    return
  }

  private resolveDirection(startPos: THREE.Vector3, caster: THREE.Object3D, context?: ActionContext) {
    const destination = this.asVector3(context?.destination)
    if (destination) {
      const dirToDestination = destination.clone().sub(startPos)
      if (dirToDestination.lengthSq() > 0.000001) return dirToDestination.normalize()
    }

    const fromContext = this.asVector3(context?.direction)
    if (fromContext && fromContext.lengthSq() > 0.000001) {
      return fromContext.clone().normalize()
    }

    const forward = new THREE.Vector3()
    caster.getWorldDirection(forward)
    return forward.normalize()
  }

  private asVector3(value: unknown): THREE.Vector3 | undefined {
    if (value instanceof THREE.Vector3) return value
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown } | undefined
    if (!candidate) return
    if (typeof candidate.x !== "number" || typeof candidate.y !== "number" || typeof candidate.z !== "number") return
    return new THREE.Vector3(candidate.x, candidate.y, candidate.z)
  }

  isAvailable(): boolean {
    return performance.now() - this.lastUsed >= this.cooldown
  }
}
