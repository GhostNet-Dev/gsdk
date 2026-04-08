import * as THREE from "three"
import { BaseSpec } from "./basespec"

export type DamageKind = "physical" | "magic" | "true"

export interface DamagePacket {
  amount: number
  kind?: DamageKind
  sourceSpec?: BaseSpec
  sourceId?: string
  targetId?: string
  skillId?: string
  actionId?: string
  isCritical?: boolean
  isFixedDamage?: boolean
  tags?: string[]
  hitPoint?: THREE.Vector3
  meta?: Record<string, unknown>
}

export interface DamageResolution {
  incomingAmount: number
  absorbedAmount: number
  appliedAmount: number
  remainingAmount: number
  blocked: boolean
  targetDied: boolean
  shieldBroken?: boolean
}

export interface DamageInterceptResult {
  absorbedAmount: number
  remainingPacket: DamagePacket
  shieldBroken?: boolean
}

export interface IDamageInterceptor {
  isActive(): boolean
  absorb(packet: DamagePacket): DamageInterceptResult
}
