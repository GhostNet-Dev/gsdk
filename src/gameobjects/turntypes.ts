import IEventController from "@Glibs/interface/ievent";
import { CurrencyType } from "@Glibs/inventory/wallet";

export interface TurnContext {
  turn: number;
  eventCtrl: IEventController;
  report: TurnReport;
  log: TurnLogger;
}

export interface TurnEndedPayload {
  turn: number;
  participantCount: number;
  completed: boolean;
  report: TurnReport;
  error?: string;
}

export type TurnLogKind =
  | "system"
  | "construction"
  | "resource"
  | "population"
  | "unit"
  | "enemy"
  | "research";

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
