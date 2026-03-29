import * as THREE from "three"
import { FleetFormation } from "@Glibs/gameobjects/fleet/formation"
import { FleetSummary } from "@Glibs/gameobjects/fleet/fleetmanager"
import { FleetPanelController, FleetShipPanelState } from "./fleetpaneltypes"

const formations: FleetFormation[] = ["line", "column", "wedge", "circle"]

export class FleetPanel {
  readonly Dom = document.createElement("div")
  private readonly listCol = document.createElement("div")
  private readonly detailCol = document.createElement("div")
  private readonly headerEl = document.createElement("div")
  private readonly titleEl = document.createElement("div")
  private readonly metaEl = document.createElement("div")
  private readonly membersEl = document.createElement("div")
  private readonly detailModeRow = document.createElement("div")
  private readonly shipGrid = document.createElement("div")
  private readonly spacingValueEl = document.createElement("span")
  private readonly spacingInput = document.createElement("input")
  private readonly formationRow = document.createElement("div")
  private readonly actionRow = document.createElement("div")
  private readonly backBtn = document.createElement("button")
  private refreshTimer?: number
  private mode: "list" | "detail" = "list"
  private detailMode: "ships" | "formation" = "ships"
  private inspectFleetId?: string

  constructor(
    private readonly controller: FleetPanelController,
    private readonly parent: HTMLElement = document.body,
  ) {
    this.setup()
    this.parent.appendChild(this.Dom)
    this.render()
    this.refreshTimer = window.setInterval(() => this.render(), 300)
  }

  dispose() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer)
    this.Dom.remove()
  }

  private setup() {
    this.Dom.id = "fleet-command-panel"
    this.Dom.style.position = "absolute"
    this.Dom.style.left = "50%"
    this.Dom.style.bottom = "14px"
    this.Dom.style.transform = "translateX(-50%)"
    this.Dom.style.width = "min(1120px, calc(100vw - 24px))"
    this.Dom.style.minHeight = "138px"
    this.Dom.style.display = "grid"
    this.Dom.style.gridTemplateColumns = "1fr"
    this.Dom.style.gap = "0"
    this.Dom.style.padding = "14px"
    this.Dom.style.borderRadius = "18px"
    this.Dom.style.border = "1px solid rgba(148,163,184,0.22)"
    this.Dom.style.background = "linear-gradient(180deg, rgba(8,12,22,0.96), rgba(6,10,18,0.88))"
    this.Dom.style.backdropFilter = "blur(10px)"
    this.Dom.style.boxShadow = "0 20px 60px rgba(0,0,0,0.35)"
    this.Dom.style.zIndex = "1100"
    this.Dom.style.pointerEvents = "auto"
    this.Dom.style.color = "#e2e8f0"
    this.Dom.style.fontFamily = "\"Trebuchet MS\", \"Segoe UI\", sans-serif"

    this.listCol.style.display = "grid"
    this.listCol.style.gridAutoFlow = "column"
    this.listCol.style.gridAutoColumns = "minmax(220px, 240px)"
    this.listCol.style.alignItems = "stretch"
    this.listCol.style.gap = "10px"
    this.listCol.style.overflowX = "auto"
    this.listCol.style.overflowY = "hidden"
    this.listCol.style.paddingBottom = "2px"

    this.detailCol.style.display = "grid"
    this.detailCol.style.gridTemplateRows = "auto auto auto auto"
    this.detailCol.style.gap = "10px"
    this.detailCol.style.padding = "8px 10px"
    this.detailCol.style.borderRadius = "14px"
    this.detailCol.style.background = "rgba(15,23,42,0.72)"
    this.detailCol.style.border = "1px solid rgba(148,163,184,0.12)"

    this.headerEl.style.display = "flex"
    this.headerEl.style.alignItems = "center"
    this.headerEl.style.justifyContent = "space-between"
    this.headerEl.style.gap = "12px"

    this.titleEl.style.fontSize = "20px"
    this.titleEl.style.fontWeight = "700"
    this.titleEl.style.letterSpacing = "0.03em"

    this.metaEl.style.display = "flex"
    this.metaEl.style.flexWrap = "wrap"
    this.metaEl.style.gap = "12px"
    this.metaEl.style.fontSize = "13px"
    this.metaEl.style.color = "#94a3b8"

    this.membersEl.style.fontSize = "13px"
    this.membersEl.style.color = "#cbd5e1"
    this.membersEl.style.minHeight = "18px"

    this.detailModeRow.style.display = "flex"
    this.detailModeRow.style.gap = "8px"

    this.shipGrid.style.display = "grid"
    this.shipGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(128px, 1fr))"
    this.shipGrid.style.gap = "10px"

    this.formationRow.style.display = "flex"
    this.formationRow.style.flexWrap = "wrap"
    this.formationRow.style.gap = "8px"

    const spacingRow = document.createElement("label")
    spacingRow.style.display = "grid"
    spacingRow.style.gridTemplateColumns = "80px 1fr auto"
    spacingRow.style.alignItems = "center"
    spacingRow.style.gap = "10px"
    spacingRow.style.fontSize = "13px"
    spacingRow.style.color = "#cbd5e1"
    spacingRow.textContent = "Spacing"

    this.spacingInput.type = "range"
    this.spacingInput.min = "8"
    this.spacingInput.max = "160"
    this.spacingInput.step = "1"
    this.spacingInput.addEventListener("input", () => {
      const selected = this.controller.getSelectedFleetSummary()
      if (!selected) return
      const spacing = Number(this.spacingInput.value)
      this.controller.setSpacing(selected.id, spacing)
      this.spacingValueEl.innerText = `${spacing}`
      this.render()
    })
    spacingRow.appendChild(this.spacingInput)

    this.spacingValueEl.style.fontVariantNumeric = "tabular-nums"
    this.spacingValueEl.style.color = "#f8fafc"
    spacingRow.appendChild(this.spacingValueEl)

    this.actionRow.style.display = "flex"
    this.actionRow.style.gap = "8px"
    this.actionRow.style.flexWrap = "wrap"
    this.actionRow.style.justifyContent = "flex-end"

    this.backBtn.replaceWith()
    const backBtn = this.makeActionButton("Back", () => {
      this.mode = "list"
      this.inspectFleetId = undefined
      this.render()
    }, "neutral")
    this.backBtn.id = backBtn.id
    this.backBtn.className = backBtn.className
    this.backBtn.style.cssText = backBtn.style.cssText
    this.backBtn.innerText = backBtn.innerText
    this.backBtn.addEventListener("click", () => {
      this.mode = "list"
      this.inspectFleetId = undefined
      this.render()
    })

    const holdBtn = this.makeActionButton("Hold", () => {
      const selected = this.controller.getSelectedFleetSummary()
      if (!selected) return
      this.controller.holdPosition(selected.id)
    }, "neutral")
    this.actionRow.append(holdBtn, this.backBtn)

    this.headerEl.append(this.titleEl)
    this.detailCol.append(
      this.headerEl,
      this.metaEl,
      this.detailModeRow,
      this.membersEl,
      this.shipGrid,
      this.formationRow,
      spacingRow,
      this.actionRow,
    )
    this.Dom.append(this.listCol, this.detailCol)

    this.applyStyle()
  }

  private render() {
    const fleets = this.controller.listFleetSummaries()
    const selected = this.inspectFleetId
      ? this.controller.getFleetSummary(this.inspectFleetId)
      : this.controller.getSelectedFleetSummary() ?? fleets[0]

    this.renderFleetList(fleets, this.controller.getSelectedFleetSummary()?.id)
    this.renderDetail(selected)
    this.listCol.style.display = this.mode === "list" ? "grid" : "none"
    this.detailCol.style.display = this.mode === "detail" ? "grid" : "none"
  }

  private renderFleetList(fleets: FleetSummary[], selectedId?: string) {
    this.listCol.innerHTML = ""

    fleets.forEach((fleet, index) => {
      const card = document.createElement("button")
      card.type = "button"
      card.style.display = "grid"
      card.style.gridTemplateColumns = "64px 1fr"
      card.style.alignItems = "stretch"
      card.style.gap = "10px"
      card.style.minHeight = "78px"
      card.style.padding = "12px"
      card.style.borderRadius = "16px"
      card.style.border = fleet.id === selectedId ? "1px solid rgba(125,211,252,0.9)" : "1px solid rgba(148,163,184,0.15)"
      card.style.background = fleet.id === selectedId ? "rgba(14,116,144,0.24)" : "rgba(15,23,42,0.55)"
      card.style.color = "#f8fafc"
      card.style.cursor = "pointer"
      card.style.textAlign = "left"

      const iconBox = document.createElement("div")
      iconBox.style.width = "64px"
      iconBox.style.height = "64px"
      iconBox.style.borderRadius = "14px"
      iconBox.style.display = "grid"
      iconBox.style.alignItems = "center"
      iconBox.style.justifyItems = "center"
      iconBox.style.background = fleet.color ? new THREE.Color(fleet.color).getStyle() : "#7dd3fc"
      iconBox.style.color = "#0f172a"
      iconBox.style.fontWeight = "800"
      iconBox.style.fontSize = "18px"
      iconBox.innerText = `${index + 1}`

      const body = document.createElement("div")
      body.style.display = "grid"
      body.style.gridTemplateColumns = "1fr auto"
      body.style.alignItems = "center"
      body.style.gap = "8px"
      const title = document.createElement("div")
      title.innerText = fleet.name
      title.style.fontSize = "14px"
      title.style.fontWeight = "700"
      const sub = document.createElement("div")
      sub.innerText = `${fleet.memberCount} ships · ${fleet.formation}`
      sub.style.fontSize = "12px"
      sub.style.color = "#94a3b8"
      const titleWrap = document.createElement("div")
      titleWrap.append(title, sub)

      const badge = document.createElement("span")
      badge.innerText = `${fleet.memberCount}`
      badge.style.fontSize = "20px"
      badge.style.fontWeight = "800"
      badge.style.color = "#f8fafc"

      body.append(titleWrap, badge)

      card.append(iconBox, body)
      card.addEventListener("click", () => {
        this.controller.selectFleet(fleet.id)
        this.controller.focusFleet(fleet.id)
        this.inspectFleetId = fleet.id
        this.detailMode = "ships"
        this.mode = "detail"
        this.render()
      })

      this.listCol.appendChild(card)
    })
  }

  private renderDetail(fleet?: FleetSummary) {
    if (!fleet) {
      this.titleEl.innerText = "No Fleet"
      this.headerEl.style.display = "none"
      this.metaEl.innerHTML = ""
      this.membersEl.innerText = "No fleets available."
      this.formationRow.innerHTML = ""
      this.spacingInput.disabled = true
      this.spacingValueEl.innerText = "-"
      return
    }

    this.headerEl.style.display = "flex"
    this.titleEl.innerText = fleet.name
    this.metaEl.innerHTML = ""
    this.appendMeta(`ID ${fleet.id}`)
    this.appendMeta(`${fleet.memberCount} ships`)
    this.appendMeta(`Formation ${fleet.formation}`)
    if (fleet.flagshipId) this.appendMeta(`Flagship ${fleet.flagshipId}`)
    this.membersEl.innerText = this.detailMode === "ships"
      ? "Ship Status"
      : "Formation Control"

    this.spacingInput.disabled = false
    this.spacingInput.value = `${Math.round(fleet.spacing)}`
    this.spacingValueEl.innerText = `${Math.round(fleet.spacing)}`

    this.renderDetailModes()
    this.renderShipGrid(fleet.id)

    this.formationRow.innerHTML = ""
    formations.forEach((formation) => {
      const btn = this.makeActionButton(formation, () => {
        this.controller.setFormation(fleet.id, formation)
        this.render()
      })
      if (formation === fleet.formation) {
        btn.style.background = "rgba(125,211,252,0.2)"
        btn.style.borderColor = "rgba(125,211,252,0.6)"
        btn.style.color = "#e0f2fe"
      }
      this.formationRow.appendChild(btn)
    })

    const isFormationView = this.detailMode === "formation"
    this.shipGrid.style.display = isFormationView ? "none" : "grid"
    this.formationRow.style.display = isFormationView ? "flex" : "none"
    this.spacingInput.parentElement!.style.display = isFormationView ? "grid" : "none"
  }

  private appendMeta(text: string) {
    const item = document.createElement("span")
    item.innerText = text
    this.metaEl.appendChild(item)
  }

  private renderDetailModes() {
    this.detailModeRow.innerHTML = ""
    const shipsBtn = this.makeActionButton("Ships", () => {
      this.detailMode = "ships"
      this.render()
    }, this.detailMode === "ships" ? "primary" : "neutral")
    const formationBtn = this.makeActionButton("Formation", () => {
      this.detailMode = "formation"
      this.render()
    }, this.detailMode === "formation" ? "primary" : "neutral")
    this.detailModeRow.append(shipsBtn, formationBtn)
  }

  private renderShipGrid(fleetId: string) {
    const ships = this.controller.getFleetShips(fleetId)
    this.shipGrid.innerHTML = ""

    ships.forEach((ship) => {
      this.shipGrid.appendChild(this.makeShipCard(ship))
    })
  }

  private makeShipCard(ship: FleetShipPanelState) {
    const card = document.createElement("button")
    card.type = "button"
    card.style.display = "grid"
    card.style.gap = "8px"
    card.style.padding = "10px"
    card.style.borderRadius = "12px"
    card.style.border = ship.selected ? "1px solid rgba(125,211,252,0.65)" : "1px solid rgba(148,163,184,0.16)"
    card.style.background = ship.selected ? "rgba(14,116,144,0.22)" : "rgba(15,23,42,0.56)"
    card.style.color = "#f8fafc"
    card.style.textAlign = "left"
    card.style.cursor = "pointer"

    const name = document.createElement("div")
    name.innerText = ship.id
    name.style.fontSize = "13px"
    name.style.fontWeight = "700"

    const health = document.createElement("div")
    health.style.display = "grid"
    health.style.gap = "6px"

    const label = document.createElement("div")
    label.innerText = `Hull ${Math.round(ship.hull)}/${Math.round(ship.maxHull)}`
    label.style.fontSize = "12px"
    label.style.color = "#cbd5e1"

    const bar = document.createElement("div")
    bar.style.height = "8px"
    bar.style.borderRadius = "999px"
    bar.style.background = "rgba(51,65,85,0.9)"
    bar.style.overflow = "hidden"

    const fill = document.createElement("div")
    fill.style.width = `${Math.max(0, Math.min(100, ship.hullRatio * 100))}%`
    fill.style.height = "100%"
    fill.style.background = ship.hullRatio > 0.65
      ? "linear-gradient(90deg, #22c55e, #86efac)"
      : ship.hullRatio > 0.35
        ? "linear-gradient(90deg, #f59e0b, #fcd34d)"
        : "linear-gradient(90deg, #ef4444, #fca5a5)"
    bar.appendChild(fill)

    const energy = document.createElement("div")
    energy.style.display = "grid"
    energy.style.gap = "6px"

    const energyLabel = document.createElement("div")
    energyLabel.innerText = `Energy ${Math.round(ship.energy)}/${Math.round(ship.maxEnergy)}`
    energyLabel.style.fontSize = "12px"
    energyLabel.style.color = "#93c5fd"

    const energyBar = document.createElement("div")
    energyBar.style.height = "8px"
    energyBar.style.borderRadius = "999px"
    energyBar.style.background = "rgba(30,41,59,0.95)"
    energyBar.style.overflow = "hidden"

    const energyFill = document.createElement("div")
    energyFill.style.width = `${Math.max(0, Math.min(100, ship.energyRatio * 100))}%`
    energyFill.style.height = "100%"
    energyFill.style.background = "linear-gradient(90deg, #38bdf8, #93c5fd)"
    energyBar.appendChild(energyFill)

    energy.append(energyLabel, energyBar)
    card.append(name, health, energy)
    card.addEventListener("click", () => {
      this.controller.focusShip(ship.id)
      this.render()
    })
    return card
  }

  private makeActionButton(label: string, onClick: () => void, tone: "neutral" | "primary" = "neutral") {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.innerText = label
    btn.style.padding = "10px 14px"
    btn.style.minWidth = "88px"
    btn.style.borderRadius = "12px"
    btn.style.border = tone === "primary"
      ? "1px solid rgba(125,211,252,0.45)"
      : "1px solid rgba(148,163,184,0.18)"
    btn.style.background = tone === "primary"
      ? "linear-gradient(180deg, rgba(14,165,233,0.28), rgba(3,105,161,0.26))"
      : "rgba(30,41,59,0.8)"
    btn.style.color = tone === "primary" ? "#e0f2fe" : "#e2e8f0"
    btn.style.cursor = "pointer"
    btn.style.textTransform = "capitalize"
    btn.style.fontWeight = "700"
    btn.style.letterSpacing = "0.02em"
    btn.addEventListener("click", onClick)
    return btn
  }

  private applyStyle() {
    if (document.getElementById("fleet-command-panel-style")) return

    const style = document.createElement("style")
    style.id = "fleet-command-panel-style"
    style.textContent = `
      #fleet-command-panel button:hover {
        filter: brightness(1.08);
      }
      #fleet-command-panel input[type="range"] {
        width: 100%;
      }
      @media (max-width: 860px) {
        #fleet-command-panel {
          bottom: 10px !important;
          width: calc(100vw - 16px) !important;
        }
        #fleet-command-panel {
          padding: 10px !important;
        }
        #fleet-command-panel > div:first-child {
          grid-auto-columns: minmax(200px, 220px) !important;
        }
      }
    `
    document.head.appendChild(style)
  }
}
