import * as THREE from "three"
import { ILoop } from "@Glibs/interface/ievent"
import { IControllableRuntime } from "../controllabletypes"
import { MonsterId } from "@Glibs/types/monstertypes"
import { ProjectileMsg } from "@Glibs/actors/projectile/projectile"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { DamageKind, DamagePacket } from "@Glibs/actors/battle/damagepacket"
import { StatKey } from "@Glibs/inventory/stat/stattypes"
import { ShipProjectileDef } from "../controllabletypes"
import { FleetWeaponDoctrine } from "@Glibs/gameobjects/fleet/fleet"

export interface IFighterShipRuntime extends IControllableRuntime {
  moveTo(point: THREE.Vector3, continueDirection?: THREE.Vector3): void
  moveAlong(direction: THREE.Vector3): void
  attackTarget(targetId: string, payload?: unknown): void
  holdPosition(): void
  followTarget(targetId: string, payload?: unknown): void
  hasArrived(point: THREE.Vector3): boolean
  canAttackTarget(targetId: string): boolean
  useSkill?(skillId: string, payload?: unknown): void
  configureCombat(options: FighterShipCombatOptions): void
  receiveDamage(amount: number): number
  receiveDamage(packet: DamagePacket): number
  getTeamId(): string | undefined
  getFormationReference(out?: THREE.Vector3): THREE.Vector3
}

export enum NavigationType {
  Idle = "idle",
  Hold = "hold",
  Move = "move",
  MoveAlong = "moveAlong",
  Follow = "follow",
  Dead = "dead",
}

export enum CombatType {
  Idle = "idle",
  Attack = "attack",
  Dead = "dead",
}

export enum EngagementType {
  Idle = "idle",
  PursueTarget = "pursue-target",
  FollowShip = "follow-ship",
  Dead = "dead",
}

type NavigationIntent =
  | { type: NavigationType.Idle }
  | { type: NavigationType.Hold }
  | { type: NavigationType.Move; destination: THREE.Vector3; continueDirection?: THREE.Vector3 }
  | { type: NavigationType.MoveAlong; direction: THREE.Vector3 }
  | { type: NavigationType.Follow; targetId: string; offset?: THREE.Vector3; stopDistance?: number }
  | { type: NavigationType.Dead }

type CombatIntent =
  | { type: CombatType.Idle }
  | { type: CombatType.Attack; targetId: string }
  | { type: CombatType.Dead }

type EngagementIntent =
  | { type: EngagementType.Idle }
  | { type: EngagementType.PursueTarget; targetId: string; stopDistance: number }
  | { type: EngagementType.FollowShip; targetId: string; offset?: THREE.Vector3; stopDistance: number }
  | { type: EngagementType.Dead }

export type FighterShipCombatOptions = {
  eventEmitter?: (msg: ProjectileMsg) => void
  ownerSpec?: BaseSpec
  teamId?: string
  findNearestEnemy?: (sourceId: string, maxDistance: number) => FighterShipRuntime | undefined
  onDestroyed?: (shipId: string) => void
  onWeaponSwitchStart?: (shipId: string, weapon: ShipProjectileDef, duration: number) => void
  onWeaponSwitchEnd?: (shipId: string, weapon?: ShipProjectileDef, completed?: boolean) => void
  autoWeaponSwitchEnabled?: boolean
}

export class FighterShipRuntime implements IFighterShipRuntime, ILoop {
  LoopId = 0
  get objs() { return this.collisionObject }
  private hull: number
  private readonly maxHull: number
  private energy: number
  private readonly maxEnergy: number
  private readonly moveSpeed: number
  private readonly attackRange: number
  private readonly turnSpeed: number
  private navigationIntent: NavigationIntent = { type: NavigationType.Idle }
  private combatIntent: CombatIntent = { type: CombatType.Idle }
  private engagementIntent: EngagementIntent = { type: EngagementType.Idle }
  private readonly forward = new THREE.Vector3()
  private readonly desired = new THREE.Vector3()
  private readonly lateral = new THREE.Vector3()
  private readonly vertical = new THREE.Vector3()
  private readonly followTargetPoint = new THREE.Vector3()
  private readonly formationReference = new THREE.Vector3(0, 0, 1)
  private readonly availableWeapons: ShipProjectileDef[]
  private equippedWeapon?: ShipProjectileDef
  private equippedWeaponCooldown = 0
  private switching = false
  private switchElapsed = 0
  private readonly switchDuration: number
  private pendingWeapon?: ShipProjectileDef
  private readonly tmpMuzzleWorld = new THREE.Vector3()
  private readonly tmpShootDirection = new THREE.Vector3()
  private readonly raycaster = new THREE.Raycaster()
  private projectileEmitter?: (msg: ProjectileMsg) => void
  private ownerSpec?: BaseSpec
  private teamId?: string
  private findNearestEnemy?: (sourceId: string, maxDistance: number) => FighterShipRuntime | undefined
  private onDestroyed?: (shipId: string) => void
  private onWeaponSwitchStart?: (shipId: string, weapon: ShipProjectileDef, duration: number) => void
  private onWeaponSwitchEnd?: (shipId: string, weapon?: ShipProjectileDef, completed?: boolean) => void
  private autoWeaponSwitchEnabled = false
  private weaponDoctrine: FleetWeaponDoctrine = "balanced"
  private lastLoggedNavigationState = NavigationType.Idle as string
  private lastLoggedEngagementState = EngagementType.Idle as string
  private lastLoggedCombatState = CombatType.Idle as string

  constructor(
    public readonly id: string,
    readonly mesh: THREE.Object3D,
    private readonly runtimeIndex: Map<string, FighterShipRuntime>,
    private readonly collisionObject: THREE.Object3D = mesh,
    stats: Partial<Record<StatKey, number>> = {},
    weapons: ShipProjectileDef[] = [{ id: MonsterId.WarhamerTracer }],
    weaponSwitchDurationSec = 0,
  ) {
    this.maxHull = stats.hp ?? 100
    this.hull = this.maxHull
    this.maxEnergy = stats.stamina ?? 100
    this.energy = this.maxEnergy
    this.attackRange = stats.attackRange ?? 14
    this.moveSpeed = stats.speed ?? 18
    this.turnSpeed = stats.turnSpeed ?? 1.5

    this.availableWeapons = [...weapons]
    this.equippedWeapon = this.availableWeapons[0]
    this.switchDuration = Math.max(0, weaponSwitchDurationSec)
  }

  moveTo(point: THREE.Vector3, continueDirection?: THREE.Vector3): void {
    if (this.hull <= 0) return
    // console.log("[FighterShipRuntime] moveTo", this.id, point.toArray())
    this.navigationIntent = {
      type: NavigationType.Move,
      destination: point.clone(),
      continueDirection: continueDirection?.clone().normalize(),
    }
  }

  moveAlong(direction: THREE.Vector3): void {
    if (this.hull <= 0) return
    if (direction.lengthSq() <= 0.0001) return
    // console.log("[FighterShipRuntime] moveAlong", this.id, direction.toArray())
    this.navigationIntent = {
      type: NavigationType.MoveAlong,
      direction: direction.clone().normalize(),
    }
  }

  attackTarget(targetId: string, payload?: unknown): void {
    if (this.hull <= 0) return
    this.combatIntent = {
      type: CombatType.Attack,
      targetId,
    }
    const engagement = (payload as {
      engagement?: {
        type: EngagementType.PursueTarget | EngagementType.FollowShip
        targetId: string
        offset?: THREE.Vector3
        stopDistance?: number
      }
      weaponDoctrine?: FleetWeaponDoctrine
    } | undefined)?.engagement
    const weaponDoctrine = (payload as { weaponDoctrine?: FleetWeaponDoctrine } | undefined)?.weaponDoctrine
      ?? (payload as { engagement?: { weaponDoctrine?: FleetWeaponDoctrine } } | undefined)?.engagement?.weaponDoctrine
    if (weaponDoctrine) {
      this.weaponDoctrine = weaponDoctrine
    }
    if (!engagement) return

    if (engagement.type === EngagementType.PursueTarget) {
      this.engagementIntent = {
        type: EngagementType.PursueTarget,
        targetId: engagement.targetId,
        stopDistance: engagement.stopDistance ?? Math.max(4, this.attackRange * 0.75),
      }
      return
    }

    this.engagementIntent = {
      type: EngagementType.FollowShip,
      targetId: engagement.targetId,
      offset: engagement.offset?.clone(),
      stopDistance: engagement.stopDistance ?? Math.max(2, this.attackRange * 0.45),
    }

    console.log("[FighterShipRuntime] attackTarget", {
      id: this.id,
      teamId: this.teamId,
      targetId,
      navigation: this.navigationIntent.type,
      engagement: this.describeEngagementIntent(),
      payload,
    })
  }

  configureCombat(options: FighterShipCombatOptions): void {
    this.projectileEmitter = options.eventEmitter
    this.ownerSpec = options.ownerSpec
    if (this.ownerSpec) {
      this.ownerSpec.lastUsedWeaponMode = "ranged"
      this.ownerSpec.status.health = this.hull
    }
    this.teamId = options.teamId
    this.findNearestEnemy = options.findNearestEnemy
    this.onDestroyed = options.onDestroyed
    this.onWeaponSwitchStart = options.onWeaponSwitchStart
    this.onWeaponSwitchEnd = options.onWeaponSwitchEnd
    this.autoWeaponSwitchEnabled = options.autoWeaponSwitchEnabled ?? false
  }

  holdPosition(): void {
    if (this.hull <= 0) return
    this.navigationIntent = { type: NavigationType.Hold }
    this.engagementIntent = { type: EngagementType.Idle }
    console.log("[FighterShipRuntime] holdPosition", {
      id: this.id,
      teamId: this.teamId,
      combat: this.combatIntent.type,
      engagement: this.describeEngagementIntent(),
      stack: new Error().stack?.split("\n").slice(1, 4),
    })
  }

  followTarget(targetId: string, payload?: unknown): void {
    if (this.hull <= 0) return
    const followPayload = payload as { offset?: THREE.Vector3; stopDistance?: number } | undefined
    this.navigationIntent = {
      type: NavigationType.Follow,
      targetId,
      offset: followPayload?.offset?.clone(),
      stopDistance: followPayload?.stopDistance,
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

  getFormationReference(out: THREE.Vector3 = new THREE.Vector3()) {
    if (this.navigationIntent.type === NavigationType.MoveAlong) {
      return out.copy(this.navigationIntent.direction)
    }
    if (this.navigationIntent.type === NavigationType.Move && this.navigationIntent.continueDirection) {
      return out.copy(this.navigationIntent.continueDirection)
    }

    this.forward.set(0, 0, 1).applyQuaternion(this.mesh.quaternion)
    if (this.forward.lengthSq() <= 0.0001) {
      return out.copy(this.formationReference)
    }
    this.formationReference.copy(this.forward.normalize())
    return out.copy(this.formationReference)
  }

  useSkill(skillId: string, payload?: unknown): void {
    void skillId
    void payload
  }

  getHull() {
    return this.ownerSpec?.Health ?? this.hull
  }

  getMaxHull() {
    return this.ownerSpec?.stats.getStat("hp") ?? this.maxHull
  }

  getHullRatio() {
    const maxHull = this.getMaxHull()
    const hull = this.getHull()
    return maxHull <= 0 ? 0 : hull / maxHull
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

  setWeapon(weapon: ShipProjectileDef) {
    const matchedWeapon = this.availableWeapons.find((candidate) => candidate.id === weapon.id)
    if (!matchedWeapon) return
    if (this.switching && this.pendingWeapon?.id === matchedWeapon.id) return
    if (!this.switching && this.equippedWeapon?.id === matchedWeapon.id) return

    if (this.switchDuration <= 0) {
      this.completeWeaponSwitch(matchedWeapon, true)
      return
    }

    this.pendingWeapon = matchedWeapon
    this.switching = true
    this.switchElapsed = 0
    this.onWeaponSwitchStart?.(this.id, matchedWeapon, this.switchDuration)
  }

  getEquippedWeaponId() {
    return this.equippedWeapon?.id
  }

  getPendingWeaponId() {
    return this.pendingWeapon?.id
  }

  isWeaponSwitching() {
    return this.switching
  }

  update(delta: number): void {
    this.hull = this.getHull()
    if (this.hull <= 0) return
    this.logIntentTransitions()
    this.equippedWeaponCooldown = Math.max(0, this.equippedWeaponCooldown - delta)
    this.updateWeaponSwitch(delta)
    const navigationActive = this.updateNavigation(delta)
    const engaged = this.updateCombat(delta)

    if (navigationActive || engaged) return
    this.restoreEnergy(delta, 10)
  }

  private updateNavigation(delta: number) {
    switch (this.navigationIntent.type) {
      case NavigationType.Hold:
        if (this.engagementIntent.type !== EngagementType.Idle && this.engagementIntent.type !== EngagementType.Dead) {
          console.log("[FighterShipRuntime] hold blocks engagement", {
            id: this.id,
            teamId: this.teamId,
            engagement: this.describeEngagementIntent(),
            combat: this.combatIntent.type,
          })
        }
        this.restoreEnergy(delta, 16)
        return false
      case NavigationType.Follow: {
        const target = this.runtimeIndex.get(this.navigationIntent.targetId)
        if (!target) {
          this.navigationIntent = { type: NavigationType.Idle }
          return false
        }
        this.followTargetPoint.copy(target.mesh.position)
        if (this.navigationIntent.offset && this.navigationIntent.offset.lengthSq() > 0.0001) {
          target.getFormationReference(this.forward)
          this.lateral.crossVectors(new THREE.Vector3(0, 1, 0), this.forward)
          if (this.lateral.lengthSq() <= 0.0001) {
            this.lateral.set(1, 0, 0)
          } else {
            this.lateral.normalize()
          }
          this.vertical.crossVectors(this.forward, this.lateral).normalize()
          this.followTargetPoint
            .addScaledVector(this.lateral, this.navigationIntent.offset.x)
            .addScaledVector(this.vertical, this.navigationIntent.offset.y)
            .addScaledVector(this.forward, this.navigationIntent.offset.z)
        }
        this.moveToward(this.followTargetPoint, delta, this.navigationIntent.stopDistance ?? 7)
        return true
      }
      case NavigationType.Move:
        this.moveToward(this.navigationIntent.destination, delta)
        if (this.hasArrived(this.navigationIntent.destination)) {
          if (this.navigationIntent.continueDirection && this.navigationIntent.continueDirection.lengthSq() > 0.0001) {
            this.navigationIntent = {
              type: NavigationType.MoveAlong,
              direction: this.navigationIntent.continueDirection.clone(),
            }
          } else {
            this.navigationIntent = { type: NavigationType.Idle }
          }
        }
        return true
      case NavigationType.MoveAlong:
        this.mesh.position.addScaledVector(this.navigationIntent.direction, this.moveSpeed * delta)
        this.face(this.mesh.position.clone().add(this.navigationIntent.direction), delta)
        return true
      case NavigationType.Dead:
        return false
      case NavigationType.Idle:
      default:
        return this.updateEngagementNavigation(delta)
    }
  }

  private updateCombat(delta: number) {
    if (this.combatIntent.type === CombatType.Dead) return false
    const target = this.resolveCombatTarget()
    if (!target) return false

    if (this.autoWeaponSwitchEnabled) {
      const desiredWeapon = this.selectDesiredWeapon(target)
      if (desiredWeapon && desiredWeapon.id !== this.equippedWeapon?.id && !this.switching) {
        this.setWeapon(desiredWeapon)
      }
    }

    if (this.switching) {
      return true
    }

    const weaponRange = this.equippedWeapon?.range ?? this.attackRange
    const distSq = this.mesh.position.distanceToSquared(target.mesh.position)
    const inRange = distSq <= weaponRange * weaponRange
    if (inRange) {
      const energyCost = this.equippedWeapon?.energyCostPerSec ?? 12
      this.consumeEnergy(delta, energyCost)
      // Removed face() to prevent ship rotation during attack as requested.
      // The ship should use its guns without turning the whole vessel.
      this.fireAtTarget(target)
      return true
    }

    return false
  }

  private resolveCombatTarget() {
    if (this.combatIntent.type === CombatType.Attack) {
      const designated = this.runtimeIndex.get(this.combatIntent.targetId)
      if (designated && designated.getHull() > 0) return designated
      this.combatIntent = { type: CombatType.Idle }
    }

    return this.findNearestEnemy?.(this.id, this.attackRange)
  }

  private fireAtTarget(target: FighterShipRuntime) {
    if (!this.projectileEmitter || !this.ownerSpec) return
    if (this.energy <= 1) return
    const weapon = this.equippedWeapon
    if (!weapon || this.switching) return

    if (!this.isFiringLaneClear(target)) {
      // console.log(`[FighterShipRuntime] Firing lane blocked for ${this.id}. Skipping fire.`);
      return
    }

    if (this.equippedWeaponCooldown > 0) return

    const muzzleOffset = weapon.muzzleOffset ?? { x: 0, y: 0.4, z: 2.2 }
    this.tmpMuzzleWorld.copy(muzzleOffset as THREE.Vector3).applyQuaternion(this.mesh.quaternion).add(this.mesh.position)
    this.tmpShootDirection.copy(target.mesh.position).sub(this.tmpMuzzleWorld)
    if (this.tmpShootDirection.lengthSq() <= 0.0001) return
    this.tmpShootDirection.normalize()

    this.projectileEmitter({
      id: weapon.id,
      ownerSpec: this.ownerSpec,
      damage: this.ownerSpec.Damage * (weapon.damageMultiplier ?? 1),
      src: this.tmpMuzzleWorld.clone(),
      dir: this.tmpShootDirection.clone(),
      homing: weapon.homing,
      range: weapon.range ?? this.attackRange,
      hitscan: weapon.hitscan ?? true,
      tracerLife: weapon.tracerLife ?? 0.18,
      tracerRange: weapon.tracerRange,
      useRaycast: weapon.useRaycast ?? true,
    })
    this.equippedWeaponCooldown = weapon.fireCooldownSec ?? 0.45
  }

  private isFiringLaneClear(target: FighterShipRuntime): boolean {
    const weapon = this.equippedWeapon
    if (!weapon) return true

    const muzzleOffset = weapon.muzzleOffset ?? { x: 0, y: 0.4, z: 2.2 }
    this.tmpMuzzleWorld
      .copy(muzzleOffset as THREE.Vector3)
      .applyQuaternion(this.mesh.quaternion)
      .add(this.mesh.position)

    this.tmpShootDirection.copy(target.mesh.position).sub(this.tmpMuzzleWorld)
    const distToTarget = this.tmpShootDirection.length()
    if (distToTarget <= 0.0001) return true
    this.tmpShootDirection.normalize()

    this.raycaster.set(this.tmpMuzzleWorld, this.tmpShootDirection)
    this.raycaster.far = distToTarget

    // Check against all ships in the runtime index except self
    const ships: THREE.Object3D[] = []
    this.runtimeIndex.forEach((r) => {
      if (r !== this) {
        ships.push(r.collisionObject)
      }
    })

    const intersects = this.raycaster.intersectObjects(ships, true)

    for (const intersect of intersects) {
      let obj: THREE.Object3D | null = intersect.object
      let hitShip: FighterShipRuntime | undefined
      while (obj) {
        hitShip = this.runtimeIndex.get(obj.name)
        if (hitShip) break
        obj = obj.parent
      }

      if (hitShip && hitShip.getTeamId() === this.getTeamId()) {
        // teammate is in the way
        return false
      }
    }

    return true
  }

  receiveDamage(amount: number): number
  receiveDamage(packet: DamagePacket): number
  receiveDamage(amountOrPacket: number | DamagePacket): number {
    if (this.hull <= 0) return 0

    const packet = typeof amountOrPacket === "number"
      ? { amount: amountOrPacket, kind: "physical" as DamageKind, tags: ["ranged"] }
      : amountOrPacket
    const incomingDamage = Math.max(0, packet.amount)
    if (incomingDamage <= 0) return 0

    const prevHull = this.getHull()
    const resolution = this.ownerSpec
      ? this.ownerSpec.ReceiveDamage(packet)
      : {
          appliedAmount: incomingDamage,
          targetDied: false,
        }

    if (!this.ownerSpec) {
      this.hull = Math.max(0, this.hull - incomingDamage)
    } else {
      this.hull = this.ownerSpec.Health
    }

    const appliedDamage = Math.max(0, prevHull - this.hull)
    if ((this.ownerSpec?.Health ?? this.hull) <= 0 || resolution.targetDied) {
      this.cancelWeaponSwitch()
      this.navigationIntent = { type: NavigationType.Dead }
      this.combatIntent = { type: CombatType.Dead }
      this.engagementIntent = { type: EngagementType.Dead }
      this.onDestroyed?.(this.id)
    }
    return appliedDamage
  }

  private updateEngagementNavigation(delta: number) {
    switch (this.engagementIntent.type) {
      case EngagementType.PursueTarget: {
        const target = this.runtimeIndex.get(this.engagementIntent.targetId)
        if (!target) {
          console.log("[FighterShipRuntime] pursue-target missing target", {
            id: this.id,
            teamId: this.teamId,
            targetId: this.engagementIntent.targetId,
          })
          this.engagementIntent = { type: EngagementType.Idle }
          return false
        }
        console.log("[FighterShipRuntime] pursue-target move", {
          id: this.id,
          teamId: this.teamId,
          targetId: target.id,
          stopDistance: this.engagementIntent.stopDistance,
          distSq: this.mesh.position.distanceToSquared(target.mesh.position),
        })
        this.moveToward(target.mesh.position, delta, this.engagementIntent.stopDistance)
        return true
      }
      case EngagementType.FollowShip: {
        const target = this.runtimeIndex.get(this.engagementIntent.targetId)
        if (!target) {
          console.log("[FighterShipRuntime] follow-ship missing target", {
            id: this.id,
            teamId: this.teamId,
            targetId: this.engagementIntent.targetId,
          })
          this.engagementIntent = { type: EngagementType.Idle }
          return false
        }
        console.log("[FighterShipRuntime] follow-ship move", {
          id: this.id,
          teamId: this.teamId,
          targetId: target.id,
          stopDistance: this.engagementIntent.stopDistance,
          hasOffset: Boolean(this.engagementIntent.offset),
        })
        this.followTargetPoint.copy(target.mesh.position)
        if (this.engagementIntent.offset && this.engagementIntent.offset.lengthSq() > 0.0001) {
          target.getFormationReference(this.forward)
          this.lateral.crossVectors(new THREE.Vector3(0, 1, 0), this.forward)
          if (this.lateral.lengthSq() <= 0.0001) {
            this.lateral.set(1, 0, 0)
          } else {
            this.lateral.normalize()
          }
          this.vertical.crossVectors(this.forward, this.lateral).normalize()
          this.followTargetPoint
            .addScaledVector(this.lateral, this.engagementIntent.offset.x)
            .addScaledVector(this.vertical, this.engagementIntent.offset.y)
            .addScaledVector(this.forward, this.engagementIntent.offset.z)
        }
        this.moveToward(this.followTargetPoint, delta, this.engagementIntent.stopDistance)
        return true
      }
      case EngagementType.Dead:
        return false
      case EngagementType.Idle:
      default:
        return false
    }
  }

  private logIntentTransitions() {
    const navigationState = this.navigationIntent.type
    if (navigationState !== this.lastLoggedNavigationState) {
      this.lastLoggedNavigationState = navigationState
      console.log("[FighterShipRuntime] navigation state", {
        id: this.id,
        teamId: this.teamId,
        navigation: navigationState,
      })
    }

    const combatState = this.combatIntent.type
    if (combatState !== this.lastLoggedCombatState) {
      this.lastLoggedCombatState = combatState
      console.log("[FighterShipRuntime] combat state", {
        id: this.id,
        teamId: this.teamId,
        combat: combatState,
      })
    }

    const engagementState = this.describeEngagementIntent()
    if (engagementState !== this.lastLoggedEngagementState) {
      this.lastLoggedEngagementState = engagementState
      console.log("[FighterShipRuntime] engagement state", {
        id: this.id,
        teamId: this.teamId,
        engagement: engagementState,
      })
    }
  }

  private describeEngagementIntent() {
    switch (this.engagementIntent.type) {
      case EngagementType.PursueTarget:
        return `pursue:${this.engagementIntent.targetId}`
      case EngagementType.FollowShip:
        return `follow:${this.engagementIntent.targetId}`
      case EngagementType.Dead:
        return "dead"
      case EngagementType.Idle:
      default:
        return "idle"
    }
  }

  private updateWeaponSwitch(delta: number) {
    if (!this.switching) return

    this.switchElapsed = Math.min(this.switchDuration, this.switchElapsed + Math.max(delta, 0))
    if (this.switchElapsed < this.switchDuration) return

    this.completeWeaponSwitch(this.pendingWeapon, true)
  }

  private completeWeaponSwitch(weapon?: ShipProjectileDef, completed = false) {
    if (weapon) {
      this.equippedWeapon = weapon
      this.equippedWeaponCooldown = 0
    }
    this.pendingWeapon = undefined
    this.switching = false
    this.switchElapsed = 0
    this.onWeaponSwitchEnd?.(this.id, weapon ?? this.equippedWeapon, completed)
  }

  private cancelWeaponSwitch() {
    if (!this.switching) return
    this.completeWeaponSwitch(undefined, false)
  }

  private selectDesiredWeapon(target: FighterShipRuntime) {
    if (this.availableWeapons.length === 0) return undefined

    const distance = this.mesh.position.distanceTo(target.mesh.position)
    const inRangeWeapons = this.availableWeapons.filter((weapon) => distance <= (weapon.range ?? this.attackRange))
    if (inRangeWeapons.length > 0) {
      return [...inRangeWeapons].sort((left, right) => this.getWeaponScore(right) - this.getWeaponScore(left))[0]
    }

    return [...this.availableWeapons].sort((left, right) => {
      const leftRange = left.range ?? this.attackRange
      const rightRange = right.range ?? this.attackRange
      return rightRange - leftRange
    })[0]
  }

  private getWeaponScore(weapon: ShipProjectileDef) {
    const cooldown = Math.max(weapon.fireCooldownSec ?? 0.45, 0.05)
    const damageMultiplier = weapon.damageMultiplier ?? 1
    const range = weapon.range ?? this.attackRange
    const baseScore = damageMultiplier / cooldown
    switch (this.weaponDoctrine) {
      case "long-range":
        return baseScore + (range * 0.01)
      case "close-assault":
        return baseScore - (range * 0.005)
      case "balanced":
      default:
        return baseScore
    }
  }

  private moveToward(point: THREE.Vector3, delta: number, stopDistance = 0.9) {
    this.desired.copy(point).sub(this.mesh.position)

    if (this.desired.lengthSq() <= stopDistance * stopDistance) return

    // 1. 목표 지점을 향해 부드럽게 기수를 돌림
    this.face(point, delta)

    // 2. 이동은 목표 지점(desired)이 아닌 함선의 현재 정면(forward) 방향으로 수행
    // 이를 통해 선회하는 곡선 경로가 만들어짐
    this.forward.set(0, 0, 1).applyQuaternion(this.mesh.quaternion)
    this.mesh.position.addScaledVector(this.forward, this.moveSpeed * delta)
  }

  private face(point: THREE.Vector3, delta: number) {
    this.forward.copy(point).sub(this.mesh.position).normalize()
    if (this.forward.lengthSq() <= 0.0001) return

    // 목표 방향으로의 회전값 계산 (Z축이 정면인 경우)
    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      this.forward
    )

    // 초당 turnSpeed 라디안만큼 목표 회전값으로 선형 보간 회전
    this.mesh.quaternion.rotateTowards(targetQuaternion, this.turnSpeed * delta)
  }

  private consumeEnergy(delta: number, rate: number) {
    this.energy = Math.max(0, this.energy - (rate * delta))
  }

  private restoreEnergy(delta: number, rate: number) {
    this.energy = Math.min(this.maxEnergy, this.energy + (rate * delta))
  }
}
