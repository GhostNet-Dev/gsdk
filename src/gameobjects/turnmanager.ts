import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ResourceAmountChangedPayload, getResourceDisplayName } from "./resourcetypes";
import { ITurnParticipant, TurnContext, TurnEndedPayload, TurnLogInput, TurnReport } from "./turntypes";

export default class TurnManager {
  private turn = 0;
  private logSeq = 0;
  private isAdvancing = false;
  private activeReport?: TurnReport;
  private participants: ITurnParticipant[] = [];

  constructor(private eventCtrl: IEventController) {
    this.eventCtrl.RegisterEventListener(EventTypes.RegisterTurnParticipant, this.register);
    this.eventCtrl.RegisterEventListener(EventTypes.DeregisterTurnParticipant, this.unregister);
    this.eventCtrl.RegisterEventListener(EventTypes.TurnNext, this.handleTurnNext);
    this.eventCtrl.RegisterEventListener(EventTypes.CurrencyAmountChanged, this.handleResourceAmountChanged);
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
    this.logSeq = 0;

    const report: TurnReport = {
      turn: this.turn,
      entries: [],
      totals: {
        resources: {},
      },
    };
    this.activeReport = report;

    const ctx: TurnContext = {
      turn: this.turn,
      eventCtrl: this.eventCtrl,
      report,
      log: {
        add: (entry) => this.addLog(report, entry),
      },
      shared: {
        factionModifiers: {},
        cityOutputs: {},
        planetOutputs: {},
      },
    };

    let completed = false;
    let errorMessage: string | undefined;

    try {
      this.eventCtrl.SendEventMessage(EventTypes.TurnReportUpdated, report);

      for (const participant of [...this.participants]) {
        await participant.advanceTurn(ctx);
      }

      completed = true;
    } catch (err) {
      console.error("[TurnManager] Failed to advance turn:", err);
      errorMessage = err instanceof Error ? err.message : String(err);
      this.addLog(report, {
        source: "turn",
        kind: "system",
        message: "턴 진행 중 오류가 발생했습니다.",
        data: { error: errorMessage },
      });
      this.eventCtrl.SendEventMessage(EventTypes.Toast, "턴 진행 중 오류가 발생했습니다.");
    } finally {
      const payload: TurnEndedPayload = {
        turn: this.turn,
        participantCount: this.participants.length,
        completed,
        report,
        error: errorMessage,
      };
      this.eventCtrl.SendEventMessage(EventTypes.TurnEnded, payload);
      this.activeReport = undefined;
      this.isAdvancing = false;
    }
  };

  private handleTurnNext = () => {
    void this.nextTurn();
  };

  private handleResourceAmountChanged = (payload: ResourceAmountChangedPayload) => {
    if (!this.activeReport) return;

    const name = getResourceDisplayName(payload.type);
    const amount = Math.abs(payload.delta);
    const action = payload.delta > 0 ? "얻었습니다" : "사용했습니다";
    const signed = payload.delta > 0 ? `+${payload.delta}` : `-${amount}`;

    this.activeReport.totals.resources[payload.type] =
      (this.activeReport.totals.resources[payload.type] ?? 0) + payload.delta;

    this.addLog(this.activeReport, {
      source: payload.source ?? "resource",
      kind: "resource",
      message: `${name} ${signed}을 ${action}.`,
      data: payload,
    });
  };

  private addLog(report: TurnReport, entry: TurnLogInput) {
    const log = {
      ...entry,
      id: `${report.turn}-${++this.logSeq}`,
      turn: report.turn,
      createdAt: Date.now(),
    };
    report.entries.push(log);
    this.eventCtrl.SendEventMessage(EventTypes.TurnReportUpdated, report);
    return log;
  }

  private sortParticipants() {
    this.participants.sort((a, b) => {
      const order = a.turnOrder - b.turnOrder;
      if (order !== 0) return order;
      return a.turnId.localeCompare(b.turnId);
    });
  }
}
