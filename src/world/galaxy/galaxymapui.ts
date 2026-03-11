import { PlanetInfoViewModel } from "./galaxytypes";

const GALAXY_UI_PANEL_WIDTH = 340;
const GALAXY_UI_GAP = 14;
const GALAXY_UI_BOTTOM_PANEL_HEIGHT = 260;

export function getGalaxyFocusCenterNdc(viewportWidth: number, viewportHeight: number): { x: number; y: number } {
  const safeWidth = Math.max(1, viewportWidth);
  const safeHeight = Math.max(1, viewportHeight);

  if (safeWidth >= safeHeight) {
    // Landscape: UI is on the right side.
    // Push center slightly more to the left by adding a larger gap
    const reservedWidth = GALAXY_UI_PANEL_WIDTH + GALAXY_UI_GAP * 4;
    return {
      x: -(reservedWidth / safeWidth),
      y: 0
    };
  } else {
    // Portrait: UI is at the bottom.
    // We need to push the planet UP significantly to clear the bottom UI.
    // Increasing reservedHeight and the multiplier to ensure it's in the top half.
    const reservedHeight = GALAXY_UI_BOTTOM_PANEL_HEIGHT + GALAXY_UI_GAP * 6;
    return {
      x: 0,
      y: (reservedHeight / safeHeight) * 1.7
    };
  }
}

export class GalaxyMapUI {
  private root: HTMLDivElement;
  private planetName!: HTMLElement;
  private planetFactionBadge!: HTMLElement;
  private planetChokeBadge!: HTMLElement;
  private planetSubtitle!: HTMLElement;
  private planetEconomy!: HTMLElement;
  private planetIndustry!: HTMLElement;
  private planetDefense!: HTMLElement;
  private planetFleet!: HTMLElement;
  private planetPopulation!: HTMLElement;
  private planetResource!: HTMLElement;
  private planetDegree!: HTMLElement;
  private planetChokeScore!: HTMLElement;
  private planetDescription!: HTMLElement;
  private planetNeighbors!: HTMLElement;

  constructor(container: HTMLElement = document.body) {
    this.ensureStyle();
    this.root = document.createElement("div");
    this.root.className = "gsm-root";
    this.root.innerHTML = `
      <div class="gsm-panel">
        <div class="gsm-planet-title">
          <span data-ref="planetName">Atlas</span>
          <span class="gsm-badge" data-ref="planetFactionBadge">NEUTRAL</span>
          <span class="gsm-badge" data-ref="planetChokeBadge" style="display:none;">요충지</span>
        </div>
        <div class="gsm-small" data-ref="planetSubtitle">은하 회랑 중심축</div>

        <div class="gsm-grid">
          <div class="gsm-card"><div class="gsm-label">경제력</div><div class="gsm-value" data-ref="planetEconomy">0</div></div>
          <div class="gsm-card"><div class="gsm-label">산업력</div><div class="gsm-value" data-ref="planetIndustry">0</div></div>
          <div class="gsm-card"><div class="gsm-label">방어력</div><div class="gsm-value" data-ref="planetDefense">0</div></div>
          <div class="gsm-card"><div class="gsm-label">주둔 함대</div><div class="gsm-value" data-ref="planetFleet">0</div></div>
        </div>

        <div class="gsm-kv"><span>인구 지수</span><strong data-ref="planetPopulation">0</strong></div>
        <div class="gsm-kv"><span>자원</span><strong data-ref="planetResource">-</strong></div>
        <div class="gsm-kv"><span>연결 수</span><strong data-ref="planetDegree">0</strong></div>
        <div class="gsm-kv"><span>요충 점수</span><strong data-ref="planetChokeScore">0.00</strong></div>

        <div class="gsm-section-title">설명</div>
        <div class="gsm-desc" data-ref="planetDescription"></div>

        <div class="gsm-section-title">연결된 행성</div>
        <ul class="gsm-neighbor-list" data-ref="planetNeighbors"></ul>
      </div>

      <div class="gsm-legend-panel">
        <h3>전선 / 요충지 표시</h3>
        <div class="gsm-chip-row">
          <span class="gsm-chip"><span class="gsm-swatch" style="color:#67c7ff;background:#67c7ff;"></span> Alliance</span>
          <span class="gsm-chip"><span class="gsm-swatch" style="color:#ff7b9e;background:#ff7b9e;"></span> Empire</span>
          <span class="gsm-chip"><span class="gsm-swatch" style="color:#ffc96a;background:#ffc96a;"></span> Guild</span>
          <span class="gsm-chip"><span class="gsm-swatch" style="color:#b7b9d8;background:#b7b9d8;"></span> Neutral</span>
          <span class="gsm-chip"><span class="gsm-swatch" style="color:#ffe48f;background:#ffe48f;"></span> 요충지</span>
        </div>
        <div class="gsm-small" style="margin-top:8px;">
          다른 진영을 잇는 항로는 혼합 전선 색상으로 표시됩니다.<br />
          각 행성 위의 깃발은 진영색으로 구분됩니다.<br />
          행성 이름은 깃발과 겹치지 않도록 하단에 표시됩니다.
        </div>
      </div>
    `;

    this.root.style.display = "none";
    container.appendChild(this.root);
    this.cacheRefs();
    this.updateLayoutMode();
    window.addEventListener("resize", this.updateLayoutMode);
  }

  updatePlanet(info: PlanetInfoViewModel): void {
    this.planetName.textContent = info.name;
    this.planetFactionBadge.textContent = info.factionLabel;
    this.planetFactionBadge.setAttribute(
      "style",
      `color:${info.factionTextColor};background:${info.factionBgColor};border-color:${info.factionBorderColor};`
    );

    this.planetChokeBadge.style.display = info.isChokepoint ? "inline-flex" : "none";
    this.planetSubtitle.textContent = info.subtitle;

    this.planetEconomy.textContent = String(info.economy);
    this.planetIndustry.textContent = String(info.industry);
    this.planetDefense.textContent = String(info.defense);
    this.planetFleet.textContent = String(info.fleet);
    this.planetPopulation.textContent = String(info.population);
    this.planetResource.textContent = info.resource;
    this.planetDegree.textContent = String(info.degree);
    this.planetChokeScore.textContent = info.chokeScore.toFixed(2);
    this.planetDescription.textContent = info.description;
    this.planetNeighbors.innerHTML = info.neighbors.map((n) => `<li>${n}</li>`).join("");
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? "block" : "none";
  }

  dispose(): void {
    window.removeEventListener("resize", this.updateLayoutMode);
    this.root.remove();
  }

  private updateLayoutMode = (): void => {
    const landscape = window.innerWidth >= window.innerHeight;
    this.root.classList.toggle("gsm-layout-landscape", landscape);
    this.root.classList.toggle("gsm-layout-portrait", !landscape);
  };

  private cacheRefs(): void {
    const q = (name: string) => this.root.querySelector(`[data-ref="${name}"]`) as HTMLElement;
    this.planetName = q("planetName");
    this.planetFactionBadge = q("planetFactionBadge");
    this.planetChokeBadge = q("planetChokeBadge");
    this.planetSubtitle = q("planetSubtitle");
    this.planetEconomy = q("planetEconomy");
    this.planetIndustry = q("planetIndustry");
    this.planetDefense = q("planetDefense");
    this.planetFleet = q("planetFleet");
    this.planetPopulation = q("planetPopulation");
    this.planetResource = q("planetResource");
    this.planetDegree = q("planetDegree");
    this.planetChokeScore = q("planetChokeScore");
    this.planetDescription = q("planetDescription");
    this.planetNeighbors = q("planetNeighbors");
  }

  private ensureStyle(): void {
    if (document.getElementById("gsm-style")) return;

    const style = document.createElement("style");
    style.id = "gsm-style";
    style.textContent = `
      .gsm-root { position:absolute; inset:0; pointer-events:none; font-family:Arial,sans-serif; color:#f2f7ff; }
      .gsm-panel, .gsm-legend-panel {
        position:absolute; background:rgba(8,12,22,0.70); border:1px solid rgba(190,220,255,0.18);
        border-radius:14px; backdrop-filter:blur(8px); box-shadow:0 0 24px rgba(90,150,255,0.16);
      }
      .gsm-panel { right:14px; top:14px; width:340px; padding:14px; }
      .gsm-legend-panel { right:14px; bottom:14px; width:340px; padding:12px 14px; font-size:12px; line-height:1.5; }
      .gsm-layout-portrait .gsm-panel {
        left:14px; right:14px; top:auto; bottom:14px; width:auto; max-width:none;
        max-height:calc(100vh - 28px); overflow:auto;
      }
      .gsm-layout-portrait .gsm-legend-panel { display:none; }
      .gsm-planet-title { display:flex; align-items:center; gap:8px; margin-bottom:8px; font-size:20px; font-weight:700; flex-wrap:wrap; }
      .gsm-small { color:#aeb8cc; }
      .gsm-badge {
        display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:999px;
        font-size:11px; font-weight:700; letter-spacing:.03em; border:1px solid rgba(255,255,255,.12);
        background:rgba(255,255,255,.06);
      }
      .gsm-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:10px 0 12px; }
      .gsm-card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.06); border-radius:10px; padding:8px 10px; }
      .gsm-label { font-size:11px; color:#aeb8cc; margin-bottom:4px; }
      .gsm-value { font-size:16px; font-weight:700; }
      .gsm-kv { display:flex; justify-content:space-between; gap:10px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.06); font-size:13px; }
      .gsm-kv:last-child { border-bottom:none; }
      .gsm-neighbor-list { margin:8px 0 0; padding-left:18px; max-height:140px; overflow:auto; font-size:13px; }
      .gsm-chip-row { display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; }
      .gsm-chip {
        display:inline-flex; align-items:center; gap:6px; font-size:12px; padding:4px 8px; border-radius:999px;
        background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07);
      }
      .gsm-swatch { width:10px; height:10px; border-radius:50%; box-shadow:0 0 10px currentColor; }
      .gsm-section-title { font-size:13px; font-weight:700; margin-top:10px; margin-bottom:6px; color:#d9e7ff; }
      .gsm-desc { font-size:13px; line-height:1.55; color:#d7e2f3; opacity:.95; }
      .gsm-legend-panel h3 { margin:0 0 10px; font-size:16px; letter-spacing:.02em; }
    `;
    document.head.appendChild(style);
  }
}
