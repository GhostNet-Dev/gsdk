import * as THREE from "three"
import { Controllables } from "@Glibs/actors/controllable/controllables"
import { Fleet, FleetConfig, FleetOrder } from "./fleet"
import { FleetFormation } from "./formation"

export class FleetManager {
  private readonly fleets = new Map<string, Fleet>()

  constructor(private readonly controllables: Controllables) {}

  createFleet(id: string, memberIds: string[] = [], config: FleetConfig = {}) {
    const fleet = new Fleet(id, memberIds, config)
    this.fleets.set(id, fleet)
    return fleet
  }

  getFleet(id: string): Fleet | undefined {
    return this.fleets.get(id)
  }

  requireFleet(id: string): Fleet {
    const fleet = this.fleets.get(id)
    if (!fleet) throw new Error(`unknown fleet id: ${id}`)
    return fleet
  }

  deleteFleet(id: string) {
    this.fleets.delete(id)
  }

  listFleets(): Fleet[] {
    return [...this.fleets.values()]
  }

  addMember(fleetId: string, actorId: string) {
    this.requireFleet(fleetId).addMember(actorId)
  }

  addMembers(fleetId: string, actorIds: string[]) {
    this.requireFleet(fleetId).addMembers(actorIds)
  }

  removeMember(fleetId: string, actorId: string) {
    this.requireFleet(fleetId).removeMember(actorId)
  }

  clearFleet(fleetId: string) {
    this.requireFleet(fleetId).clearMembers()
  }

  setFormation(fleetId: string, formation: FleetFormation) {
    this.requireFleet(fleetId).setFormation(formation)
  }

  setSpacing(fleetId: string, spacing: number) {
    this.requireFleet(fleetId).setSpacing(spacing)
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

  followTarget(
    fleetId: string,
    targetId: string,
    options: Omit<FleetOrder, "type" | "targetId"> = {},
  ) {
    return this.issueOrder(fleetId, {
      ...options,
      type: "follow",
      targetId,
    })
  }

  holdPosition(fleetId: string, options: Omit<FleetOrder, "type"> = {}) {
    return this.issueOrder(fleetId, {
      ...options,
      type: "hold",
    })
  }
}
