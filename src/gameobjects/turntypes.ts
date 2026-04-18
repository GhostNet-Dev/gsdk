import IEventController from "@Glibs/interface/ievent";

export interface TurnContext {
  turn: number;
  eventCtrl: IEventController;
}

export interface TurnEndedPayload {
  turn: number;
  participantCount: number;
}

export interface ITurnParticipant {
  readonly turnId: string;
  readonly turnOrder: number;
  advanceTurn(ctx: TurnContext): void | Promise<void>;
}
