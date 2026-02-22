import * as THREE from "three"
import IEventController from "@Glibs/interface/ievent"
import { MonsterId } from "@Glibs/types/monstertypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { ActionDef } from "../actiontypes"
import { isCooldownReady } from "./cooldownhelper"

export class KnifeAction implements IActionComponent {
  id = "skill_knife"
  private cooldown = 1200
  private lastUsed = 0

  constructor(private eventCtrl: IEventController, private def: ActionDef) {
    if (typeof def.cooldown === "number") {
      this.cooldown = def.cooldown * 1000
    }
  }

  activate(_target: IActionUser, _context?: ActionContext) {}

  trigger(target: IActionUser, triggerType: string, context?: ActionContext) {
    if (triggerType !== "onCast") return
    this.castProjectile(target, context)
  }

  private castProjectile(target: IActionUser, context?: ActionContext) {
    const baseSpec = target.baseSpec
    if (!baseSpec) return

    const now = performance.now()
    if (!isCooldownReady(this.lastUsed, this.cooldown, target, now)) return

    const caster = this.getCasterObject(target)
    if (!caster) return

    const level = Math.max(1, context?.level ?? 1)
    const levelDefs = Array.isArray(this.def.levels) ? this.def.levels : []
    const levelStat = levelDefs[Math.min(levelDefs.length - 1, level - 1)]

    const damage = typeof levelStat?.damage === "number" ? levelStat.damage : 8
    const speed = typeof levelStat?.speed === "number" ? levelStat.speed : 16
    const radius = typeof levelStat?.radius === "number" ? levelStat.radius : 0.3
    const projectileCount = Math.max(1, Math.floor(typeof levelStat?.projectileCount === "number" ? levelStat.projectileCount : 1))
    const spreadAngleDeg = typeof levelStat?.spreadAngleDeg === "number" ? Math.max(0, levelStat.spreadAngleDeg) : 0

    const startPos = this.resolveCastOrigin(caster)
    const attackDir = this.resolveDirection(startPos, caster, context)

    const defaultRange = Math.max(10, radius * 40)
    const destination = this.asVector3(context?.destination)
    const range = destination
      ? Math.max(defaultRange, startPos.distanceTo(destination) + radius * 2)
      : defaultRange

    const speedScale = Math.max(0.1, speed / 10)
    const fanDirs = this.buildFanDirections(attackDir, projectileCount, spreadAngleDeg)

    this.lastUsed = now
    fanDirs.forEach((dir) => {
      this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
        id: MonsterId.Knife,
        ownerSpec: baseSpec,
        damage,
        src: startPos.clone(),
        dir: dir.multiplyScalar(speedScale),
        range,
      })
    })
  }

  private buildFanDirections(baseDir: THREE.Vector3, projectileCount: number, spreadAngleDeg: number) {
    if (projectileCount <= 1 || spreadAngleDeg <= 0) return [baseDir.clone().normalize()]

    const axis = new THREE.Vector3(0, 1, 0)
    const normalizedBase = baseDir.clone().normalize()
    const step = spreadAngleDeg / (projectileCount - 1)
    const start = -spreadAngleDeg / 2

    return Array.from({ length: projectileCount }, (_, index) => {
      const angleDeg = start + step * index
      const quat = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(angleDeg))
      return normalizedBase.clone().applyQuaternion(quat).normalize()
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

    // 소켓을 찾지 못한 경우 Fallback 로직: 캐릭터의 높이를 계산하여 중앙에서 발사
    const worldPos = caster.getWorldPosition(new THREE.Vector3())
    const box = new THREE.Box3().setFromObject(caster)

    if (!box.isEmpty()) {
      const center = new THREE.Vector3()
      box.getCenter(center)
      // 캐릭터 발밑이 아닌 몸 중앙 높이를 유지 (최소 지면 위 0.5 높이 보장)
      worldPos.y = Math.max(worldPos.y + 0.5, center.y)
    } else {
      // 박스가 비어있으면(메시 로드 전 등) 기본 1.2 높이 부여
      worldPos.y += 1.2
    }
    
    return worldPos
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
