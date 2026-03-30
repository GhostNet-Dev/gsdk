import { FleetPanelController, FleetShipEnergyFocus, FleetShipPanelState } from "./fleetpaneltypes"

const energyFocuses: FleetShipEnergyFocus[] = ["attack", "defense", "navigation", "exploration"]

export class ShipDetailPanel {
  readonly Dom = document.createElement("div")
  private readonly headerEl = document.createElement("div")
  private readonly titleEl = document.createElement("div")
  private readonly closeBtn = document.createElement("button")
  private readonly bodyEl = document.createElement("div")
  private readonly optionsEl = document.createElement("div")
  private readonly descEl = document.createElement("div")
  private fleetId?: string
  private shipId?: string

  constructor(
    private readonly controller: FleetPanelController,
    private readonly parent: HTMLElement = document.body,
  ) {
    this.setup()
    this.parent.appendChild(this.Dom)
  }

  dispose() {
    this.Dom.remove()
  }

  show(fleetId: string, shipId: string) {
    this.fleetId = fleetId
    this.shipId = shipId
    this.Dom.style.display = "grid"
    this.render()
  }

  hide() {
    this.fleetId = undefined
    this.shipId = undefined
    this.Dom.style.display = "none"
  }

  render() {
    if (!this.fleetId || !this.shipId) {
      this.hide()
      return
    }

    const ship = this.controller.getFleetShips(this.fleetId).find((item) => item.id === this.shipId)
    if (!ship) {
      this.hide()
      return
    }

    this.renderShip(ship)
  }

  private setup() {
    this.Dom.style.position = "absolute"
    this.Dom.style.right = "18px"
    this.Dom.style.bottom = "18px"
    this.Dom.style.width = "min(360px, calc(100vw - 24px))"
    this.Dom.style.display = "none"
    this.Dom.style.gap = "12px"
    this.Dom.style.padding = "14px"
    this.Dom.style.borderRadius = "18px"
    this.Dom.style.border = "1px solid rgba(148,163,184,0.22)"
    this.Dom.style.background = "linear-gradient(180deg, rgba(8,12,22,0.96), rgba(6,10,18,0.9))"
    this.Dom.style.backdropFilter = "blur(10px)"
    this.Dom.style.boxShadow = "0 20px 60px rgba(0,0,0,0.35)"
    this.Dom.style.zIndex = "1110"
    this.Dom.style.pointerEvents = "auto"
    this.Dom.style.color = "#e2e8f0"
    this.Dom.style.fontFamily = "\"Trebuchet MS\", \"Segoe UI\", sans-serif"

    this.headerEl.style.display = "flex"
    this.headerEl.style.alignItems = "center"
    this.headerEl.style.justifyContent = "space-between"
    this.headerEl.style.gap = "12px"

    this.titleEl.style.fontSize = "18px"
    this.titleEl.style.fontWeight = "700"
    this.titleEl.style.letterSpacing = "0.03em"

    this.closeBtn.type = "button"
    this.closeBtn.innerText = "×"
    this.closeBtn.setAttribute("aria-label", "Close ship detail panel")
    this.closeBtn.style.width = "34px"
    this.closeBtn.style.height = "34px"
    this.closeBtn.style.borderRadius = "999px"
    this.closeBtn.style.border = "1px solid rgba(148,163,184,0.2)"
    this.closeBtn.style.background = "rgba(15,23,42,0.82)"
    this.closeBtn.style.color = "#e2e8f0"
    this.closeBtn.style.cursor = "pointer"
    this.closeBtn.style.fontSize = "20px"
    this.closeBtn.style.display = "grid"
    this.closeBtn.style.placeItems = "center"
    this.closeBtn.addEventListener("click", () => this.hide())

    this.bodyEl.style.display = "grid"
    this.bodyEl.style.gap = "10px"
    this.bodyEl.style.fontSize = "13px"
    this.bodyEl.style.color = "#cbd5e1"

    this.optionsEl.style.display = "grid"
    this.optionsEl.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))"
    this.optionsEl.style.gap = "8px"

    this.descEl.style.fontSize = "12px"
    this.descEl.style.lineHeight = "1.5"
    this.descEl.style.color = "#94a3b8"

    this.headerEl.append(this.titleEl, this.closeBtn)
    this.Dom.append(this.headerEl, this.bodyEl, this.optionsEl, this.descEl)
  }

  private renderShip(ship: FleetShipPanelState) {
    this.titleEl.innerText = ship.isFlagship ? `${ship.id} · 기함` : ship.id
    this.bodyEl.innerHTML = ""
    this.optionsEl.innerHTML = ""

    const energy = document.createElement("div")
    energy.innerText = `에너지 ${Math.round(ship.energy)}/${Math.round(ship.maxEnergy)}`

    const status = document.createElement("div")
    status.innerText = `현재 집중 ${this.labelEnergyFocus(ship.energyFocus)}`
    status.style.color = "#93c5fd"

    this.bodyEl.append(energy, status)

    energyFocuses.forEach((focus) => {
      const btn = this.makeActionButton(this.labelEnergyFocus(focus), () => {
        this.controller.setShipEnergyFocus(ship.id, focus)
        this.render()
      }, ship.energyFocus === focus)
      this.optionsEl.appendChild(btn)
    })

    this.descEl.innerText = this.describeEnergyFocus(ship.energyFocus)
  }

  private makeActionButton(label: string, onClick: () => void, active: boolean) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.innerText = label
    btn.style.padding = "12px 10px"
    btn.style.borderRadius = "12px"
    btn.style.border = active
      ? "1px solid rgba(125,211,252,0.45)"
      : "1px solid rgba(148,163,184,0.18)"
    btn.style.background = active
      ? "linear-gradient(180deg, rgba(14,165,233,0.28), rgba(3,105,161,0.26))"
      : "rgba(30,41,59,0.8)"
    btn.style.color = active ? "#e0f2fe" : "#e2e8f0"
    btn.style.cursor = "pointer"
    btn.style.fontWeight = "700"
    btn.style.letterSpacing = "0.02em"
    btn.addEventListener("click", onClick)
    return btn
  }

  private labelEnergyFocus(focus: FleetShipEnergyFocus) {
    if (focus === "attack") return "⚔️ 공격"
    if (focus === "defense") return "🛡️ 방어"
    if (focus === "exploration") return "🔭 탐색"
    return "🚀 항행"
  }

  private describeEnergyFocus(focus: FleetShipEnergyFocus) {
    if (focus === "attack") return "무장과 공격 행동에 에너지를 우선 배분합니다."
    if (focus === "defense") return "방어 유지와 생존성을 우선하도록 에너지를 분배합니다."
    if (focus === "exploration") return "센서와 정찰, 미지 구역 탐색에 에너지를 우선 배분합니다."
    return "기동과 이동 성능을 우선하도록 에너지를 분배합니다."
  }
}
