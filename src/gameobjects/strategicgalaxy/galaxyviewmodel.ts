import { FactionId } from "@Glibs/gameobjects/turntypes";
import { CurrencyType } from "@Glibs/inventory/wallet";
import { getResourceDisplayName } from "@Glibs/gameobjects/resourcetypes";
import { StrategicFleetState } from "./strategicfleetstate";
import { GalaxyCityViewModel } from "@Glibs/world/galaxy/galaxytypes";
import {
  GalaxyPlanetViewModel,
  GalaxyPlanetVisualDef,
  StrategicPlanetCommandViewModel,
  StrategicFleetViewModel,
  StrategicPlanetDef,
  StrategicPlanetSpecialResourceType,
  StrategicPlanetState,
} from "./strategicgalaxytypes";

const FACTION_LABELS: Record<string, string> = {
  aetherion: "House Aetherion",
  empire: "Empire",
  guild: "Guild",
  neutral: "Neutral",
};

const SPECIAL_RESOURCE_LABELS: Record<StrategicPlanetSpecialResourceType, string> = {
  helium3: "헬륨-3",
  iceCrystal: "빙정",
  rareEarth: "희토류",
  gateInfluence: "관문 영향력",
  darkMatter: "암흑물질",
  shipyardContract: "조선소 계약",
  bioCrystal: "생명수정",
  photonFuel: "광자 연료",
  gravityOre: "중력 광석",
  industrialPatent: "산업 특허",
};

export function buildPlanetViewModel(
  def: StrategicPlanetDef,
  state: StrategicPlanetState,
  visual: GalaxyPlanetVisualDef,
  fleetStrength: number,
  cities: GalaxyCityViewModel[],
  availableCommands: StrategicPlanetCommandViewModel[],
): GalaxyPlanetViewModel {
  const displayFactionId = state.flagFactionId ?? state.controllingFactionId ?? def.defaultFactionId;
  const specialLabels = def.specialResources.join(", ");
  const resourceBonuses = Object.values(CurrencyType)
    .map((type) => {
      const multiplier = def.resourceBias[type];
      if (multiplier === undefined) return undefined;

      const deltaPercent = Math.round((multiplier - 1) * 100);
      return {
        type,
        label: getResourceDisplayName(type),
        multiplier,
        percentText: `${deltaPercent >= 0 ? "+" : ""}${deltaPercent}%`,
      };
    })
    .filter((bonus): bonus is NonNullable<typeof bonus> => bonus !== undefined);
  const specialResources = def.specialResources.map((id) => ({
    id,
    label: SPECIAL_RESOURCE_LABELS[id],
    amount: state.specialResources[id],
  }));
  const marketResources = Object.values(CurrencyType)
    .map((type) => {
      const supply = state.market.supply[type] ?? 0;
      const demand = state.market.demand[type] ?? 0;
      const pricePressure = state.market.pricePressure[type] ?? 0;
      if (supply === 0 && demand === 0 && pricePressure === 0) return undefined;

      const pressurePercent = Math.round(pricePressure * 100);
      return {
        type,
        label: getResourceDisplayName(type),
        supply,
        demand,
        pricePressure,
        pricePressureText: `${pressurePercent >= 0 ? "+" : ""}${pressurePercent}%`,
      };
    })
    .filter((market): market is NonNullable<typeof market> => market !== undefined);

  return {
    id: def.id,
    name: def.name,
    factionId: displayFactionId,
    factionLabel: FACTION_LABELS[displayFactionId] ?? displayFactionId,
    economy: def.baseStats.economy,
    industry: def.baseStats.industry,
    defense: def.baseStats.defense,
    population: def.baseStats.population,
    resourceLabel: specialLabels,
    resourceBonuses,
    specialResources,
    marketResources,
    cities,
    availableCommands,
    cityCount: cities.length,
    stability: state.stability,
    blockadeLevel: state.blockadeLevel,
    flagFactionId: state.flagFactionId,
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
