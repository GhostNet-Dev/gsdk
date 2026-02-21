import * as THREE from "three"
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { ActionDef } from "../actiontypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { createFireballCore, FireballCore } from "@Glibs/magical/libs/fireballcore"
import { isCooldownReady } from "./cooldownhelper"

type ActiveMeteor = {
  core: FireballCore
  start: THREE.Vector3
  end: THREE.Vector3
  elapsed: number
  duration: number
}

type ActiveRingCore = {
  core: FireballCore
  ttl: number
  age: number
}

export class MeteorAction implements IActionComponent, ILoop {
  id = "skill_meteor"
  LoopId = 0

  private cooldown = 7000
  private lastUsed = 0
  private impactDistance = 8
  private fallDuration = 0.65
  private ringRadius = 1.9
  private ringCount = 6

  private activeMeteors: ActiveMeteor[] = []
  private ringCores: ActiveRingCore[] = []

  constructor(
    private eventCtrl: IEventController,
    private scene: THREE.Scene,
    private def: ActionDef,
  ) {
    if (typeof def.cooldown === "number") this.cooldown = def.cooldown * 1000
    if (typeof def.distance === "number") this.impactDistance = Math.max(3, def.distance)
    if (typeof def.fallDuration === "number") this.fallDuration = Math.max(0.2, def.fallDuration)
    if (typeof def.ringRadius === "number") this.ringRadius = Math.max(0.2, def.ringRadius)
    if (typeof def.ringCount === "number") this.ringCount = Math.max(3, Math.floor(def.ringCount))

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  activate(_target: IActionUser, _context?: ActionContext) {}

  trigger(target: IActionUser, triggerType: "onCast", context?: ActionContext) {
    if (triggerType !== "onCast") return

    const now = performance.now()
    if (!isCooldownReady(this.lastUsed, this.cooldown, target, now)) return

    const caster = this.getCasterObject(target)
    if (!caster) return

    const start = new THREE.Vector3()
    const impact = new THREE.Vector3()

    caster.getWorldPosition(impact)
    const forward = this.resolveGroundForward(caster, context)
    impact.addScaledVector(forward, this.impactDistance)
    impact.y += 0.2

    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()
    start.copy(impact)
      .addScaledVector(forward, -5.5)
      .addScaledVector(right, -2.2)
    start.y += 14

    const core = createFireballCore({ scale: 1.45 })
    core.setPosition(start)
    this.scene.add(core.root)

    this.activeMeteors.push({
      core,
      start,
      end: impact,
      elapsed: 0,
      duration: this.fallDuration,
    })

    this.spawnFireballRing(impact)
    this.lastUsed = now
  }

  update(delta: number): void {
    this.activeMeteors = this.activeMeteors.filter((m) => {
      m.elapsed += delta
      const t = Math.min(1, m.elapsed / m.duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const pos = m.start.clone().lerp(m.end, eased)
      m.core.setPosition(pos)
      m.core.update(m.elapsed, delta)

      if (t < 1) return true

      this.scene.remove(m.core.root)
      m.core.dispose()
      return false
    })

    this.ringCores = this.ringCores.filter((entry) => {
      entry.age += delta
      entry.core.update(entry.age, delta)
      const alpha = Math.max(0, 1 - (entry.age / entry.ttl))
      entry.core.root.scale.setScalar(0.65 + alpha * 0.45)

      if (entry.age < entry.ttl) return true

      this.scene.remove(entry.core.root)
      entry.core.dispose()
      return false
    })
  }

  isAvailable(): boolean {
    return performance.now() - this.lastUsed >= this.cooldown
  }

  private spawnFireballRing(center: THREE.Vector3) {
    for (let i = 0; i < this.ringCount; i++) {
      const a = (i / this.ringCount) * Math.PI * 2
      const p = new THREE.Vector3(
        center.x + Math.cos(a) * this.ringRadius,
        center.y + 0.2,
        center.z + Math.sin(a) * this.ringRadius,
      )
      const core = createFireballCore({ scale: 0.6 })
      core.setPosition(p)
      this.scene.add(core.root)
      this.ringCores.push({ core, ttl: 0.55, age: 0 })
    }
  }

  private getCasterObject(target: IActionUser): THREE.Object3D | undefined {
    const obj = target.objs
    if (!obj) return
    if (obj instanceof THREE.Object3D) return obj
    return
  }

  private resolveGroundForward(caster: THREE.Object3D, context?: ActionContext) {
    const fromContext = this.asVector3(context?.direction)
    if (fromContext && fromContext.lengthSq() > 0.000001) {
      const d = fromContext.clone()
      d.y = 0
      if (d.lengthSq() > 0.000001) return d.normalize()
    }

    const forward = new THREE.Vector3()
    caster.getWorldDirection(forward)
    forward.y = 0
    if (forward.lengthSq() < 0.000001) return new THREE.Vector3(0, 0, 1)
    return forward.normalize()
  }

  private asVector3(value: unknown): THREE.Vector3 | undefined {
    if (value instanceof THREE.Vector3) return value
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown } | undefined
    if (!candidate) return
    if (typeof candidate.x !== "number" || typeof candidate.y !== "number" || typeof candidate.z !== "number") return
    return new THREE.Vector3(candidate.x, candidate.y, candidate.z)
  }
}
