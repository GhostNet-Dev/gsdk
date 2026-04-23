import { CurrencyType } from "@Glibs/inventory/wallet";
import { FactionId, CityScore } from "@Glibs/gameobjects/turntypes";
import {
  StrategicPlanetId,
  StrategicPlanetSpecialResourceBag,
} from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";

export type { CityScore };

// ─── 특수 자원 ────────────────────────────────────────────────────────────────

export type RivalSpecialResourceType =
  | "rareWood"
  | "crystal"
  | "tradeInfluence"
  | "knowledge"
  | "civicTrust";

export type RivalSpecialResourceBag = Partial<Record<RivalSpecialResourceType, number>>;

export type RivalResourceBag = Partial<Record<CurrencyType, number>>;

export const RivalCityDefId = {
  ForestGuild: "forest_guild",
  MountainSyndicate: "mountain_syndicate",
  HarborLeague: "harbor_league",
  ScholarEnclave: "scholar_enclave",
  FrontierCommune: "frontier_commune",
  NativeEnclave: "native_enclave",
} as const;

export type RivalCityDefId = typeof RivalCityDefId[keyof typeof RivalCityDefId];

export const RivalCityDefIds: readonly RivalCityDefId[] = Object.values(RivalCityDefId);

export function isRivalCityDefId(value: unknown): value is RivalCityDefId {
  return typeof value === "string" && RivalCityDefIds.includes(value as RivalCityDefId);
}

export function parseRivalCityDefId(value: unknown): RivalCityDefId | undefined {
  return isRivalCityDefId(value) ? value : undefined;
}

// ─── 도시 성향 ────────────────────────────────────────────────────────────────

export type RivalArchetypeId =
  | "forest"
  | "mountain"
  | "harbor"
  | "scholar"
  | "frontier"
  | "native";

export type RivalStrategyId =
  | "expand"
  | "consolidate"
  | "landmark"
  | "research"
  | "trade";

export interface RivalScoreWeights {
  production: number;
  economy: number;
  population: number;
  research: number;
  prestige: number;
}

export interface RivalArchetype {
  id: RivalArchetypeId;
  name: string;
  description: string;
  preferredBuildings: string[];
  avoidedBuildings?: string[];
  resourceBias: RivalResourceBag;
  specialResourceBias?: Partial<Record<RivalSpecialResourceType, number>>;
  policyWeights: Partial<Record<RivalPolicyId, number>>;
  scoreWeights: RivalScoreWeights;
}

// ─── 정책 ─────────────────────────────────────────────────────────────────────

export type RivalPolicyId =
  | "resourceExpansion"
  | "housingBoom"
  | "industrialFocus"
  | "marketDominance"
  | "researchInvestment"
  | "landmarkRace"
  | "defensiveFortification";

export interface RivalPolicyRequirement {
  minBuildings?: Record<string, number>;
  minResources?: RivalResourceBag;
  minTurn?: number;
}

export interface RivalPolicyEffect {
  kind: "resourceMultiplier" | "buildPreference" | "specialResourceBonus" | "scoreWeight";
  target: string;
  value: number;
}

export interface RivalPolicyDef {
  id: RivalPolicyId;
  name: string;
  durationTurns: number;
  requirements?: RivalPolicyRequirement;
  effects: RivalPolicyEffect[];
}

export interface RivalPolicyState {
  policyId: RivalPolicyId;
  startTurn: number;
  remainingTurns: number;
}

// ─── 도시 정의 ────────────────────────────────────────────────────────────────

export interface RivalCityDef {
  id: RivalCityDefId;
  name: string;
  desc: string;
  archetype: RivalArchetypeId;
  startingResources: RivalResourceBag;
  startingSpecialResources?: RivalSpecialResourceBag;
  startingBuildings: string[];
  openingBuildOrder?: string[];
  preferredBuildings: string[];
  avoidedBuildings?: string[];
  resourceBias: RivalResourceBag;
  specialResourceBias?: Partial<Record<RivalSpecialResourceType, number>>;
  policyWeights: Partial<Record<RivalPolicyId, number>>;
  scoreWeights: RivalScoreWeights;
}

// ─── 도시 배치 seed ───────────────────────────────────────────────────────────

export interface RivalCitySeed {
  id: string;
  cityDefId: RivalCityDefId;
  planetId: StrategicPlanetId;
  factionId: FactionId;
  name?: string;
  initialRank?: number;
  startingInfluence?: number;
}

// ─── 저장 가능한 상태 ─────────────────────────────────────────────────────────

export interface RivalBuildingState {
  id: string;
  buildingId: string;
  level: number;
  builtTurn: number;
}

export interface RivalBuildTask {
  id: string;
  buildingId: string;
  remainingTurns: number;
  source: "planned" | "policy" | "event";
}

export interface RivalTraitState {
  id: string;
  active: boolean;
  activatedTurn: number;
}

export interface RivalScore {
  total: number;
  economy: number;
  production: number;
  population: number;
  research: number;
  prestige: number;
  localInfluence: number;
  galacticInfluence: number;
}

export interface RivalCityState {
  id: string;
  name: string;
  status: "active" | "bankrupt" | "assimilated";
  cityDefId: RivalCityDefId;
  planetId: StrategicPlanetId;
  factionId: FactionId;
  archetypeId: RivalArchetypeId;
  strategy: RivalStrategyId;
  turn: number;
  resources: RivalResourceBag;
  specialResources: RivalSpecialResourceBag;
  allocatedPlanetSpecialResources: StrategicPlanetSpecialResourceBag;
  buildings: RivalBuildingState[];
  buildQueue: RivalBuildTask[];
  policies: RivalPolicyState[];
  score: RivalScore;
  traits: RivalTraitState[];
  localInfluence: number;
  galacticInfluence: number;
  discoveredByPlayer: boolean;
}
