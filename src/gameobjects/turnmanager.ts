import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ITurnParticipant, TurnContext, TurnEndedPayload } from "./turntypes";

export default class TurnManager {
  private turn = 0;
  private isAdvancing = false;
  private participants: ITurnParticipant[] = [];

  constructor(private eventCtrl: IEventController) {
    this.eventCtrl.RegisterEventListener(EventTypes.RegisterTurnParticipant, this.register);
    this.eventCtrl.RegisterEventListener(EventTypes.DeregisterTurnParticipant, this.unregister);
    this.eventCtrl.RegisterEventListener(EventTypes.TurnNext, this.handleTurnNext);
  }

  get Turn() {
    return this.turn;
  }

  register = (participant: ITurnParticipant) => {
    if (!participant || this.participants.includes(participant)) return;
    this.participants.push(participant);
    this.sortParticipants();
  };

  unregister = (participant: ITurnParticipant) => {
    this.participants = this.participants.filter((p) => p !== participant);
  };

  nextTurn = async () => {
    if (this.isAdvancing) return;

    this.isAdvancing = true;
    this.turn += 1;

    const ctx: TurnContext = {
      turn: this.turn,
      eventCtrl: this.eventCtrl,
    };

    try {
      for (const participant of [...this.participants]) {
        await participant.advanceTurn(ctx);
      }

      const payload: TurnEndedPayload = {
        turn: this.turn,
        participantCount: this.participants.length,
      };
      this.eventCtrl.SendEventMessage(EventTypes.TurnEnded, payload);
    } catch (err) {
      console.error("[TurnManager] Failed to advance turn:", err);
      this.eventCtrl.SendEventMessage(EventTypes.Toast, "턴 진행 중 오류가 발생했습니다.");
    } finally {
      this.isAdvancing = false;
    }
  };

  private handleTurnNext = () => {
    void this.nextTurn();
  };

  private sortParticipants() {
    this.participants.sort((a, b) => {
      const order = a.turnOrder - b.turnOrder;
      if (order !== 0) return order;
      return a.turnId.localeCompare(b.turnId);
    });
  }
}
