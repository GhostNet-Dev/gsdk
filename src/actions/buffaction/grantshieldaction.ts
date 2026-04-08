import * as THREE from "three"
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import IEventController from "@Glibs/interface/ievent"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { ShieldActor, ShieldActorOptions } from "@Glibs/actors/shield/shieldactor"
import { ShipEnergyPool } from "@Glibs/actors/shield/shipenergypool"

export interface GrantShieldActionOptions extends ShieldActorOptions {
  capacityPerLevel?: number
  radiusPerLevel?: number
  fallbackResource?: "energy" | "mana" | "stamina"
}

type ShieldAwareUser = IActionUser & {
  __shieldActors?: Map<string, ShieldActor>
  getRuntime?: () => unknown
}

export class GrantShieldAction implements IActionComponent {
  id = "grantshield"

  constructor(
    private readonly eventCtrl: IEventController,
    private readonly options: GrantShieldActionOptions = {},
  ) {}

  activate(target: IActionUser, context?: ActionContext): void {
    const owner = target as ShieldAwareUser
    const obj = target.objs as THREE.Object3D | undefined
    if (!obj) return

    const level = Math.max(0, context?.level ?? 0)
    const capacity = Math.max(
      0,
      (this.options.capacity ?? this.options.maxCapacity ?? 40) +
      (this.options.capacityPerLevel ?? 0) * level,
    )
    const radius = this.options.radius !== undefined
      ? this.options.radius + (this.options.radiusPerLevel ?? 0) * level
      : undefined

    if (!owner.__shieldActors) owner.__shieldActors = new Map()
    const existing = owner.__shieldActors.get(this.id)
    if (existing) {
      existing.restore(capacity)
      return
    }

    owner.__shieldActors.set(this.id, new ShieldActor(
      this.eventCtrl,
      target.baseSpec as BaseSpec,
      obj,
      {
        ...this.options,
        capacity,
        maxCapacity: capacity,
        radius,
        fallbackPool: this.resolveFallbackPool(owner),
      },
    ))
  }

  deactivate(target: IActionUser): void {
    const owner = target as ShieldAwareUser
    const shield = owner.__shieldActors?.get(this.id)
    if (!shield) return
    shield.dispose()
    owner.__shieldActors?.delete(this.id)
  }

  private resolveFallbackPool(target: ShieldAwareUser) {
    if (this.options.fallbackResource !== "energy") return undefined
    const runtime = target.getRuntime?.()
    if (!runtime || !this.isEnergyRuntime(runtime)) return undefined
    return new ShipEnergyPool(runtime)
  }

  private isEnergyRuntime(value: unknown): value is {
    getEnergy(): number
    getMaxEnergy(): number
    consumeEnergyAmount(amount: number): number
  } {
    if (!value || typeof value !== "object") return false
    const candidate = value as Record<string, unknown>
    return (
      typeof candidate.getEnergy === "function" &&
      typeof candidate.getMaxEnergy === "function" &&
      typeof candidate.consumeEnergyAmount === "function"
    )
  }
}
