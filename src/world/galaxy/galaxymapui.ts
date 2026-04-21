import { PlanetInfoViewModel } from "./galaxytypes";

const GALAXY_UI_PANEL_WIDTH = 300;
const GALAXY_UI_GAP = 14;
const GALAXY_UI_BOTTOM_PANEL_HEIGHT = 360;

const GalaxyMapPanelTab = {
  Summary: "summary",
  Cities: "cities",
  Resources: "resources",
  Routes: "routes",
} as const;

type GalaxyMapPanelTab = typeof GalaxyMapPanelTab[keyof typeof GalaxyMapPanelTab];

function parseGalaxyMapPanelTab(value: string | undefined): GalaxyMapPanelTab | undefined {
  if (value === GalaxyMapPanelTab.Summary) return GalaxyMapPanelTab.Summary;
  if (value === GalaxyMapPanelTab.Cities) return GalaxyMapPanelTab.Cities;
  if (value === GalaxyMapPanelTab.Resources) return GalaxyMapPanelTab.Resources;
  if (value === GalaxyMapPanelTab.Routes) return GalaxyMapPanelTab.Routes;
  return undefined;
}

export function getGalaxyFocusCenterNdc(viewportWidth: number, viewportHeight: number): { x: number; y: number } {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);

  if (safeWidth >= safeHeight) {
    const reservedWidth = Math.min(GALAXY_UI_PANEL_WIDTH, Math.max(1, safeWidth - GALAXY_UI_GAP * 2)) + GALAXY_UI_GAP * 3;
    return {
      x: -(reservedWidth / safeWidth),
      y: 0
    };
  } else {
    const panelHeight = Math.min(safeHeight * 0.46, GALAXY_UI_BOTTOM_PANEL_HEIGHT);
    const reservedHeight = panelHeight + GALAXY_UI_GAP * 2;
    return {
      x: 0,
      y: (reservedHeight / safeHeight) * 1.15
    };
  }
}

export class GalaxyMapUI {
  private root: HTMLElement;
  private activeTab: GalaxyMapPanelTab = GalaxyMapPanelTab.Summary;
  private tabButtons = new Map<GalaxyMapPanelTab, HTMLButtonElement>();
  private tabPanels = new Map<GalaxyMapPanelTab, HTMLElement>();
  private planetName!: HTMLElement;
  private planetFactionBadge!: HTMLElement;
  private planetChokeBadge!: HTMLElement;
  private planetSubtitle!: HTMLElement;
  private planetFleet!: HTMLElement;
  private planetCityCount!: HTMLElement;
  private planetStability!: HTMLElement;
  private planetBlockadeLevel!: HTMLElement;
  private planetDegree!: HTMLElement;
  private planetChokeScore!: HTMLElement;
  private planetDescription!: HTMLElement;
  private resourceBonusList!: HTMLElement;
  private specialResourceList!: HTMLElement;
  private marketResourceList!: HTMLElement;
  private cityList!: HTMLElement;
  private planetNeighbors!: HTMLElement;

  public onNeighborClick?: (planetId: string) => void;
  public onCityClick?: (planetId: string, cityId: string) => void;

  constructor(container: HTMLElement = document.body) {
    this.ensureStyle();
    this.root = document.createElement("div");
    this.root.className = "gsm-root";
    this.root.innerHTML = `
      <div class="gsm-panel">
        <div class="gsm-panel-header">
          <div class="gsm-planet-title">
            <span data-ref="planetName">Atlas</span>
            <span class="gsm-badge" data-ref="planetFactionBadge">NEUTRAL</span>
            <span class="gsm-badge" data-ref="planetChokeBadge" style="display:none;">요충지</span>
          </div>
          <div class="gsm-small" data-ref="planetSubtitle">은하 회랑 중심축</div>
        </div>

        <div class="gsm-tab-body">
          <section class="gsm-tab-panel" data-panel="${GalaxyMapPanelTab.Summary}" role="tabpanel">
            <div class="gsm-kv"><span>도시 수</span><strong data-ref="planetCityCount">0</strong></div>
            <div class="gsm-kv"><span>안정도</span><strong data-ref="planetStability">0</strong></div>
            <div class="gsm-kv"><span>봉쇄 단계</span><strong data-ref="planetBlockadeLevel">0</strong></div>
            <div class="gsm-section-title">특수 자원</div>
            <ul class="gsm-info-list" data-ref="specialResourceList"></ul>
            <div class="gsm-section-title">설명</div>
            <div class="gsm-desc" data-ref="planetDescription"></div>
          </section>

          <section class="gsm-tab-panel" data-panel="${GalaxyMapPanelTab.Cities}" role="tabpanel">
            <div class="gsm-section-title">도시</div>
            <ul class="gsm-city-list" data-ref="cityList"></ul>
          </section>

          <section class="gsm-tab-panel" data-panel="${GalaxyMapPanelTab.Resources}" role="tabpanel">
            <div class="gsm-section-title">자원 보정</div>
            <ul class="gsm-info-list" data-ref="resourceBonusList"></ul>
            <div class="gsm-section-title">시장</div>
            <ul class="gsm-info-list" data-ref="marketResourceList"></ul>
          </section>

          <section class="gsm-tab-panel" data-panel="${GalaxyMapPanelTab.Routes}" role="tabpanel">
            <div class="gsm-kv"><span>주둔 함대</span><strong data-ref="planetFleet">0</strong></div>
            <div class="gsm-kv"><span>연결 수</span><strong data-ref="planetDegree">0</strong></div>
            <div class="gsm-kv"><span>요충 점수</span><strong data-ref="planetChokeScore">0.00</strong></div>
            <div class="gsm-section-title">연결된 행성</div>
            <ul class="gsm-neighbor-list" data-ref="planetNeighbors"></ul>
            <div class="gsm-section-title">범례</div>
            <div class="gsm-chip-row">
              <span class="gsm-chip"><span class="gsm-swatch" style="color:#67c7ff;background:#67c7ff;"></span> Alliance</span>
              <span class="gsm-chip"><span class="gsm-swatch" style="color:#ff7b9e;background:#ff7b9e;"></span> Empire</span>
              <span class="gsm-chip"><span class="gsm-swatch" style="color:#ffc96a;background:#ffc96a;"></span> Guild</span>
              <span class="gsm-chip"><span class="gsm-swatch" style="color:#b7b9d8;background:#b7b9d8;"></span> Neutral</span>
              <span class="gsm-chip"><span class="gsm-swatch" style="color:#ffe48f;background:#ffe48f;"></span> 요충지</span>
            </div>
          </section>
        </div>

        <div class="gsm-tabs" role="tablist" aria-label="행성 정보">
          <button type="button" class="gsm-tab" data-tab="${GalaxyMapPanelTab.Summary}" role="tab">요약</button>
          <button type="button" class="gsm-tab" data-tab="${GalaxyMapPanelTab.Cities}" role="tab">도시</button>
          <button type="button" class="gsm-tab" data-tab="${GalaxyMapPanelTab.Resources}" role="tab">자원</button>
          <button type="button" class="gsm-tab" data-tab="${GalaxyMapPanelTab.Routes}" role="tab">항로</button>
        </div>
      </div>
    `;
    this.root.style.display = "none";
    container.appendChild(this.root);
    this.cacheRefs();
    this.bindTabs();
    this.setActiveTab(this.activeTab);
    this.updateLayoutMode();
    window.addEventListener("resize", this.updateLayoutMode);
  }

  private updateLayoutMode = (): void => {
    const landscape = window.innerWidth >= window.innerHeight;
    this.root.classList.toggle("gsm-layout-landscape", landscape);
    this.root.classList.toggle("gsm-layout-portrait", !landscape);
  };

  updatePlanet(info: PlanetInfoViewModel): void {
    this.planetName.textContent = info.name;
    this.planetFactionBadge.textContent = info.factionLabel;
    this.planetFactionBadge.setAttribute("style", `color:${info.factionTextColor};background:${info.factionBgColor};border-color:${info.factionBorderColor};`);
    this.planetChokeBadge.style.display = info.isChokepoint ? "inline-flex" : "none";
    this.planetSubtitle.textContent = info.subtitle;
    this.planetFleet.textContent = String(info.fleet);
    this.planetCityCount.textContent = String(info.cityCount);
    this.planetStability.textContent = `${Math.round(info.stability)}`;
    this.planetBlockadeLevel.textContent = String(info.blockadeLevel);
    this.planetDegree.textContent = String(info.degree);
    this.planetChokeScore.textContent = info.chokeScore.toFixed(2);
    this.planetDescription.textContent = info.description;
    this.renderSpecialResources(info);
    this.renderResourceBonuses(info);
    this.renderMarketResources(info);
    this.renderCities(info);
    if (info.selectedCityId) {
      this.setActiveTab(GalaxyMapPanelTab.Cities);
    }

    const neighborItems = info.neighbors.map((neighbor) => {
      const item = document.createElement("li");
      item.className = "gsm-neighbor-item";
      item.tabIndex = 0;
      item.textContent = neighbor.name;
      item.addEventListener("click", () => {
        this.onNeighborClick?.(neighbor.id);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.onNeighborClick?.(neighbor.id);
        }
      });
      return item;
    });

    if (neighborItems.length === 0) {
      const empty = document.createElement("li");
      empty.className = "gsm-empty";
      empty.textContent = "연결된 행성이 없습니다.";
      this.planetNeighbors.replaceChildren(empty);
      return;
    }

    this.planetNeighbors.replaceChildren(...neighborItems);
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? "block" : "none";
  }

  dispose(): void {
    window.removeEventListener("resize", this.updateLayoutMode);
    this.root.remove();
  }

  private cacheRefs(): void {
    const q = (name: string) => this.root.querySelector(`[data-ref="${name}"]`) as HTMLElement;
    const tabButton = (tab: GalaxyMapPanelTab) => this.root.querySelector(`[data-tab="${tab}"]`) as HTMLButtonElement;
    const tabPanel = (tab: GalaxyMapPanelTab) => this.root.querySelector(`[data-panel="${tab}"]`) as HTMLElement;

    this.tabButtons.set(GalaxyMapPanelTab.Summary, tabButton(GalaxyMapPanelTab.Summary));
    this.tabButtons.set(GalaxyMapPanelTab.Cities, tabButton(GalaxyMapPanelTab.Cities));
    this.tabButtons.set(GalaxyMapPanelTab.Resources, tabButton(GalaxyMapPanelTab.Resources));
    this.tabButtons.set(GalaxyMapPanelTab.Routes, tabButton(GalaxyMapPanelTab.Routes));
    this.tabPanels.set(GalaxyMapPanelTab.Summary, tabPanel(GalaxyMapPanelTab.Summary));
    this.tabPanels.set(GalaxyMapPanelTab.Cities, tabPanel(GalaxyMapPanelTab.Cities));
    this.tabPanels.set(GalaxyMapPanelTab.Resources, tabPanel(GalaxyMapPanelTab.Resources));
    this.tabPanels.set(GalaxyMapPanelTab.Routes, tabPanel(GalaxyMapPanelTab.Routes));

    this.planetName = q("planetName");
    this.planetFactionBadge = q("planetFactionBadge");
    this.planetChokeBadge = q("planetChokeBadge");
    this.planetSubtitle = q("planetSubtitle");
    this.planetFleet = q("planetFleet");
    this.planetCityCount = q("planetCityCount");
    this.planetStability = q("planetStability");
    this.planetBlockadeLevel = q("planetBlockadeLevel");
    this.planetDegree = q("planetDegree");
    this.planetChokeScore = q("planetChokeScore");
    this.planetDescription = q("planetDescription");
    this.resourceBonusList = q("resourceBonusList");
    this.specialResourceList = q("specialResourceList");
    this.marketResourceList = q("marketResourceList");
    this.cityList = q("cityList");
    this.planetNeighbors = q("planetNeighbors");
  }

  private renderCities(info: PlanetInfoViewModel): void {
    if (info.cities.length === 0) {
      this.cityList.replaceChildren(this.createEmptyItem("도시 없음"));
      return;
    }

    this.cityList.replaceChildren(...info.cities.map((city) => {
      const item = document.createElement("li");
      item.className = "gsm-city-item";
      if (city.id === info.selectedCityId) item.classList.add("gsm-city-selected");
      item.tabIndex = 0;

      const main = document.createElement("div");
      main.className = "gsm-city-main";

      const name = document.createElement("strong");
      name.textContent = city.name;
      const kind = document.createElement("span");
      kind.textContent = city.kindLabel;
      main.append(name, kind);

      const meta = document.createElement("div");
      meta.className = "gsm-city-meta";
      const score = city.score === undefined ? "대기중" : `점수 ${this.formatNumber(city.score)}`;
      meta.textContent = `${city.factionLabel} / ${score}`;

      item.append(main, meta);
      item.addEventListener("click", () => {
        this.onCityClick?.(info.id, city.id);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.onCityClick?.(info.id, city.id);
        }
      });
      return item;
    }));
  }

  private renderSpecialResources(info: PlanetInfoViewModel): void {
    if (info.specialResources.length === 0) {
      this.specialResourceList.replaceChildren(this.createEmptyItem("특수 자원 없음"));
      return;
    }

    this.specialResourceList.replaceChildren(...info.specialResources.map((resource) => {
      const value = resource.amount === undefined ? "보유 가능" : this.formatNumber(resource.amount);
      return this.createInfoItem(resource.label, value);
    }));
  }

  private renderResourceBonuses(info: PlanetInfoViewModel): void {
    if (info.resourceBonuses.length === 0) {
      this.resourceBonusList.replaceChildren(this.createEmptyItem("자원 보정 없음"));
      return;
    }

    this.resourceBonusList.replaceChildren(...info.resourceBonuses.map((bonus) => (
      this.createInfoItem(bonus.label, bonus.percentText)
    )));
  }

  private renderMarketResources(info: PlanetInfoViewModel): void {
    if (info.marketResources.length === 0) {
      this.marketResourceList.replaceChildren(this.createEmptyItem("시장 데이터 없음"));
      return;
    }

    this.marketResourceList.replaceChildren(...info.marketResources.map((market) => {
      const detail = `공급 ${this.formatNumber(market.supply)} / 수요 ${this.formatNumber(market.demand)} / 가격 ${market.pricePressureText}`;
      return this.createInfoItem(market.label, detail);
    }));
  }

  private createInfoItem(label: string, value: string): HTMLLIElement {
    const item = document.createElement("li");
    item.className = "gsm-info-item";

    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    const valueEl = document.createElement("strong");
    valueEl.textContent = value;

    item.append(labelEl, valueEl);
    return item;
  }

  private createEmptyItem(text: string): HTMLLIElement {
    const item = document.createElement("li");
    item.className = "gsm-empty";
    item.textContent = text;
    return item;
  }

  private formatNumber(value: number): string {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1);
  }

  private bindTabs(): void {
    this.tabButtons.forEach((button) => {
      button.addEventListener("click", this.handleTabClick);
    });
  }

  private handleTabClick = (event: MouseEvent): void => {
    const button = event.currentTarget as HTMLButtonElement;
    const tab = parseGalaxyMapPanelTab(button.dataset.tab);
    if (!tab) return;

    this.setActiveTab(tab);
  };

  private setActiveTab(tab: GalaxyMapPanelTab): void {
    this.activeTab = tab;

    this.tabButtons.forEach((button, key) => {
      const selected = key === tab;
      button.classList.toggle("gsm-tab-active", selected);
      button.setAttribute("aria-selected", selected ? "true" : "false");
      button.tabIndex = selected ? 0 : -1;
    });

    this.tabPanels.forEach((panel, key) => {
      panel.hidden = key !== tab;
    });
  }

  private ensureStyle(): void {
    if (document.getElementById("gsm-style")) return;
    const style = document.createElement("style");
    style.id = "gsm-style";
    style.textContent = `
      .gsm-root { position:absolute; inset:0; pointer-events:none; font-family:Arial,sans-serif; color:#f2f7ff; }
      .gsm-panel {
        position:absolute; background:rgba(8,12,22,0.70); border:1px solid rgba(190,220,255,0.18);
        border-radius:8px; backdrop-filter:blur(8px); box-shadow:0 0 24px rgba(90,150,255,0.16);
        pointer-events: auto; display:flex; flex-direction:column; overflow:hidden;
      }
      .gsm-panel { right:14px; top:14px; width:min(300px, calc(100vw - 28px)); max-height:calc(100vh - 28px); }
      .gsm-panel-header { padding:14px 14px 10px; }
      .gsm-layout-portrait .gsm-panel {
        left:14px; right:14px; top:auto; bottom:14px; width:auto; max-width:none;
        max-height:min(46vh, 360px);
      }
      .gsm-planet-title { display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:18px; font-weight:700; flex-wrap:wrap; line-height:1.2; }
      .gsm-small { color:#aeb8cc; }
      .gsm-badge {
        display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:999px;
        font-size:11px; font-weight:700; letter-spacing:.03em; border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.06);
      }
      .gsm-tabs {
        display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:6px; flex:0 0 auto;
        padding:10px 14px 14px; border-top:1px solid rgba(255,255,255,.06); background:rgba(8,12,22,0.72);
      }
      .gsm-tab {
        min-width:0; height:32px; border:1px solid rgba(255,255,255,.10); border-radius:8px;
        background:rgba(255,255,255,.05); color:#cfdaf0; font:700 12px/1 Arial,sans-serif;
        cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }
      .gsm-tab:hover, .gsm-tab-active { background:rgba(120,175,255,.18); color:#fff; border-color:rgba(170,210,255,.32); }
      .gsm-tab-body { flex:1 1 auto; min-height:0; overflow:auto; padding:0 14px 14px; }
      .gsm-tab-panel[hidden] { display:none; }
      .gsm-label { font-size:11px; color:#aeb8cc; margin-bottom:4px; }
      .gsm-value { font-size:16px; font-weight:700; }
      .gsm-kv { display:flex; justify-content:space-between; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.06); font-size:13px; }
      .gsm-kv:last-child { border-bottom:none; }
      .gsm-info-list { margin:8px 0 0; padding-left:0; font-size:13px; list-style:none; }
      .gsm-info-item {
        display:flex; justify-content:space-between; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.06);
      }
      .gsm-info-item strong { text-align:right; color:#f2f7ff; }
      .gsm-city-list { margin:8px 0 0; padding-left:0; max-height:190px; overflow:auto; font-size:13px; list-style:none; }
      .gsm-city-item {
        padding:8px; margin-bottom:6px; border-radius:8px;
        background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.07);
        cursor:pointer; outline:none;
      }
      .gsm-city-item:hover, .gsm-city-item:focus, .gsm-city-selected {
        background:rgba(120,175,255,0.16); border-color:rgba(170,210,255,0.32);
      }
      .gsm-city-main { display:flex; justify-content:space-between; gap:10px; align-items:center; }
      .gsm-city-main strong { color:#f2f7ff; overflow-wrap:anywhere; }
      .gsm-city-main span { color:#b9c7dd; font-size:12px; white-space:nowrap; }
      .gsm-city-meta { margin-top:4px; color:#aeb8cc; font-size:12px; }
      .gsm-neighbor-list { margin:8px 0 0; padding-left:0; max-height:150px; overflow:auto; font-size:13px; list-style:none; }
      .gsm-neighbor-item { 
        padding: 4px 8px; margin-bottom: 4px; border-radius: 6px; 
        background: rgba(255,255,255,0.05); cursor: pointer; transition: background 0.2s; outline:none;
      }
      .gsm-neighbor-item:hover, .gsm-neighbor-item:focus { background: rgba(255,255,255,0.12); color: #fff; }
      .gsm-empty { color:#aeb8cc; font-size:13px; padding:6px 0; }
      .gsm-chip-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
      .gsm-chip {
        display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:4px 8px; border-radius:999px;
        background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07);
      }
      .gsm-swatch { width:10px; height:10px; border-radius:50%; box-shadow:0 0 10px currentColor; }
      .gsm-section-title { font-size:13px; font-weight:700; margin-top:10px; margin-bottom:6px; color:#d9e7ff; }
      .gsm-section-title:first-child { margin-top:0; }
      .gsm-desc { font-size:13px; line-height:1.55; color:#d7e2f3; opacity:.95; }
    `;
    document.head.appendChild(style);
  }
}
