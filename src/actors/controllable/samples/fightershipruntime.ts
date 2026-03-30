import * as THREE from "three"
import { ILoop } from "@Glibs/interface/ievent"
import { IControllableRuntime } from "../controllabletypes"

export interface IFighterShipRuntime extends IControllableRuntime {
  moveTo(point: THREE.Vector3): void
  attackTarget(targetId: string): void
  holdPosition(): void
  followTarget(targetId: string): void
  hasArrived(point: THREE.Vector3): boolean
  canAttackTarget(targetId: string): boolean
  useSkill?(skillId: string, payload?: unknown): void
}

export class FighterShipRuntime implements IFighterShipRuntime, ILoop {
  LoopId = 0
  private hull = 100
  private readonly maxHull = 100
  private energy = 100
  private readonly maxEnergy = 100
  private destination?: THREE.Vector3
  private followTargetId?: string
  private attackTargetId?: string
  private hold = false
  private readonly forward = new THREE.Vector3()
  private readonly desired = new THREE.Vector3()

  constructor(
    public readonly id: string,
    readonly mesh: THREE.Object3D,
    private readonly runtimeIndex: Map<string, FighterShipRuntime>,
    private readonly moveSpeed = 18,
  ) {}

  moveTo(point: THREE.Vector3): void {
    this.destination = point.clone()
    this.followTargetId = undefined
    this.attackTargetId = undefined
    this.hold = false
  }

  attackTarget(targetId: string): void {
    this.attackTargetId = targetId
    this.followTargetId = undefined
    this.hold = false
  }

  holdPosition(): void {
    this.destination = undefined
    this.followTargetId = undefined
    this.attackTargetId = undefined
    this.hold = true
  }

  followTarget(targetId: string): void {
    this.followTargetId = targetId
    this.attackTargetId = undefined
    this.hold = false
  }

  hasArrived(point: THREE.Vector3): boolean {
    return this.mesh.position.distanceToSquared(point) < 1
  }

  canAttackTarget(targetId: string): boolean {
    return this.runtimeIndex.has(targetId)
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
    if (this.hold) {
      this.restoreEnergy(delta, 16)
      return
    }

    if (this.attackTargetId) {
      const target = this.runtimeIndex.get(this.attackTargetId)
      if (!target) {
        this.attackTargetId = undefined
        return
      }

      const distSq = this.mesh.position.distanceToSquared(target.mesh.position)
      if (distSq > 14 * 14) {
        this.consumeEnergy(delta, 8)
        this.moveToward(target.mesh.position, delta)
      } else {
        this.consumeEnergy(delta, 12)
        this.face(target.mesh.position)
      }
      return
    }

    if (this.followTargetId) {
      const target = this.runtimeIndex.get(this.followTargetId)
      if (!target) {
        this.followTargetId = undefined
        return
      }
      this.consumeEnergy(delta, 6)
      this.moveToward(target.mesh.position, delta, 7)
      return
    }

    if (this.destination) {
      this.consumeEnergy(delta, 8)
      this.moveToward(this.destination, delta)
      if (this.hasArrived(this.destination)) this.destination = undefined
      return
    }

    this.restoreEnergy(delta, 10)
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
