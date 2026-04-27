import { MonsterId } from "@Glibs/types/monstertypes"

export enum WeaponMode {
  Melee = "melee",
  Ranged = "ranged",
}

export enum ProjectileDamageType {
  Physical = "physical",
  Magic = "magic",
}

export type ProjectileWeaponDef = {
  id: MonsterId
  name?: string
  damageType?: ProjectileDamageType
  damageMultiplier?: number
  homing?: boolean
  range?: number
  hitscan?: boolean
  tracerLife?: number
  tracerRange?: number
  useRaycast?: boolean
  muzzleOffset?: { x: number; y: number; z: number }
  fireCooldownSec?: number
  turnSpeed?: number
  energyCostPerSec?: number
}
