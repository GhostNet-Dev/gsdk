import IEventController from "@Glibs/interface/ievent";
import { GUX } from "../gux";
import { EventTypes } from "@Glibs/types/globaltypes";

/**
 * 건설 모드에서 선택된 건물의 정보(이름, 가격)와 종료 버튼을 제공하는 HUD
 */
export class BuildingInfoBar extends GUX {
    Dom = document.createElement("div");
    private nameLabel: HTMLSpanElement | null = null;
    private costLabel: HTMLSpanElement | null = null;
    private closeBtn: HTMLButtonElement | null = null;

    constructor(private eventCtrl: IEventController) {
        super();
        this.RenderHTML();
        this.Hide();

        // 건물 선택 시 정보 표시
        this.eventCtrl.RegisterEventListener(EventTypes.ShowBuildingInfo, (data: { name: string, cost: string }) => {
            if (this.nameLabel) this.nameLabel.innerText = data.name;
            if (this.costLabel) this.costLabel.innerText = `가격: ${data.cost}`;
            this.Show();
        });

        // 그리드 종료 시 UI 숨김
        this.eventCtrl.RegisterEventListener(EventTypes.HideGrid, () => {
            this.Hide();
        });
    }

    Show(): void {
        this.Dom.style.display = "flex";
    }

    Hide(): void {
        this.Dom.style.display = "none";
    }

    private onCloseClick = () => {
        this.eventCtrl.SendEventMessage(EventTypes.HideGrid);
    };

    RenderHTML(): void {
        this.Dom.id = "gnx-building-infobar";
        this.Dom.innerHTML = `
            <div class="gnx-info-left">
                <span class="gnx-build-name">건물 이름</span>
                <span class="gnx-build-cost">가격: 0</span>
            </div>
            <button class="gnx-grid-close-btn" title="그리드 종료 (ESC)">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6L6 18M6 6l12 12"></path>
                </svg>
                <span>종료</span>
            </button>
        `;
        document.body.appendChild(this.Dom);

        this.nameLabel = this.Dom.querySelector('.gnx-build-name');
        this.costLabel = this.Dom.querySelector('.gnx-build-cost');
        this.closeBtn = this.Dom.querySelector('.gnx-grid-close-btn');

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', this.onCloseClick);
        }

        this.applyDynamicStyle("gnx-building-infobar-css", CSS);
    }
}

const CSS = `
#gnx-building-infobar {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    min-width: 360px;
    background: rgba(15, 15, 20, 0.9);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 16px;
    padding: 12px 20px;
    display: none;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    z-index: 2000;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    color: white;
    font-family: 'Inter', 'Segoe UI', sans-serif;
}

.gnx-info-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.gnx-build-name {
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
}

.gnx-build-cost {
    font-size: 13px;
    color: #4CAF50;
    font-weight: 500;
}

.gnx-grid-close-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    color: #ff5252;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s ease;
}

.gnx-grid-close-btn:hover {
    background: rgba(255, 82, 82, 0.15);
    border-color: rgba(255, 82, 82, 0.3);
    transform: translateY(-1px);
}

.gnx-grid-close-btn:active {
    transform: translateY(0);
}
`;
