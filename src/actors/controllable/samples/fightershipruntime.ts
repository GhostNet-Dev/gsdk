import * as THREE from "three"
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

export class FighterShipRuntime implements IFighterShipRuntime {
  constructor(
    public readonly id: string,
    private readonly runtime: IFighterShipRuntime,
  ) {}

  moveTo(point: THREE.Vector3): void {
    this.runtime.moveTo(point)
  }

  attackTarget(targetId: string): void {
    this.runtime.attackTarget(targetId)
  }

  holdPosition(): void {
    this.runtime.holdPosition()
  }

  followTarget(targetId: string): void {
    this.runtime.followTarget(targetId)
  }

  hasArrived(point: THREE.Vector3): boolean {
    return this.runtime.hasArrived(point)
  }

  canAttackTarget(targetId: string): boolean {
    return this.runtime.canAttackTarget(targetId)
  }

  useSkill(skillId: string, payload?: unknown): void {
    this.runtime.useSkill?.(skillId, payload)
  }
}
