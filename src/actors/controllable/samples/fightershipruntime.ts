import * as THREE from "three"
import { ILoop } from "@Glibs/interface/ievent"
import { IControllableRuntime } from "../controllabletypes"
import { MonsterId } from "@Glibs/types/monstertypes"
import { ProjectileMsg } from "@Glibs/actors/projectile/projectile"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { StatKey } from "@Glibs/inventory/stat/stattypes"
import { ShipProjectileDef } from "../controllabletypes"

export interface IFighterShipRuntime extends IControllableRuntime {
  moveTo(point: THREE.Vector3, continueDirection?: THREE.Vector3): void
  moveAlong(direction: THREE.Vector3): void
  attackTarget(targetId: string): void
  holdPosition(): void
  followTarget(targetId: string): void
  hasArrived(point: THREE.Vector3): boolean
  canAttackTarget(targetId: string): boolean
  useSkill?(skillId: string, payload?: unknown): void
  configureCombat(options: FighterShipCombatOptions): void
  receiveDamage(amount: number): void
  getTeamId(): string | undefined
}

type NavigationIntent =
  | { type: "idle" }
  | { type: "hold" }
  | { type: "move"; destination: THREE.Vector3; continueDirection?: THREE.Vector3 }
  | { type: "moveAlong"; direction: THREE.Vector3 }
  | { type: "follow"; targetId: string }

type CombatIntent =
  | { type: "idle" }
  | { type: "attack"; targetId: string }

export type FighterShipCombatOptions = {
  eventEmitter?: (msg: ProjectileMsg) => void
  ownerSpec?: BaseSpec
  teamId?: string
  findNearestEnemy?: (sourceId: string, maxDistance: number) => FighterShipRuntime | undefined
}

export class FighterShipRuntime implements IFighterShipRuntime, ILoop {
  LoopId = 0
  get objs() { return this.mesh }
  private hull: number
  private readonly maxHull: number
  private energy: number
  private readonly maxEnergy: number
  private readonly moveSpeed: number
  private readonly attackRange: number
  private navigationIntent: NavigationIntent = { type: "idle" }
  private combatIntent: CombatIntent = { type: "idle" }
  private readonly forward = new THREE.Vector3()
  private readonly desired = new THREE.Vector3()
  private readonly projectileId: MonsterId
  private readonly muzzleOffset: THREE.Vector3
  private readonly hitscan: boolean
  private readonly tracerLife: number
  private readonly tracerRange?: number
  private readonly useRaycast: boolean
  private readonly tmpMuzzleWorld = new THREE.Vector3()
  private readonly tmpShootDirection = new THREE.Vector3()
  private fireCooldownRemaining = 0
  private readonly fireCooldownSec: number
  private projectileEmitter?: (msg: ProjectileMsg) => void
  private ownerSpec?: BaseSpec
  private teamId?: string
  private findNearestEnemy?: (sourceId: string, maxDistance: number) => FighterShipRuntime | undefined

  constructor(
    public readonly id: string,
    readonly mesh: THREE.Object3D,
    private readonly runtimeIndex: Map<string, FighterShipRuntime>,
    stats: Partial<Record<StatKey, number>> = {},
    projectile: ShipProjectileDef = { id: MonsterId.WarhamerTracer },
  ) {
    this.maxHull = stats.hp ?? 100
    this.hull = this.maxHull
    this.maxEnergy = stats.stamina ?? 100
    this.energy = this.maxEnergy
    this.attackRange = stats.attackRanged ?? 14
    this.moveSpeed = (stats.speed ?? 1.8) * 10

    this.projectileId = projectile.id
    const mo = projectile.muzzleOffset ?? { x: 0, y: 0.4, z: 2.2 }
    this.muzzleOffset = new THREE.Vector3(mo.x, mo.y, mo.z)
    this.hitscan = projectile.hitscan ?? true
    this.tracerLife = projectile.tracerLife ?? 0.18
    this.tracerRange = projectile.tracerRange
    this.useRaycast = projectile.useRaycast ?? true
    this.fireCooldownSec = projectile.fireCooldownSec ?? 0.45
  }

  moveTo(point: THREE.Vector3, continueDirection?: THREE.Vector3): void {
    // console.log("[FighterShipRuntime] moveTo", this.id, point.toArray())
    this.navigationIntent = {
      type: "move",
      destination: point.clone(),
      continueDirection: continueDirection?.clone().normalize(),
    }
  }

  moveAlong(direction: THREE.Vector3): void {
    if (direction.lengthSq() <= 0.0001) return
    // console.log("[FighterShipRuntime] moveAlong", this.id, direction.toArray())
    this.navigationIntent = {
      type: "moveAlong",
      direction: direction.clone().normalize(),
    }
  }

  attackTarget(targetId: string): void {
    this.combatIntent = {
      type: "attack",
      targetId,
    }
  }

  configureCombat(options: FighterShipCombatOptions): void {
    this.projectileEmitter = options.eventEmitter
    this.ownerSpec = options.ownerSpec
    if (this.ownerSpec) this.ownerSpec.lastUsedWeaponMode = "ranged"
    this.teamId = options.teamId
    this.findNearestEnemy = options.findNearestEnemy
  }

  holdPosition(): void {
    this.navigationIntent = { type: "hold" }
  }

  followTarget(targetId: string): void {
    this.navigationIntent = {
      type: "follow",
      targetId,
    }
  }

  hasArrived(point: THREE.Vector3): boolean {
    return this.mesh.position.distanceToSquared(point) < 1
  }

  canAttackTarget(targetId: string): boolean {
    return this.runtimeIndex.has(targetId)
  }

  getTeamId() {
    return this.teamId
  }

  useSkill(skillId: string, payload?: unknown): void {
    void skillId
    void payload
  }

  getHull() {
    return this.hull
  }

  getMaxHull() {
    return this.maxHull
  }

  getHullRatio() {
    return this.maxHull <= 0 ? 0 : this.hull / this.maxHull
  }

  getEnergy() {
    return this.energy
  }

  getMaxEnergy() {
    return this.maxEnergy
  }

  getEnergyRatio() {
    return this.maxEnergy <= 0 ? 0 : this.energy / this.maxEnergy
  }

  update(delta: number): void {
    this.fireCooldownRemaining = Math.max(0, this.fireCooldownRemaining - delta)
    const navigationActive = this.updateNavigation(delta)
    const engaged = this.updateCombat(delta)

    if (navigationActive || engaged) return
    this.restoreEnergy(delta, 10)
  }

  private updateNavigation(delta: number) {
    switch (this.navigationIntent.type) {
      case "hold":
        this.restoreEnergy(delta, 16)
        return false
      case "follow": {
        const target = this.runtimeIndex.get(this.navigationIntent.targetId)
        if (!target) {
          this.navigationIntent = { type: "idle" }
          return false
        }
        this.consumeEnergy(delta, 6)
        this.moveToward(target.mesh.position, delta, 7)
        return true
      }
      case "move":
        this.consumeEnergy(delta, 8)
        this.moveToward(this.navigationIntent.destination, delta)
        if (this.hasArrived(this.navigationIntent.destination)) {
          if (this.navigationIntent.continueDirection && this.navigationIntent.continueDirection.lengthSq() > 0.0001) {
            this.navigationIntent = {
              type: "moveAlong",
              direction: this.navigationIntent.continueDirection.clone(),
            }
          } else {
            this.navigationIntent = { type: "idle" }
          }
        }
        return true
      case "moveAlong":
        this.consumeEnergy(delta, 8)
        this.mesh.position.addScaledVector(this.navigationIntent.direction, this.moveSpeed * delta)
        this.face(this.mesh.position.clone().add(this.navigationIntent.direction))
        return true
      case "idle":
      default:
        return false
    }
  }

  private updateCombat(delta: number) {
    const target = this.resolveCombatTarget()
    if (!target) return false

    const distSq = this.mesh.position.distanceToSquared(target.mesh.position)
    const inRange = distSq <= this.attackRange * this.attackRange
    if (inRange) {
      this.consumeEnergy(delta, 12)
      this.face(target.mesh.position)
      this.fireAtTarget(target)
      return true
    }

    return false
  }

  private resolveCombatTarget() {
    if (this.combatIntent.type === "attack") {
      const designated = this.runtimeIndex.get(this.combatIntent.targetId)
      if (designated) return designated
      this.combatIntent = { type: "idle" }
    }

    return this.findNearestEnemy?.(this.id, this.attackRange)
  }

  private fireAtTarget(target: FighterShipRuntime) {
    if (!this.projectileEmitter || !this.ownerSpec) return
    if (this.fireCooldownRemaining > 0) return
    if (this.energy <= 1) return

    this.tmpMuzzleWorld.copy(this.muzzleOffset).applyQuaternion(this.mesh.quaternion).add(this.mesh.position)
    this.tmpShootDirection.copy(target.mesh.position).sub(this.tmpMuzzleWorld)
    if (this.tmpShootDirection.lengthSq() <= 0.0001) return
    this.tmpShootDirection.normalize()

    this.projectileEmitter({
      id: this.projectileId,
      ownerSpec: this.ownerSpec,
      damage: this.ownerSpec.Damage,
      src: this.tmpMuzzleWorld.clone(),
      dir: this.tmpShootDirection.clone(),
      range: this.attackRange,
      hitscan: this.hitscan,
      tracerLife: this.tracerLife,
      tracerRange: this.tracerRange,
      useRaycast: this.useRaycast,
    })
    this.fireCooldownRemaining = this.fireCooldownSec
  }

  receiveDamage(amount: number): void {
    this.hull = Math.max(0, this.hull - Math.max(0, amount))
    if (this.hull <= 0) {
      this.navigationIntent = { type: "hold" }
      this.combatIntent = { type: "idle" }
    }
  }

  private moveToward(point: THREE.Vector3, delta: number, stopDistance = 0.9) {
    this.desired.copy(point).sub(this.mesh.position)

    if (this.desired.lengthSq() <= stopDistance * stopDistance) return

    this.desired.normalize()
    this.mesh.position.addScaledVector(this.desired, this.moveSpeed * delta)
    this.face(point)
  }

  private face(point: THREE.Vector3) {
    this.forward.copy(point).sub(this.mesh.position)
    if (this.forward.lengthSq() <= 0.0001) return
    this.mesh.lookAt(this.mesh.position.clone().add(this.forward.normalize()))
  }

  private consumeEnergy(delta: number, rate: number) {
    this.energy = Math.max(0, this.energy - (rate * delta))
  }

  private restoreEnergy(delta: number, rate: number) {
    this.energy = Math.min(this.maxEnergy, this.energy + (rate * delta))
  }
}
