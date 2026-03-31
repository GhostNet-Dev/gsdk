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

export type BattlePlanningHook = () => void
export type BattlePhaseChangeListener = (phase: BattlePhase) => void

export class BattlePhaseController implements ILoop {
  LoopId = 0

  private phase: BattlePhase = "planning"
  private elapsed = 0
  private readonly plannedOrders = new Map<string, FleetOrder>()
  private readonly planningHooks = new Set<BattlePlanningHook>()
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

  registerPlanningHook(hook: BattlePlanningHook) {
    this.planningHooks.add(hook)
    return () => {
      this.planningHooks.delete(hook)
    }
  }

  onPhaseChanged(listener: BattlePhaseChangeListener) {
    this.phaseListeners.add(listener)
    return () => {
      this.phaseListeners.delete(listener)
    }
  }

  commitPlans() {
    if (!this.canAcceptOrders()) return false

    this.planningHooks.forEach((hook) => {
      try {
        hook()
      } catch (error) {
        console.error("[BattlePhase] planning hook failed", error)
      }
    })
    if (this.plannedOrders.size === 0) return false

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
    this.setPhase("executing")
    this.eventCtrl.SendEventMessage(EventTypes.TimeCtrl, 1)
    return true
  }

  resetToPlanning() {
    this.elapsed = 0
    this.setPhase("planning")
    this.eventCtrl.SendEventMessage(EventTypes.TimeCtrl, 0)
  }

  stopExecution() {
    if (this.phase !== "executing") return false
    this.clearPlans()
    this.resetToPlanning()
    return true
  }

  update(delta: number): void {
    if (this.phase !== "executing") return

    this.elapsed += delta
    if (this.elapsed < this.executionWindowSec) return

    console.log("[BattlePhase] execution complete", {
      elapsed: this.elapsed,
      duration: this.executionWindowSec,
    })
    this.setPhase("resolving")
    this.elapsed = this.executionWindowSec
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
