import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"
import { FleetManager } from "./fleetmanager"
import { FleetOrder, FleetCommandIssuer } from "./fleet"

export enum BattlePhase {
  Planning = "planning",
  Executing = "executing"
}

export type BattlePhaseSnapshot = {
  phase: BattlePhase
  elapsed: number
  remaining: number
  duration: number
  pendingOrderCount: number
}

export type BattlePhaseChangeListener = (phase: BattlePhase) => void

export class BattlePhaseController implements ILoop {
  LoopId = 0

  private phase: BattlePhase = BattlePhase.Planning
  private elapsed = 0
  private readonly plannedOrders = new Map<string, FleetOrder>()
  private readonly phaseListeners = new Set<BattlePhaseChangeListener>()

  constructor(
    private readonly eventCtrl: IEventController,
    private readonly fleetManager: FleetManager,
    private readonly executionWindowSec = 10,
  ) {}

  getSnapshot(): BattlePhaseSnapshot {
    const remaining = Math.max(0, this.executionWindowSec - this.elapsed)
    return {
      phase: this.phase,
      elapsed: this.elapsed,
      remaining,
      duration: this.executionWindowSec,
      pendingOrderCount: this.plannedOrders.size,
    }
  }

  getPlannedOrder(fleetId: string): FleetOrder | undefined {
    return this.plannedOrders.get(fleetId)
  }

  canAcceptOrders() {
    return this.phase === BattlePhase.Planning
  }

  queueFleetOrder(fleetId: string, order: FleetOrder) {
    if (!this.canAcceptOrders()) return false
    this.plannedOrders.set(fleetId, {
      ...order,
      issuedAt: order.issuedAt ?? Date.now(),
      issuer: order.issuer ?? FleetCommandIssuer.Human,
    })
    return true
  }

  clearPlans() {
    this.plannedOrders.clear()
  }

  onPhaseChanged(listener: BattlePhaseChangeListener) {
    this.phaseListeners.add(listener)
    return () => {
      this.phaseListeners.delete(listener)
    }
  }

  commitPlans() {
    if (!this.canAcceptOrders()) return false
    if (this.plannedOrders.size === 0) return false

    for (const [fleetId, order] of this.plannedOrders) {
      // console.log("[BattlePhase] commit", fleetId, {
      //   type: order.type,
      //   point: order.point?.toArray?.(),
      //   direction: order.direction?.toArray?.(),
      //   facing: order.facing?.toArray?.(),
      // })
      this.fleetManager.issueOrder(fleetId, order)
    }

    this.elapsed = 0
    this.setPhase(BattlePhase.Executing)
    this.eventCtrl.SendEventMessage(EventTypes.TimeCtrl, 1)
    return true
  }

  resetToPlanning() {
    this.elapsed = 0
    this.setPhase(BattlePhase.Planning)
    this.eventCtrl.SendEventMessage(EventTypes.TimeCtrl, 0)
  }

  stopExecution() {
    if (this.phase !== BattlePhase.Executing) return false
    this.resetToPlanning()
    return true
  }

  update(delta: number): void {
    if (this.phase !== BattlePhase.Executing) return

    this.elapsed += delta
    if (this.elapsed < this.executionWindowSec) return

    // console.log("[BattlePhase] execution complete", {
    //   elapsed: this.elapsed,
    //   duration: this.executionWindowSec,
    // })
    this.resetToPlanning()
  }

  private setPhase(phase: BattlePhase) {
    if (this.phase === phase) return
    this.phase = phase
    this.phaseListeners.forEach((listener) => {
      try {
        listener(phase)
      } catch (error) {
        console.error("[BattlePhase] phase listener failed", error)
      }
    })
  }
}
