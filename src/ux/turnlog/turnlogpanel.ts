import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { GUX, UxLayerIndex } from "../gux";
import { TurnEndedPayload, TurnReport } from "@Glibs/gameobjects/turntypes";

export default class TurnLogPanel extends GUX {
  Dom = document.createElement("div");
  private titleEl?: HTMLElement;
  private stateEl?: HTMLElement;
  private listEl?: HTMLElement;
  private closeBtn?: HTMLButtonElement;
  private completed = false;

  constructor(private eventCtrl: IEventController, private parent: HTMLElement = document.body) {
    super();
    this.RenderHTML();
    this.Hide();

    this.eventCtrl.RegisterEventListener(EventTypes.TurnReportUpdated, this.onReportUpdated);
    this.eventCtrl.RegisterEventListener(EventTypes.TurnEnded, this.onTurnEnded);
  }

  Show(): void {
    this.Dom.style.display = "flex";
    this.visible = true;
  }

  Hide(): void {
    this.Dom.style.display = "none";
    this.visible = false;
  }

  RenderHTML(): void {
    this.Dom.id = "gnx-turn-log-panel";
    this.Dom.style.zIndex = UxLayerIndex.Modal.toString();
    this.Dom.innerHTML = `
      <div class="gnx-turn-log-dialog">
        <div class="gnx-turn-log-head">
          <div>
            <div class="gnx-turn-log-title">턴 진행</div>
            <div class="gnx-turn-log-state">처리 중입니다.</div>
          </div>
          <button class="gnx-turn-log-close" type="button" disabled>확인</button>
        </div>
        <div class="gnx-turn-log-list"></div>
      </div>
    `;

    this.parent.appendChild(this.Dom);
    this.titleEl = this.Dom.querySelector(".gnx-turn-log-title") as HTMLElement;
    this.stateEl = this.Dom.querySelector(".gnx-turn-log-state") as HTMLElement;
    this.listEl = this.Dom.querySelector(".gnx-turn-log-list") as HTMLElement;
    this.closeBtn = this.Dom.querySelector(".gnx-turn-log-close") as HTMLButtonElement;
    this.closeBtn?.addEventListener("click", () => this.Hide());

    this.applyDynamicStyle("gnx-turn-log-panel-css", CSS);
  }

  private onReportUpdated = (report: TurnReport) => {
    if (!report) return;
    this.completed = false;
    this.renderReport(report);
    this.Show();
  };

  private onTurnEnded = (payload: TurnEndedPayload) => {
    this.completed = true;
    this.renderReport(payload.report);
    this.Show();
  };

  private renderReport(report: TurnReport) {
    if (this.titleEl) this.titleEl.innerText = `${report.turn}턴 결과`;
    if (this.stateEl) this.stateEl.innerText = this.completed ? "완료되었습니다." : "처리 중입니다.";
    if (this.closeBtn) this.closeBtn.disabled = !this.completed;
    if (!this.listEl) return;

    this.listEl.innerHTML = "";
    if (report.entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "gnx-turn-log-empty";
      empty.innerText = "아직 기록된 내용이 없습니다.";
      this.listEl.appendChild(empty);
      return;
    }

    for (const entry of report.entries) {
      const item = document.createElement("div");
      item.className = `gnx-turn-log-item gnx-turn-log-${entry.kind}`;
      item.innerText = entry.message;
      this.listEl.appendChild(item);
    }
  }
}

const CSS = `
#gnx-turn-log-panel {
  position: fixed;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.34);
  color: #f7f7f7;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Pretendard, Apple SD Gothic Neo, Arial, sans-serif;
}

#gnx-turn-log-panel .gnx-turn-log-dialog {
  width: min(420px, calc(100vw - 32px));
  max-height: min(520px, calc(100vh - 56px));
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  background: rgba(18, 20, 22, 0.94);
  box-shadow: 0 18px 54px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px);
}

#gnx-turn-log-panel .gnx-turn-log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

#gnx-turn-log-panel .gnx-turn-log-title {
  font-size: 18px;
  font-weight: 800;
}

#gnx-turn-log-panel .gnx-turn-log-state {
  margin-top: 3px;
  font-size: 12px;
  color: #bfc8cc;
}

#gnx-turn-log-panel .gnx-turn-log-close {
  min-width: 74px;
  min-height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  color: #f7f7f7;
  background: rgba(70, 116, 92, 0.85);
  cursor: pointer;
  font-weight: 700;
}

#gnx-turn-log-panel .gnx-turn-log-close:disabled {
  opacity: 0.45;
  cursor: default;
}

#gnx-turn-log-panel .gnx-turn-log-list {
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

#gnx-turn-log-panel .gnx-turn-log-item,
#gnx-turn-log-panel .gnx-turn-log-empty {
  padding: 9px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  line-height: 1.35;
  font-size: 14px;
}

#gnx-turn-log-panel .gnx-turn-log-resource {
  border-left: 3px solid #78d08f;
}

#gnx-turn-log-panel .gnx-turn-log-construction {
  border-left: 3px solid #7db7ff;
}

#gnx-turn-log-panel .gnx-turn-log-system {
  border-left: 3px solid #ff7d7d;
}
`;
