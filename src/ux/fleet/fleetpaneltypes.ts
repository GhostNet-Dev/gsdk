import { FleetFormation } from "@Glibs/gameobjects/fleet/formation"
import { BattlePhaseSnapshot } from "@Glibs/gameobjects/fleet/battlephasecontroller"
import { FleetMoveMode, FleetOrder } from "@Glibs/gameobjects/fleet/fleet"
import { FleetSummary } from "@Glibs/gameobjects/fleet/fleetmanager"

export type FleetShipEnergyFocus = "attack" | "defense" | "navigation" | "exploration"

export type FleetShipPanelState = {
  id: string
  hull: number
  maxHull: number
  hullRatio: number
  energy: number
  maxEnergy: number
  energyRatio: number
  selected: boolean
  isFlagship: boolean
  energyFocus: FleetShipEnergyFocus
  weaponId: string
  isWeaponSwitching: boolean
  availableWeapons: { id: string, label: string }[]
}

export type FleetPanelController = {
  listFleetSummaries(): FleetSummary[]
  getFleetSummary(fleetId: string): FleetSummary | undefined
  getSelectedFleetSummary(): FleetSummary | undefined
  canControlFleet(fleetId: string): boolean
  getFleetShips(fleetId: string): FleetShipPanelState[]
  getBattlePhaseSnapshot(): BattlePhaseSnapshot
  getPlannedOrder(fleetId: string): FleetOrder | undefined
  selectFleet(fleetId: string): FleetSummary | undefined
  focusFleet(fleetId: string): void
  focusShip(shipId: string): void
  setFormation(fleetId: string, formation: FleetFormation): void
  setSpacing(fleetId: string, spacing: number): void
  setMoveMode(fleetId: string, moveMode: FleetMoveMode): void
  setShipEnergyFocus(shipId: string, focus: FleetShipEnergyFocus): void
  setShipWeapon(shipId: string, weaponId: string): void
  planHold(fleetId: string): boolean
  commitPlans(): boolean
  stopExecution(): boolean
  clearPlans(): void
}
