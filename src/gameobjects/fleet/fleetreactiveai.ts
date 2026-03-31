import * as THREE from "three"
import { ILoop } from "@Glibs/interface/ievent"
import { FleetOrder } from "./fleet"
import {
  FleetBattleFleetSnapshot,
  FleetBattleShipSnapshot,
  FleetBattleSnapshot,
  FleetWorld,
} from "./fleetworld"

export type FleetReactiveAiContext = {
  fleet: FleetBattleFleetSnapshot
  allies: FleetBattleFleetSnapshot[]
  enemies: FleetBattleFleetSnapshot[]
  snapshot: FleetBattleSnapshot
}

export type FleetReactiveAiPlanner = (
  context: FleetReactiveAiContext,
) => FleetOrder | undefined

export class FleetReactiveAiController implements ILoop {
  LoopId = 0

  private elapsed = 0
  private readonly lastOrderKeys = new Map<string, string>()

  constructor(
    private readonly world: FleetWorld,
    private readonly planner: FleetReactiveAiPlanner,
    private readonly reactionIntervalSec = 0.8,
  ) {}

  update(delta: number): void {
    this.elapsed += delta
    if (this.elapsed < this.reactionIntervalSec) return
    this.elapsed = 0

    const snapshot = this.world.getBattleSnapshot()
    snapshot.fleets
      .filter((fleet) => fleet.controller === "ai" && fleet.operationalShipCount > 0)
      .forEach((fleet) => {
        const order = this.planner({
          fleet,
          allies: snapshot.fleets.filter((candidate) => candidate.teamId === fleet.teamId && candidate.id !== fleet.id),
          enemies: snapshot.fleets.filter((candidate) => candidate.teamId !== fleet.teamId && candidate.operationalShipCount > 0),
          snapshot,
        })
        if (!order) return

        const nextOrder: FleetOrder = {
          ...order,
          issuer: "ai",
          issuedAt: Date.now(),
        }
        const nextKey = serializeOrder(nextOrder)
        if (this.lastOrderKeys.get(fleet.id) === nextKey) return

        this.world.manager.issueOrder(fleet.id, nextOrder)
        this.lastOrderKeys.set(fleet.id, nextKey)
      })
  }
}

export const defaultReactiveFleetAiPlanner: FleetReactiveAiPlanner = ({ fleet, enemies }) => {
  if (enemies.length === 0 || fleet.operationalShipCount === 0) {
    return { type: "hold", priority: 2 }
  }

  const primaryEnemy = [...enemies]
    .sort((left, right) => {
      const leftDist = fleet.center.distanceToSquared(left.center)
      const rightDist = fleet.center.distanceToSquared(right.center)
      return leftDist - rightDist
    })[0]
  if (!primaryEnemy) return { type: "hold", priority: 2 }

  const averageHullRatio = averageRatio(fleet.ships, (ship) => ship.hullRatio)
  const averageEnergyRatio = averageRatio(fleet.ships, (ship) => ship.energyRatio)
  const toEnemy = primaryEnemy.center.clone().sub(fleet.center)
  const enemyDistance = toEnemy.length()
  const targetShip = selectPriorityTarget(primaryEnemy.ships)

  if (averageEnergyRatio < 0.12) {
    return { type: "hold", priority: 3 }
  }

  if (averageHullRatio < 0.35 && enemyDistance < 40) {
    const retreatDirection = fleet.center.clone().sub(primaryEnemy.center)
    if (retreatDirection.lengthSq() <= 0.0001) retreatDirection.set(0, 0, -1)
    retreatDirection.normalize()
    return {
      type: "move",
      priority: 18,
      point: fleet.center.clone().addScaledVector(retreatDirection, 30),
      direction: retreatDirection,
      facing: retreatDirection.clone(),
      formation: "column",
      spacing: fleet.spacing,
    }
  }

  if (enemyDistance > 26) {
    const approachDirection = toEnemy.lengthSq() > 0.0001
      ? toEnemy.clone().normalize()
      : new THREE.Vector3(0, 0, 1)
    const stagingDistance = Math.max(14, Math.min(22, fleet.spacing * 1.25))
    return {
      type: "move",
      priority: 12,
      point: primaryEnemy.center.clone().addScaledVector(approachDirection, -stagingDistance),
      direction: approachDirection,
      facing: approachDirection.clone(),
      formation: enemyDistance > 54 ? "wedge" : fleet.formation,
      spacing: fleet.spacing,
    }
  }

  if (targetShip) {
    return {
      type: "attack",
      priority: 20,
      targetId: targetShip.id,
    }
  }

  return { type: "hold", priority: 2 }
}

function averageRatio(
  ships: FleetBattleShipSnapshot[],
  pick: (ship: FleetBattleShipSnapshot) => number,
) {
  if (ships.length === 0) return 0
  return ships.reduce((sum, ship) => sum + pick(ship), 0) / ships.length
}

function selectPriorityTarget(ships: FleetBattleShipSnapshot[]) {
  return [...ships]
    .filter((ship) => ship.operational)
    .sort((left, right) => {
      if (left.hullRatio !== right.hullRatio) return left.hullRatio - right.hullRatio
      return left.energyRatio - right.energyRatio
    })[0]
}

function serializeOrder(order: FleetOrder) {
  return JSON.stringify({
    type: order.type,
    targetId: order.targetId ?? null,
    point: roundVec(order.point),
    direction: roundVec(order.direction),
    facing: roundVec(order.facing),
    formation: order.formation ?? null,
    spacing: order.spacing ?? null,
    priority: order.priority ?? null,
  })
}

function roundVec(vector?: THREE.Vector3) {
  if (!vector) return null
  return [round(vector.x), round(vector.y), round(vector.z)]
}

function round(value: number) {
  return Math.round(value * 100) / 100
}
