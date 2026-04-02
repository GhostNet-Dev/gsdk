import * as THREE from "three"
import { Controllables } from "@Glibs/actors/controllable/controllables"
import { Fleet, FleetConfig, FleetControllerType, FleetMoveMode, FleetOrder } from "./fleet"
import { FleetFormation } from "./formation"

export type FleetSummary = {
  id: string
  name: string
  color?: THREE.ColorRepresentation
  teamId: string
  controller: FleetControllerType
  formation: FleetFormation
  spacing: number
  moveMode: FleetMoveMode
  flagshipId?: string
  memberIds: string[]
  memberCount: number
}

export class FleetManager {
  private readonly fleets = new Map<string, Fleet>()
  private selectedFleetId?: string

  constructor(private readonly controllables: Controllables) {}

  createFleet(id: string, memberIds: string[] = [], config: FleetConfig = {}) {
    const fleet = new Fleet(id, memberIds, config)
    this.fleets.set(id, fleet)
    return fleet
  }

  requireFleet(id: string): Fleet {
    const fleet = this.fleets.get(id)
    if (!fleet) throw new Error(`unknown fleet id: ${id}`)
    return fleet
  }

  listFleets(): Fleet[] {
    return [...this.fleets.values()]
  }

  listFleetSummaries(): FleetSummary[] {
    return this.listFleets().map((fleet) => this.toSummary(fleet))
  }

  getSelectedFleetId() {
    return this.selectedFleetId
  }

  getSelectedFleetSummary(): FleetSummary | undefined {
    if (!this.selectedFleetId) return undefined
    const fleet = this.fleets.get(this.selectedFleetId)
    return fleet ? this.toSummary(fleet) : undefined
  }

  getFleetSummary(fleetId: string): FleetSummary | undefined {
    const fleet = this.fleets.get(fleetId)
    return fleet ? this.toSummary(fleet) : undefined
  }

  findFleetIdByMember(actorId: string) {
    for (const [fleetId, fleet] of this.fleets) {
      if (fleet.hasMember(actorId)) return fleetId
    }
    return undefined
  }

  selectFleet(fleetId: string) {
    if (!this.fleets.has(fleetId)) return undefined
    this.selectedFleetId = fleetId
    return this.getSelectedFleetSummary()
  }

  setFormation(fleetId: string, formation: FleetFormation) {
    this.requireFleet(fleetId).setFormation(formation)
  }

  setSpacing(fleetId: string, spacing: number) {
    this.requireFleet(fleetId).setSpacing(spacing)
  }

  setMoveMode(fleetId: string, moveMode: FleetMoveMode) {
    this.requireFleet(fleetId).setMoveMode(moveMode)
  }

  issueOrder(fleetId: string, order: FleetOrder) {
    const commands = this.requireFleet(fleetId).toCommands(order)
    commands.forEach((command) => this.controllables.issue(command))
    return commands
  }

  moveFleet(
    fleetId: string,
    point: THREE.Vector3,
    options: Omit<FleetOrder, "type" | "point"> = {},
  ) {
    return this.issueOrder(fleetId, {
      ...options,
      type: "move",
      point,
    })
  }

  attackTarget(
    fleetId: string,
    targetId: string,
    options: Omit<FleetOrder, "type" | "targetId"> = {},
  ) {
    return this.issueOrder(fleetId, {
      ...options,
      type: "attack",
      targetId,
    })
  }

  holdPosition(fleetId: string, options: Omit<FleetOrder, "type"> = {}) {
    return this.issueOrder(fleetId, {
      ...options,
      type: "hold",
    })
  }

  private toSummary(fleet: Fleet): FleetSummary {
    const memberIds = fleet.getMembers()
    return {
      id: fleet.id,
      name: fleet.name,
      color: fleet.color,
      teamId: fleet.teamId,
      controller: fleet.controller,
      formation: fleet.getFormation(),
      spacing: fleet.getSpacing(),
      moveMode: fleet.getMoveMode(),
      flagshipId: memberIds[0],
      memberIds,
      memberCount: memberIds.length,
    }
  }
}
