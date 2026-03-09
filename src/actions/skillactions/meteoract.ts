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
  startScale: number
  peakScale: number
  endScale: number
  peakRatio: number
  velocity?: THREE.Vector3
}

export class MeteorAction implements IActionComponent, ILoop {
  id = "skill_meteor"
  LoopId = 0

  private cooldown = 7000
  private lastUsed = 0
  private impactDistance = 8
  private fallDuration = 0.8
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
      .addScaledVector(forward, -8)
      .addScaledVector(right, -3)
    start.y += 25

    const core = createFireballCore({ scale: 1.45 })
    core.reset(start)
    this.scene.add(core.root)

    this.activeMeteors.push({
      core,
      start,
      end: impact,
      elapsed: 0,
      duration: this.fallDuration,
    })

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
      this.spawnImpactEffect(m.end)
      return false
    })

    this.ringCores = this.ringCores.filter((entry) => {
      entry.age += delta
      const t = Math.min(1, entry.age / entry.ttl)

      const scale =
        t < entry.peakRatio
          ? THREE.MathUtils.lerp(entry.startScale, entry.peakScale, t / entry.peakRatio)
          : THREE.MathUtils.lerp(
              entry.peakScale,
              entry.endScale,
              (t - entry.peakRatio) / (1 - entry.peakRatio),
            )
      entry.core.root.scale.setScalar(scale)
      entry.core.setFade(Math.max(0, 1 - Math.pow(t, 1.5)))

      if (entry.velocity) {
        entry.core.root.position.addScaledVector(entry.velocity, delta)
        entry.velocity.y -= 5 * delta
      }

      entry.core.update(entry.age, delta)

      if (t < 1) return true

      this.scene.remove(entry.core.root)
      entry.core.dispose()
      return false
    })
  }

  isAvailable(): boolean {
    return performance.now() - this.lastUsed >= this.cooldown
  }

  private spawnImpactEffect(center: THREE.Vector3) {
    // 1. 중앙 폭발 코어 — 크게 팽창 후 소멸
    this.addRingCore(center.clone(), 2.2, {
      ttl: 0.9,
      startScale: 0.4,
      peakScale: 1.9,
      endScale: 0.05,
      peakRatio: 0.25,
      particleCount: 120,
    })

    // 2. 내부 링
    for (let i = 0; i < this.ringCount; i++) {
      const a = (i / this.ringCount) * Math.PI * 2
      const p = new THREE.Vector3(
        center.x + Math.cos(a) * this.ringRadius,
        center.y + 0.15,
        center.z + Math.sin(a) * this.ringRadius,
      )
      this.addRingCore(p, 0.75, {
        ttl: 0.8 + Math.random() * 0.2,
        startScale: 0.25,
        peakScale: 1.2,
        endScale: 0.05,
        peakRatio: 0.2,
        particleCount: 50,
      })
    }

    // 3. 외부 링 — 더 넓고 느리게 소멸
    const outerCount = Math.round(this.ringCount * 1.8)
    const outerRadius = this.ringRadius * 1.75
    for (let i = 0; i < outerCount; i++) {
      const a = (i / outerCount) * Math.PI * 2 + Math.PI / outerCount
      const p = new THREE.Vector3(
        center.x + Math.cos(a) * outerRadius,
        center.y + 0.1,
        center.z + Math.sin(a) * outerRadius,
      )
      this.addRingCore(p, 0.55, {
        ttl: 1.1 + Math.random() * 0.3,
        startScale: 0.15,
        peakScale: 1.0,
        endScale: 0.05,
        peakRatio: 0.18,
        particleCount: 30,
      })
    }

    // 4. 위로 솟구치는 파편 fireballs
    const debrisCount = 7
    for (let i = 0; i < debrisCount; i++) {
      const hAngle = Math.random() * Math.PI * 2
      const dist = Math.random() * this.ringRadius * 0.5
      const p = new THREE.Vector3(
        center.x + Math.cos(hAngle) * dist,
        center.y + 0.3,
        center.z + Math.sin(hAngle) * dist,
      )
      const speed = 4 + Math.random() * 5
      const vAngle = Math.PI / 5 + Math.random() * (Math.PI / 4)
      const vel = new THREE.Vector3(
        Math.cos(hAngle) * Math.sin(vAngle) * speed,
        Math.cos(vAngle) * speed,
        Math.sin(hAngle) * Math.sin(vAngle) * speed,
      )
      this.addRingCore(p, 0.5, {
        ttl: 0.7 + Math.random() * 0.35,
        startScale: 0.35,
        peakScale: 0.95,
        endScale: 0.05,
        peakRatio: 0.2,
        velocity: vel,
        particleCount: 40,
      })
    }
  }

  private addRingCore(
    position: THREE.Vector3,
    scale: number,
    opts: {
      ttl: number
      startScale: number
      peakScale: number
      endScale: number
      peakRatio: number
      velocity?: THREE.Vector3
      particleCount?: number
    },
  ) {
    const core = createFireballCore({ scale, particleCount: opts.particleCount })
    core.reset(position)
    this.scene.add(core.root)
    this.ringCores.push({
      core,
      ttl: opts.ttl,
      age: 0,
      startScale: opts.startScale,
      peakScale: opts.peakScale,
      endScale: opts.endScale,
      peakRatio: opts.peakRatio,
      velocity: opts.velocity,
    })
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
