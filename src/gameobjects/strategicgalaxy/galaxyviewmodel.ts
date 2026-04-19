import { FactionId } from "@Glibs/gameobjects/turntypes";
import { StrategicFleetState } from "./strategicfleetstate";
import {
  GalaxyPlanetViewModel,
  GalaxyPlanetVisualDef,
  StrategicFleetViewModel,
  StrategicPlanetDef,
  StrategicPlanetState,
} from "./strategicgalaxytypes";

const FACTION_LABELS: Record<string, string> = {
  alliance: "Alliance",
  empire: "Empire",
  guild: "Guild",
  neutral: "Neutral",
};

export function buildPlanetViewModel(
  def: StrategicPlanetDef,
  state: StrategicPlanetState,
  visual: GalaxyPlanetVisualDef,
  fleetStrength: number,
): GalaxyPlanetViewModel {
  const controllingFactionId = state.controllingFactionId ?? def.defaultFactionId;
  const specialLabels = def.specialResources.join(", ");

  return {
    id: def.id,
    name: def.name,
    factionId: controllingFactionId,
    factionLabel: FACTION_LABELS[controllingFactionId] ?? controllingFactionId,
    economy: def.baseStats.economy,
    industry: def.baseStats.industry,
    defense: def.baseStats.defense,
    population: def.baseStats.population,
    resourceLabel: specialLabels,
    controllingFactionId: state.controllingFactionId,
    contested: state.contested,
    influence: { ...state.factionInfluence },
    fleetStrength,
    routeIds: def.routeIds,
    visual,
  };
}

export function buildFleetViewModel(
  fleet: StrategicFleetState,
  canReceiveOrders: boolean,
): StrategicFleetViewModel {
  return {
    id: fleet.id,
    name: fleet.name ?? fleet.id,
    factionId: fleet.factionId as FactionId,
    currentPlanetId: fleet.currentPlanetId,
    targetPlanetId: fleet.targetPlanetId,
    mission: fleet.mission,
    strength: fleet.strength,
    readiness: fleet.readiness,
    hullRatio: fleet.hullRatio,
    supply: fleet.supply,
    etaTurns: fleet.etaTurns,
    canReceiveOrders,
  };
}
