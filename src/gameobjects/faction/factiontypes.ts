import { CurrencyType } from "@Glibs/inventory/wallet";
import { FactionId } from "@Glibs/gameobjects/turntypes";

export type { FactionId };

export type FactionGovernance = "federation" | "empire" | "guild" | "neutralBloc" | "corporate";

export type FactionRelation = "ally" | "friendly" | "neutral" | "rival" | "hostile" | "war";

export type FactionPolicyId =
  | "reconstruction"
  | "mutualAid"
  | "imperialMandate"
  | "strategicFortification"
  | "tradeCompact"
  | "gateControl"
  | "neutralMediation"
  | "industrialLevy";

export type FactionDoctrineId =
  | "stabilityAndRecovery"
  | "industrialCommand"
  | "tradeNetwork"
  | "isolatedNeutrality";

export type FactionResourceBag = Partial<Record<CurrencyType, number>>;

export interface FactionScoreWeights {
  economy: number;
  industry: number;
  research: number;
  diplomacy: number;
  military: number;
  influence: number;
}

export interface FactionDef {
  id: FactionId;
  name: string;
  desc: string;
  governance: FactionGovernance;
  doctrine: FactionDoctrineId;
  resourceBias: FactionResourceBag;
  policyBias: Partial<Record<FactionPolicyId, number>>;
  cityPolicyBias: Partial<Record<string, number>>;
  scoreBias: Partial<FactionScoreWeights>;
  sharedResourcePolicy: "none" | "aidWeakCities" | "centralPool" | "tribute";
  expansionPolicy: "balanced" | "wide" | "tall" | "strategicHub";
  cooperationLevel: number;
  defaultRelations: Partial<Record<FactionId, FactionRelation>>;
}

// ─── 진영 상태 ────────────────────────────────────────────────────────────────

export interface ActiveFactionPolicy {
  policyId: FactionPolicyId;
  startTurn: number;
  durationTurns: number;
  strength: number;
}

export interface FactionGoalState {
  id: string;
  kind: "controlPlanet" | "dominateRoute" | "fleetReady" | "marketDominance";
  targetId?: string;
  progress: number;
  completed: boolean;
  startTurn: number;
}

export interface FactionScore {
  total: number;
  economy: number;
  industry: number;
  research: number;
  diplomacy: number;
  military: number;
  influence: number;
}

export interface FactionState {
  id: FactionId;
  treasury: FactionResourceBag;
  activePolicies: ActiveFactionPolicy[];
  goals: FactionGoalState[];
  relations: Partial<Record<FactionId, FactionRelation>>;
  controlledPlanetIds: string[];
  contestedPlanetIds: string[];
  memberCityIds: string[];
  fleetIds: string[];
  score: FactionScore;
  lastProcessedTurn: number;
  playerReputation: number;
}

// playerReputation 임계값
export const REPUTATION_THRESHOLDS = {
  neutral:     { min: 0,  max: 20 },
  friendly:    { min: 21, max: 50,  influenceBonus: 0.05 },
  cooperative: { min: 51, max: 80,  influenceBonus: 0.12 },
  core:        { min: 81, max: 100, influenceBonus: 0.20 },
} as const;
