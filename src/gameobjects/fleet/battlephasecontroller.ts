import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"
import { FleetManager } from "./fleetmanager"
import { FleetOrder } from "./fleet"

export type BattlePhase = "planning" | "executing" | "resolving"

export type PlannedFleetOrder = {
  fleetId: string
  order: FleetOrder
}

export type BattlePhaseSnapshot = {
  phase: BattlePhase
  elapsed: number
  remaining: number
  duration: number
  pendingOrderCount: number
}

export class BattlePhaseController implements ILoop {
  LoopId = 0

  private phase: BattlePhase = "planning"
  private elapsed = 0
  private readonly plannedOrders = new Map<string, FleetOrder>()

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

  listPlannedOrders(): PlannedFleetOrder[] {
    return [...this.plannedOrders.entries()].map(([fleetId, order]) => ({
      fleetId,
      order,
    }))
  }

  getPlannedOrder(fleetId: string): FleetOrder | undefined {
    return this.plannedOrders.get(fleetId)
  }

  canAcceptOrders() {
    return this.phase === "planning"
  }

  queueFleetOrder(fleetId: string, order: FleetOrder) {
    if (!this.canAcceptOrders()) return false
    this.plannedOrders.set(fleetId, {
      ...order,
      issuedAt: order.issuedAt ?? Date.now(),
      issuer: order.issuer ?? "human",
    })
    return true
  }

  clearPlans() {
    this.plannedOrders.clear()
  }

  clearFleetPlan(fleetId: string) {
    this.plannedOrders.delete(fleetId)
  }

  commitPlans() {
    if (!this.canAcceptOrders() || this.plannedOrders.size === 0) return false

    for (const [fleetId, order] of this.plannedOrders) {
      console.log("[BattlePhase] commit", fleetId, {
        type: order.type,
        point: order.point?.toArray?.(),
        direction: order.direction?.toArray?.(),
        facing: order.facing?.toArray?.(),
      })
      this.fleetManager.issueOrder(fleetId, order)
    }

    this.plannedOrders.clear()
    this.elapsed = 0
    this.phase = "executing"
    this.eventCtrl.SendEventMessage(EventTypes.TimeCtrl, 1)
    return true
  }

  resetToPlanning() {
    this.elapsed = 0
    this.phase = "planning"
    this.eventCtrl.SendEventMessage(EventTypes.TimeCtrl, 0)
  }

  update(delta: number): void {
    if (this.phase !== "executing") return

    this.elapsed += delta
    if (this.elapsed < this.executionWindowSec) return

    console.log("[BattlePhase] execution complete", {
      elapsed: this.elapsed,
      duration: this.executionWindowSec,
    })
    this.phase = "resolving"
    this.eventCtrl.SendEventMessage(EventTypes.TimeCtrl, 0)
    this.elapsed = this.executionWindowSec
    this.phase = "planning"
    this.elapsed = 0
  }
}
