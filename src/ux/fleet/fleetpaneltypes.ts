import { FleetFormation } from "@Glibs/gameobjects/fleet/formation"
import { FleetSummary } from "@Glibs/gameobjects/fleet/fleetmanager"

export type FleetShipPanelState = {
  id: string
  hull: number
  maxHull: number
  hullRatio: number
  energy: number
  maxEnergy: number
  energyRatio: number
  selected: boolean
}

export type FleetPanelController = {
  listFleetSummaries(): FleetSummary[]
  getFleetSummary(fleetId: string): FleetSummary | undefined
  getSelectedFleetSummary(): FleetSummary | undefined
  getFleetShips(fleetId: string): FleetShipPanelState[]
  selectFleet(fleetId: string): FleetSummary | undefined
  focusFleet(fleetId: string): void
  focusShip(shipId: string): void
  setFormation(fleetId: string, formation: FleetFormation): void
  setSpacing(fleetId: string, spacing: number): void
  holdPosition(fleetId: string): unknown
}
