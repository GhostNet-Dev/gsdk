import { CurrencyType } from "@Glibs/inventory/wallet";
import { FactionId } from "@Glibs/gameobjects/turntypes";
import {
  GalaxyMapDef,
  GalaxyPlanetAssetKey,
  GalaxyRingTextureKey,
} from "@Glibs/world/galaxy/galaxytypes";

export const StrategicPlanetId = {
  Atlas: "atlas",
  Hephaestus: "hephaestus",
  Eden: "eden",
  Sirius: "sirius",
  Vega: "vega",
  Hades: "hades",
  Athena: "athena",
  Selene: "selene",
  Orion: "orion",
  Nyx: "nyx",
  Helios: "helios",
} as const;

export type StrategicPlanetId = typeof StrategicPlanetId[keyof typeof StrategicPlanetId];

export const StrategicPlanetIds: readonly StrategicPlanetId[] = Object.values(StrategicPlanetId);

export function isStrategicPlanetId(value: unknown): value is StrategicPlanetId {
  return typeof value === "string" && StrategicPlanetIds.includes(value as StrategicPlanetId);
}

export function parseStrategicPlanetId(value: unknown): StrategicPlanetId | undefined {
  return isStrategicPlanetId(value) ? value : undefined;
}

export const StrategicRouteId = {
  AtlasHephaestus: "atlas-hephaestus",
  AtlasAthena: "atlas-athena",
  AtlasEden: "atlas-eden",
  AtlasHades: "atlas-hades",
  HephaestusSelene: "hephaestus-selene",
  SiriusOrion: "sirius-orion",
  SiriusVega: "sirius-vega",
  VegaAthena: "vega-athena",
  EdenVega: "eden-vega",
  HadesNyx: "hades-nyx",
} as const;

export type StrategicRouteId = typeof StrategicRouteId[keyof typeof StrategicRouteId];

export const StrategicRouteIds: readonly StrategicRouteId[] = Object.values(StrategicRouteId);

export function isStrategicRouteId(value: unknown): value is StrategicRouteId {
  return typeof value === "string" && StrategicRouteIds.includes(value as StrategicRouteId);
}

export function parseStrategicRouteId(value: unknown): StrategicRouteId | undefined {
  return isStrategicRouteId(value) ? value : undefined;
}

// ─── 행성 특수 자원 ───────────────────────────────────────────────────────────

export type StrategicPlanetSpecialResourceType =
  | "helium3"
  | "iceCrystal"
  | "rareEarth"
  | "gateInfluence"
  | "darkMatter"
  | "shipyardContract"
  | "bioCrystal"
  | "photonFuel"
  | "gravityOre"
  | "industrialPatent";

export type StrategicPlanetSpecialResourceBag = Partial<
  Record<StrategicPlanetSpecialResourceType, number>
>;

// ─── 행성 정의 ────────────────────────────────────────────────────────────────

export interface StrategicPlanetStats {
  economy: number;
  industry: number;
  defense: number;
  population: number;
  logistics: number;
  marketScale: number;
}

export interface StrategicPlanetDef {
  id: StrategicPlanetId;
  name: string;
  description: string;
  defaultFactionId: FactionId;
  profileId: string;
  routeIds: StrategicRouteId[];
  citySlots: number;
  resourceBias: Partial<Record<CurrencyType, number>>;
  specialResources: StrategicPlanetSpecialResourceType[];
  baseStats: StrategicPlanetStats;
}

export interface GalaxyPlanetVisualDef {
  planetId: StrategicPlanetId;
  radius: number;
  assetKey: GalaxyPlanetAssetKey;
  ring?: {
    textureKey: GalaxyRingTextureKey;
    tiltX?: number;
    tiltY?: number;
  };
  position?: [number, number, number];
}

// ─── 항로 정의 ────────────────────────────────────────────────────────────────

export interface StrategicRouteDef {
  id: StrategicRouteId;
  fromPlanetId: StrategicPlanetId;
  toPlanetId: StrategicPlanetId;
  baseDistance: number;
}

// ─── 행성/항로 상태 ───────────────────────────────────────────────────────────

export interface PlanetMarketState {
  demand: Partial<Record<CurrencyType, number>>;
  supply: Partial<Record<CurrencyType, number>>;
  saturation: Partial<Record<CurrencyType, number>>;
  pricePressure: Partial<Record<CurrencyType, number>>;
}

export interface StrategicPlanetState {
  id: StrategicPlanetId;
  factionInfluence: Partial<Record<FactionId, number>>;
  controllingFactionId?: FactionId;
  contested: boolean;
  cityIds: string[];
  stationedFleetIds: string[];
  specialResources: StrategicPlanetSpecialResourceBag;
  market: PlanetMarketState;
  stability: number;
  blockadeLevel: number;
  lastProcessedTurn: number;
}

export interface StrategicRouteState {
  id: StrategicRouteId;
  fromPlanetId: StrategicPlanetId;
  toPlanetId: StrategicPlanetId;
  distance: number;
  controllingFactionId?: FactionId;
  traffic: number;
  security: number;
  blockadeLevel: number;
  tradeValue: number;
}

// ─── View Model (world/galaxy 렌더링용) ───────────────────────────────────────

export interface GalaxyPlanetViewModel {
  id: StrategicPlanetId;
  name: string;
  factionId: FactionId;
  factionLabel: string;
  economy: number;
  industry: number;
  defense: number;
  population: number;
  resourceLabel: string;
  controllingFactionId?: FactionId;
  contested: boolean;
  influence: Partial<Record<FactionId, number>>;
  fleetStrength: number;
  routeIds: StrategicRouteId[];
  visual: GalaxyPlanetVisualDef;
}

export type StrategicGalaxyMapDef = GalaxyMapDef<StrategicPlanetId, StrategicRouteId>;

export interface StrategicFleetViewModel {
  id: string;
  name: string;
  factionId: FactionId;
  currentPlanetId: StrategicPlanetId;
  targetPlanetId?: StrategicPlanetId;
  mission: string;
  strength: number;
  readiness: number;
  hullRatio: number;
  supply: number;
  etaTurns?: number;
  canReceiveOrders: boolean;
}

export interface StrategicRouteViewModel {
  id: StrategicRouteId;
  fromPlanetId: StrategicPlanetId;
  toPlanetId: StrategicPlanetId;
  traffic: number;
  security: number;
  blockadeLevel: number;
  tradeValue: number;
  passable: boolean;
}

export interface StrategicPlanetCommandViewModel {
  id: string;
  label: string;
  kind: "move" | "attack" | "defend" | "patrol" | "blockade" | "escort" | "reinforce" | "repair";
  enabled: boolean;
  disabledReason?: string;
  preview?: string;
}

export interface StrategicGalaxyLogEntry {
  turn: number;
  source: "planet" | "route" | "fleet" | "faction" | "market";
  message: string;
}

export interface StrategicPlanetDetailViewModel {
  planet: GalaxyPlanetViewModel;
  stability: number;
  blockadeLevel: number;
  influence: Partial<Record<FactionId, number>>;
  stationedFleets: StrategicFleetViewModel[];
  incomingFleets: StrategicFleetViewModel[];
  routes: StrategicRouteViewModel[];
  market: PlanetMarketState;
  recentLogs: StrategicGalaxyLogEntry[];
  availableCommands: StrategicPlanetCommandViewModel[];
}
