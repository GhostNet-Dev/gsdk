import IEventController from "@Glibs/interface/ievent";
import { CurrencyType } from "@Glibs/inventory/wallet";

export const FactionId = {
  Alliance: "alliance",
  Empire: "empire",
  Guild: "guild",
  Neutral: "neutral",
} as const;

export type FactionId = typeof FactionId[keyof typeof FactionId];

export const FactionIds: readonly FactionId[] = Object.values(FactionId);

export function isFactionId(value: unknown): value is FactionId {
  return typeof value === "string" && FactionIds.includes(value as FactionId);
}

export function parseFactionId(value: unknown): FactionId | undefined {
  return isFactionId(value) ? value : undefined;
}

export interface FactionTurnModifier {
  factionId: FactionId;
  resourceBias: Partial<Record<CurrencyType, number>>;
  cityPolicyBias: Partial<Record<string, number>>;
  influenceMultiplier: number;
}

export interface CityScore {
  total: number;
  economy: number;
  production: number;
  population: number;
  research: number;
  prestige: number;
}

export type RivalSpecialResourceBag = Partial<Record<string, number>>;

export interface CityTurnOutput {
  cityId: string;
  planetId: string;
  factionId: FactionId;
  isPlayer: boolean;
  score: CityScore;
  resourceOutput: Partial<Record<CurrencyType, number>>;
  specialResourceOutput: RivalSpecialResourceBag;
  activePolicies: string[];
}

export interface PlanetTurnOutput {
  planetId: string;
  factionInfluence: Partial<Record<FactionId, number>>;
  controllingFactionId?: FactionId;
  contested: boolean;
  resourceBonus: Partial<Record<CurrencyType, number>>;
  marketPressure: Partial<Record<CurrencyType, number>>;
  allocatedSpecialResources: Record<string, Record<string, number>>;
}

export interface TurnSharedModifiers {
  factionModifiers: Partial<Record<FactionId, FactionTurnModifier>>;
  cityOutputs: Record<string, CityTurnOutput>;
  planetOutputs: Record<string, PlanetTurnOutput>;
}

export interface TurnContext {
  turn: number;
  eventCtrl: IEventController;
  report: TurnReport;
  log: TurnLogger;
  shared: TurnSharedModifiers;
}

export interface TurnEndedPayload {
  turn: number;
  participantCount: number;
  completed: boolean;
  report: TurnReport;
  error?: string;
}

export const TurnLogKind = {
  System: "system",
  Construction: "construction",
  Resource: "resource",
  Population: "population",
  Unit: "unit",
  Enemy: "enemy",
  Rival: "rival",
  Research: "research",
} as const;

export type TurnLogKind = typeof TurnLogKind[keyof typeof TurnLogKind];

export interface TurnLogInput {
  source: string;
  kind: TurnLogKind;
  message: string;
  data?: unknown;
}

export interface TurnLogEntry extends TurnLogInput {
  id: string;
  turn: number;
  createdAt: number;
}

export interface TurnReport {
  turn: number;
  entries: TurnLogEntry[];
  totals: {
    resources: Partial<Record<CurrencyType, number>>;
  };
}

export interface TurnLogger {
  add(entry: TurnLogInput): TurnLogEntry;
}

export interface ITurnParticipant {
  readonly turnId: string;
  readonly turnOrder: number;
  advanceTurn(ctx: TurnContext): void | Promise<void>;
}
