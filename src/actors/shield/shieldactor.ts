import * as THREE from "three"
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import {
  DamageInterceptResult,
  DamagePacket,
  IDamageInterceptor,
} from "@Glibs/actors/battle/damagepacket"
import { HexShield, HexShieldOptions } from "@Glibs/magical/libs/hexshield"
import { IShieldResourcePool } from "./shieldresource"

export interface ShieldActorOptions extends HexShieldOptions {
  capacity?: number
  maxCapacity?: number
  hitIntensity?: number
  activeOpacity?: number
  brokenOpacity?: number
  fallbackPool?: IShieldResourcePool
  regenCooldownSec?: number
}

export class ShieldActor implements IDamageInterceptor, ILoop {
  LoopId = 0

  private readonly shield: HexShield
  private readonly ownerName: string
  private currentCapacity: number
  private readonly maxCapacity: number
  private readonly hitIntensity: number
  private readonly activeOpacity: number
  private readonly brokenOpacity: number
  private readonly fallbackPool?: IShieldResourcePool
  private readonly regenCooldownSec: number

  private readonly tmpWorldCenter = new THREE.Vector3()
  private readonly tmpLocalDirection = new THREE.Vector3()
  private readonly tmpHitPoint = new THREE.Vector3()
  private active = true
  private broken = false
  private regenCooldownRemaining = 0
  private lastVisible?: boolean

  constructor(
    private readonly eventCtrl: IEventController,
    private readonly ownerSpec: BaseSpec,
    private readonly ownerObject: THREE.Object3D,
    options: ShieldActorOptions = {},
  ) {
    this.ownerName = ownerObject.name || ownerSpec.Owner?.name || "unknown"
    this.maxCapacity = Math.max(0, options.maxCapacity ?? options.capacity ?? 40)
    this.currentCapacity = Math.max(0, options.capacity ?? this.maxCapacity)
    this.hitIntensity = options.hitIntensity ?? 3.2
    this.activeOpacity = options.activeOpacity ?? options.baseOpacity ?? 1
    this.brokenOpacity = options.brokenOpacity ?? 0
    this.fallbackPool = options.fallbackPool
    this.regenCooldownSec = Math.max(0, options.regenCooldownSec ?? 0)

    const radius = options.radius ?? this.resolveRadius(ownerObject)
    this.shield = new HexShield({
      ...options,
      radius,
      baseOpacity: this.currentCapacity > 0 ? this.activeOpacity : this.brokenOpacity,
    })

    this.ownerSpec.AddDamageInterceptor(this)
    this.ownerObject.add(this.shield.getMesh())
    this.syncVisualState()
    console.log("[ShieldActor] create", {
      owner: this.ownerName,
      capacity: this.currentCapacity,
      maxCapacity: this.maxCapacity,
      fallback: this.fallbackPool?.kind ?? null,
      fallbackCurrent: this.fallbackPool?.getCurrent?.() ?? null,
    })
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  isActive(): boolean {
    return this.active &&
      !this.broken &&
      (this.currentCapacity > 0 || (this.fallbackPool?.getCurrent() ?? 0) > 0)
  }

  getCapacity(): number {
    return this.currentCapacity
  }

  getMaxCapacity(): number {
    return this.maxCapacity
  }

  restore(amount?: number): void {
    const restoreAmount = amount ?? this.maxCapacity
    this.currentCapacity = Math.min(this.maxCapacity, this.currentCapacity + Math.max(0, restoreAmount))
    this.broken = false
    this.regenCooldownRemaining = 0
    this.syncVisualState()
  }

  absorb(packet: DamagePacket): DamageInterceptResult {
    if (!this.isActive()) {
      return {
        absorbedAmount: 0,
        remainingPacket: packet,
      }
    }

    const incomingAmount = Math.max(0, packet.amount)
    if (incomingAmount <= 0) {
      return {
        absorbedAmount: 0,
        remainingPacket: packet,
      }
    }

    const capacityAbsorbedAmount = Math.min(this.currentCapacity, incomingAmount)
    const capacityBefore = this.currentCapacity
    const fallbackBefore = this.fallbackPool?.getCurrent() ?? 0
    this.currentCapacity = Math.max(0, this.currentCapacity - capacityAbsorbedAmount)

    let remainingAmount = Math.max(0, incomingAmount - capacityAbsorbedAmount)
    const fallbackAbsorbedAmount = remainingAmount > 0
      ? this.fallbackPool?.consume(remainingAmount) ?? 0
      : 0
    remainingAmount = Math.max(0, remainingAmount - fallbackAbsorbedAmount)

    const absorbedAmount = capacityAbsorbedAmount + fallbackAbsorbedAmount
    console.log("[ShieldActor] absorb", {
      owner: this.ownerName,
      incomingAmount,
      capacityBefore,
      capacityAfter: this.currentCapacity,
      fallbackBefore,
      fallbackAfter: this.fallbackPool?.getCurrent() ?? 0,
      capacityAbsorbedAmount,
      fallbackAbsorbedAmount,
      remainingAmount,
      visibleBefore: this.lastVisible,
    })
    if (absorbedAmount > 0) {
      this.triggerHit(packet)
    }

    const shieldBroken = this.currentCapacity <= 0
    if (shieldBroken && (this.fallbackPool?.getCurrent() ?? 0) <= 0) {
      this.enterBrokenState()
    }
    this.syncVisualState()

    return {
      absorbedAmount,
      remainingPacket: {
        ...packet,
        amount: remainingAmount,
      },
      shieldBroken,
    }
  }

  update(delta: number): void {
    if (!this.active) return
    if (this.broken && this.regenCooldownRemaining > 0) {
      this.regenCooldownRemaining = Math.max(0, this.regenCooldownRemaining - delta)
      if (this.regenCooldownRemaining <= 0) {
        this.broken = false
      }
    }
    this.syncVisualState()
    this.shield.update(delta)
  }

  dispose(): void {
    if (!this.active) return
    console.log("[ShieldActor] dispose", {
      owner: this.ownerName,
      capacity: this.currentCapacity,
      fallbackCurrent: this.fallbackPool?.getCurrent?.() ?? null,
    })
    this.active = false
    this.ownerSpec.RemoveDamageInterceptor(this)
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    this.shield.dispose()
  }

  private triggerHit(packet: DamagePacket): void {
    const hitDirection = this.resolveHitDirection(packet)
    this.shield.setVisible(true)
    this.shield.setOpacity(this.activeOpacity)
    this.shield.triggerHit(hitDirection, this.hitIntensity)
  }

  private syncVisualState(): void {
    const visible = !this.broken && (this.currentCapacity > 0 || (this.fallbackPool?.getCurrent() ?? 0) > 0)
    if (this.lastVisible !== visible) {
      console.log("[ShieldActor] visibility-change", {
        owner: this.ownerName,
        visible,
        capacity: this.currentCapacity,
        fallbackCurrent: this.fallbackPool?.getCurrent() ?? 0,
        broken: this.broken,
        regenCooldownRemaining: this.regenCooldownRemaining,
      })
      this.lastVisible = visible
    }
    this.shield.setVisible(visible)
    this.shield.setOpacity(visible ? this.activeOpacity : this.brokenOpacity)
  }

  private enterBrokenState(): void {
    if (this.broken) return
    this.broken = true
    this.regenCooldownRemaining = this.regenCooldownSec
    console.log("[ShieldActor] broken", {
      owner: this.ownerName,
      regenCooldownSec: this.regenCooldownSec,
    })
  }

  private resolveHitDirection(packet: DamagePacket): THREE.Vector3 {
    if (packet.hitPoint) {
      this.tmpHitPoint.copy(packet.hitPoint)
      this.ownerObject.worldToLocal(this.tmpHitPoint)
      this.tmpLocalDirection.copy(this.tmpHitPoint)
      if (this.tmpLocalDirection.lengthSq() > 0.000001) {
        return this.tmpLocalDirection.normalize()
      }
    }

    const sourceObj = packet.sourceSpec?.Owner?.objs
    if (sourceObj) {
      sourceObj.getWorldPosition(this.tmpWorldCenter)
      this.ownerObject.worldToLocal(this.tmpWorldCenter)
      this.tmpLocalDirection.copy(this.tmpWorldCenter)
      if (this.tmpLocalDirection.lengthSq() > 0.000001) {
        return this.tmpLocalDirection.normalize()
      }
    }

    return this.tmpLocalDirection.set(0, 0, 1)
  }

  private resolveRadius(target: THREE.Object3D): number {
    const box = new THREE.Box3().setFromObject(target)
    if (box.isEmpty()) return 1.2
    const size = new THREE.Vector3()
    box.getSize(size)
    return Math.max(size.x, size.y, size.z) * 0.6
  }
}
