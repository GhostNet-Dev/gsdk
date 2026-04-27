import * as THREE from "three"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { ProjectileMsg } from "@Glibs/actors/projectile/projectile"
import { ProjectileDamageType, ProjectileWeaponDef } from "@Glibs/actors/projectile/projectiletypes"

export interface ProjectileWeaponControllerConfig {
  eventEmitter?: (msg: ProjectileMsg) => void
  ownerSpec?: BaseSpec
  ownerObject?: THREE.Object3D
}

export interface ProjectileWeaponFireOptions {
  rangeMultiplier?: number
  damageMultiplier?: number
  cooldownMultiplier?: number
  defaultRange?: number
  defaultHitscan?: boolean
  defaultTracerLife?: number
}

export class ProjectileWeaponController {
  private eventEmitter?: (msg: ProjectileMsg) => void
  private ownerSpec?: BaseSpec
  private ownerObject?: THREE.Object3D
  private cooldownRemaining = 0
  private readonly tmpMuzzleWorld = new THREE.Vector3()
  private readonly tmpShootDirection = new THREE.Vector3()

  configure(config: ProjectileWeaponControllerConfig): void {
    this.eventEmitter = config.eventEmitter
    this.ownerSpec = config.ownerSpec
    this.ownerObject = config.ownerObject
  }

  update(delta: number): void {
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - delta)
  }

  reset(): void {
    this.cooldownRemaining = 0
  }

  getCooldownProgress(weapon?: ProjectileWeaponDef, cooldownMultiplier = 1): number {
    const cooldown = Math.max(0.05, (weapon?.fireCooldownSec ?? 0.45) * cooldownMultiplier)
    return 1 - Math.min(1, this.cooldownRemaining / cooldown)
  }

  getEffectiveRange(weapon?: ProjectileWeaponDef, defaultRange = 1, rangeMultiplier = 1): number {
    return (weapon?.range ?? defaultRange) * rangeMultiplier
  }

  fireAtTarget(
    target: THREE.Object3D,
    weapon: ProjectileWeaponDef | undefined,
    options: ProjectileWeaponFireOptions = {},
  ): boolean {
    if (!weapon || !this.eventEmitter || !this.ownerSpec || !this.ownerObject) return false
    if (this.cooldownRemaining > 0) return false

    const muzzleOffset = weapon.muzzleOffset ?? { x: 0, y: 0.4, z: 2.2 }
    this.tmpMuzzleWorld
      .set(muzzleOffset.x, muzzleOffset.y, muzzleOffset.z)
      .applyQuaternion(this.ownerObject.quaternion)
      .add(this.ownerObject.position)

    this.tmpShootDirection.copy(target.position).sub(this.tmpMuzzleWorld)
    if (this.tmpShootDirection.lengthSq() <= 0.0001) return false
    this.tmpShootDirection.normalize()

    const rangeMultiplier = options.rangeMultiplier ?? 1
    const damageMultiplier = options.damageMultiplier ?? 1
    const cooldownMultiplier = options.cooldownMultiplier ?? 1

    this.eventEmitter({
      id: weapon.id,
      ownerSpec: this.ownerSpec,
      damage: this.ownerSpec.Damage * (weapon.damageMultiplier ?? 1) * damageMultiplier,
      damageType: weapon.damageType ?? ProjectileDamageType.Physical,
      src: this.tmpMuzzleWorld.clone(),
      dir: this.tmpShootDirection.clone(),
      homing: weapon.homing,
      range: this.getEffectiveRange(weapon, options.defaultRange ?? this.ownerSpec.AttackRange, rangeMultiplier),
      hitscan: weapon.hitscan ?? options.defaultHitscan ?? true,
      tracerLife: weapon.tracerLife ?? options.defaultTracerLife ?? 0.18,
      tracerRange: weapon.tracerRange,
      useRaycast: weapon.useRaycast ?? true,
    })

    this.cooldownRemaining = Math.max(0.05, (weapon.fireCooldownSec ?? 0.45) * cooldownMultiplier)
    return true
  }
}
