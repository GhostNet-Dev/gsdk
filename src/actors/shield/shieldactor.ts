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

export interface ShieldActorOptions extends HexShieldOptions {
  capacity?: number
  maxCapacity?: number
  hitIntensity?: number
  activeOpacity?: number
  brokenOpacity?: number
}

export class ShieldActor implements IDamageInterceptor, ILoop {
  LoopId = 0

  private readonly shield: HexShield
  private currentCapacity: number
  private readonly maxCapacity: number
  private readonly hitIntensity: number
  private readonly activeOpacity: number
  private readonly brokenOpacity: number

  private readonly tmpWorldCenter = new THREE.Vector3()
  private readonly tmpLocalDirection = new THREE.Vector3()
  private readonly tmpHitPoint = new THREE.Vector3()
  private active = true

  constructor(
    private readonly eventCtrl: IEventController,
    private readonly ownerSpec: BaseSpec,
    private readonly ownerObject: THREE.Object3D,
    options: ShieldActorOptions = {},
  ) {
    this.maxCapacity = Math.max(0, options.maxCapacity ?? options.capacity ?? 40)
    this.currentCapacity = Math.max(0, options.capacity ?? this.maxCapacity)
    this.hitIntensity = options.hitIntensity ?? 3.2
    this.activeOpacity = options.activeOpacity ?? options.baseOpacity ?? 1
    this.brokenOpacity = options.brokenOpacity ?? 0

    const radius = options.radius ?? this.resolveRadius(ownerObject)
    this.shield = new HexShield({
      ...options,
      radius,
      baseOpacity: this.currentCapacity > 0 ? this.activeOpacity : this.brokenOpacity,
    })

    this.ownerSpec.AddDamageInterceptor(this)
    this.ownerObject.add(this.shield.getMesh())
    this.shield.getMesh().visible = this.currentCapacity > 0
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  isActive(): boolean {
    return this.active && this.currentCapacity > 0
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
    this.shield.setVisible(this.currentCapacity > 0)
    this.shield.setOpacity(this.currentCapacity > 0 ? this.activeOpacity : this.brokenOpacity)
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

    const absorbedAmount = Math.min(this.currentCapacity, incomingAmount)
    this.currentCapacity = Math.max(0, this.currentCapacity - absorbedAmount)
    this.triggerHit(packet)

    const remainingAmount = Math.max(0, incomingAmount - absorbedAmount)
    const shieldBroken = this.currentCapacity <= 0
    if (shieldBroken) {
      this.shield.setOpacity(this.brokenOpacity)
      this.shield.setVisible(false)
    }

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
    this.shield.update(delta)
  }

  dispose(): void {
    if (!this.active) return
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
