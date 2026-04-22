import { CitySceneSummary } from "@Glibs/world/cityview/cityviewtypes";

const PANEL_STYLE_ID = "gnx-rival-city-summary-style";

export default class RivalCitySummaryPanel {
  private readonly root: HTMLDivElement;
  private readonly trigger: HTMLButtonElement;
  private readonly cityName: HTMLSpanElement;
  private readonly sheet: HTMLDivElement;
  private readonly badges: HTMLDivElement;
  private readonly stats: HTMLDivElement;
  private readonly productionList: HTMLUListElement;
  private readonly specialList: HTMLUListElement;
  private readonly policyList: HTMLUListElement;
  private isOpen = false;

  constructor(private readonly container: HTMLElement = document.body) {
    ensurePanelStyle();
    this.root = document.createElement("div");
    this.root.className = "gnx-rival-city-panel";
    this.root.innerHTML = `
      <div class="gnx-rival-city-panel__sheet" hidden>
        <div class="gnx-rival-city-panel__badges"></div>
        <div class="gnx-rival-city-panel__stats"></div>
        <section>
          <h3>생산</h3>
          <ul class="gnx-rival-city-panel__list gnx-rival-city-panel__production"></ul>
        </section>
        <section>
          <h3>특수 자원</h3>
          <ul class="gnx-rival-city-panel__list gnx-rival-city-panel__special"></ul>
        </section>
        <section>
          <h3>정책</h3>
          <ul class="gnx-rival-city-panel__list gnx-rival-city-panel__policy"></ul>
        </section>
      </div>
      <button class="gnx-rival-city-panel__trigger" type="button" aria-expanded="false">
        <span class="gnx-rival-city-panel__name"></span>
      </button>
    `;
    this.trigger = this.root.querySelector(".gnx-rival-city-panel__trigger") as HTMLButtonElement;
    this.cityName = this.root.querySelector(".gnx-rival-city-panel__name") as HTMLSpanElement;
    this.sheet = this.root.querySelector(".gnx-rival-city-panel__sheet") as HTMLDivElement;
    this.badges = this.root.querySelector(".gnx-rival-city-panel__badges") as HTMLDivElement;
    this.stats = this.root.querySelector(".gnx-rival-city-panel__stats") as HTMLDivElement;
    this.productionList = this.root.querySelector(".gnx-rival-city-panel__production") as HTMLUListElement;
    this.specialList = this.root.querySelector(".gnx-rival-city-panel__special") as HTMLUListElement;
    this.policyList = this.root.querySelector(".gnx-rival-city-panel__policy") as HTMLUListElement;
    this.trigger.addEventListener("click", () => {
      this.setOpen(!this.isOpen);
    });
    this.root.style.display = "none";
    this.container.appendChild(this.root);
  }

  show(summary: CitySceneSummary): void {
    this.cityName.textContent = summary.name;
    this.badges.replaceChildren(
      createBadge(summary.kindLabel),
      createBadge(summary.factionLabel),
      createBadge(summary.profileId),
      createBadge(`turn ${summary.turn}`),
    );
    this.stats.replaceChildren(
      createKeyValueRow("총점", summary.score.total),
      createKeyValueRow("경제", summary.score.economy),
      createKeyValueRow("생산", summary.score.production),
      createKeyValueRow("인구", summary.score.population),
      createKeyValueRow("연구", summary.score.research),
      createKeyValueRow("위신", summary.score.prestige),
    );
    this.renderKeyValueList(this.productionList, summary.resourceOutput, "생산 정보 없음");
    this.renderKeyValueList(this.specialList, summary.specialResources, "특수 자원 없음");
    this.renderPolicyList(summary);
    this.setOpen(false);
    this.root.style.display = "grid";
  }

  hide(): void {
    this.setOpen(false);
    this.root.style.display = "none";
  }

  dispose(): void {
    this.root.remove();
  }

  private renderKeyValueList(
    list: HTMLUListElement,
    values: Partial<Record<string, number>>,
    emptyLabel: string,
  ): void {
    const items = Object.entries(values)
      .filter(([, value]) => (value ?? 0) > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => {
        const item = document.createElement("li");
        item.appendChild(createKeyValueRow(key, Math.round(value ?? 0)));
        return item;
      });

    if (items.length === 0) {
      const empty = document.createElement("li");
      empty.className = "gnx-rival-city-panel__empty";
      empty.textContent = emptyLabel;
      list.replaceChildren(empty);
      return;
    }

    list.replaceChildren(...items);
  }

  private renderPolicyList(summary: CitySceneSummary): void {
    if (summary.policies.length === 0) {
      const empty = document.createElement("li");
      empty.className = "gnx-rival-city-panel__empty";
      empty.textContent = "활성 정책 없음";
      this.policyList.replaceChildren(empty);
      return;
    }

    this.policyList.replaceChildren(...summary.policies.map((policy) => {
      const item = document.createElement("li");
      item.appendChild(createKeyValueRow(policy.policyId, `${policy.remainingTurns}턴`));
      return item;
    }));
  }

  private setOpen(isOpen: boolean): void {
    this.isOpen = isOpen;
    this.sheet.hidden = !isOpen;
    this.root.classList.toggle("gnx-rival-city-panel--open", isOpen);
    this.trigger.setAttribute("aria-expanded", String(isOpen));
  }
}

function ensurePanelStyle(): void {
  if (document.getElementById(PANEL_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = PANEL_STYLE_ID;
  style.textContent = `
    .gnx-rival-city-panel {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      z-index: 24;
      width: min(620px, calc(100vw - 32px));
      color: #eff7ff;
      pointer-events: none;
      font-family: "Fredoka", sans-serif;
      justify-items: center;
      gap: 10px;
    }
    .gnx-rival-city-panel__trigger {
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      max-width: min(420px, calc(100vw - 160px));
      min-height: 44px;
      border: 1px solid rgba(135, 215, 255, 0.36);
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(20, 28, 40, 0.92), rgba(11, 16, 24, 0.88));
      color: #eff7ff;
      box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(10px);
      cursor: pointer;
      font: inherit;
      padding: 9px 18px;
    }
    .gnx-rival-city-panel__trigger:hover,
    .gnx-rival-city-panel__trigger:focus-visible {
      border-color: rgba(135, 215, 255, 0.7);
      outline: none;
    }
    .gnx-rival-city-panel__name {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0;
    }
    .gnx-rival-city-panel__sheet {
      pointer-events: auto;
      width: 100%;
      max-height: min(46vh, 430px);
      overflow: auto;
      overscroll-behavior: contain;
      background: linear-gradient(180deg, rgba(20, 28, 40, 0.94), rgba(11, 16, 24, 0.91));
      border: 1px solid rgba(135, 215, 255, 0.28);
      border-radius: 14px;
      box-shadow: 0 14px 50px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(10px);
      padding: 14px;
    }
    .gnx-rival-city-panel__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
    }
    .gnx-rival-city-panel__badge {
      border: 1px solid rgba(135, 215, 255, 0.26);
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 12px;
      text-transform: uppercase;
      background: rgba(135, 215, 255, 0.08);
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .gnx-rival-city-panel__stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px 10px;
      margin-bottom: 12px;
    }
    .gnx-rival-city-panel__row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: baseline;
      gap: 10px;
      min-width: 0;
      font-size: 13px;
    }
    .gnx-rival-city-panel__stats .gnx-rival-city-panel__row {
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      padding: 7px 9px;
    }
    .gnx-rival-city-panel__row-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: rgba(229, 242, 255, 0.84);
    }
    .gnx-rival-city-panel__row-value {
      min-width: 0;
      max-width: 100%;
      overflow-wrap: anywhere;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      color: #ffffff;
    }
    .gnx-rival-city-panel__stats .gnx-rival-city-panel__row-value {
      font-size: 15px;
    }
    .gnx-rival-city-panel section + section {
      margin-top: 12px;
    }
    .gnx-rival-city-panel h3 {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(214, 238, 255, 0.92);
    }
    .gnx-rival-city-panel__list {
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.4;
      list-style: none;
    }
    .gnx-rival-city-panel__list li + li {
      margin-top: 6px;
    }
    .gnx-rival-city-panel__empty {
      opacity: 0.7;
    }
    @media (max-width: 720px) {
      .gnx-rival-city-panel {
        bottom: 14px;
        width: calc(100vw - 24px);
      }
      .gnx-rival-city-panel__trigger {
        max-width: calc(100vw - 120px);
      }
      .gnx-rival-city-panel__sheet {
        max-height: 45vh;
        padding: 12px;
      }
      .gnx-rival-city-panel__stats {
        grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
      }
      .gnx-rival-city-panel__row {
        grid-template-columns: minmax(0, 1fr) auto;
      }
    }
    @media (max-width: 420px) {
      .gnx-rival-city-panel__trigger {
        max-width: calc(100vw - 96px);
        min-height: 40px;
        padding: 8px 14px;
      }
      .gnx-rival-city-panel__stats {
        grid-template-columns: 1fr;
      }
      .gnx-rival-city-panel__list .gnx-rival-city-panel__row {
        grid-template-columns: 1fr;
        gap: 2px;
      }
      .gnx-rival-city-panel__list .gnx-rival-city-panel__row-value {
        text-align: left;
      }
    }
  `;
  document.head.appendChild(style);
}

function createBadge(label: string): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.className = "gnx-rival-city-panel__badge";
  badge.textContent = label;
  return badge;
}

function createKeyValueRow(label: string, value: string | number): HTMLDivElement {
  const row = document.createElement("div");
  row.className = "gnx-rival-city-panel__row";

  const labelElement = document.createElement("span");
  labelElement.className = "gnx-rival-city-panel__row-label";
  labelElement.textContent = label;

  const valueElement = document.createElement("strong");
  valueElement.className = "gnx-rival-city-panel__row-value";
  valueElement.textContent = String(value);

  row.replaceChildren(labelElement, valueElement);
  return row;
}
