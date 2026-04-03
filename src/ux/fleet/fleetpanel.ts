import * as THREE from "three"
import { FleetFormation } from "@Glibs/gameobjects/fleet/formation"
import { FleetMoveMode, FleetOrder, FleetOrderType } from "@Glibs/gameobjects/fleet/fleet"
import { FleetSummary } from "@Glibs/gameobjects/fleet/fleetmanager"
import { BattlePhase } from "@Glibs/gameobjects/fleet/battlephasecontroller"
import { FleetPanelController, FleetShipPanelState } from "./fleetpaneltypes"
import { ShipDetailPanel } from "./shipdetailpanel"

const formations: FleetFormation[] = ["line", "column", "wedge", "circle"]
const moveModes: FleetMoveMode[] = [
  FleetMoveMode.Formation,
  FleetMoveMode.FlagshipFollow,
  FleetMoveMode.FlagshipFormation,
]

export class FleetPanel {
  readonly Dom = document.createElement("div")
  private readonly topRightControls = document.createElement("div")
  private readonly phaseActionBtn = document.createElement("button")
  private readonly shipDetailPanel: ShipDetailPanel
  private readonly listCol = document.createElement("div")
  private readonly detailCol = document.createElement("div")
  private readonly headerEl = document.createElement("div")
  private readonly titleBtn = document.createElement("button")
  private readonly titleStateEl = document.createElement("span")
  private readonly headerActionsEl = document.createElement("div")
  private readonly settingsBtn = document.createElement("button")
  private readonly titleEl = document.createElement("div")
  private readonly metaEl = document.createElement("div")
  private readonly battleRow = document.createElement("div")
  private readonly battlePhaseEl = document.createElement("div")
  private readonly battleActionsEl = document.createElement("div")
  private readonly plannedOrderEl = document.createElement("div")
  private readonly membersEl = document.createElement("div")
  private readonly detailViewport = document.createElement("div")
  private readonly detailTrack = document.createElement("div")
  private readonly settingsPanel = document.createElement("div")
  private readonly overviewPanel = document.createElement("div")
  private readonly shipPanel = document.createElement("div")
  private readonly shipGrid = document.createElement("div")
  private readonly spacingValueEl = document.createElement("span")
  private readonly spacingInput = document.createElement("input")
  private readonly settingsControlRow = document.createElement("div")
  private readonly formationRow = document.createElement("div")
  private readonly moveModeRow = document.createElement("div")
  private readonly planRow = document.createElement("div")
  private readonly settingsSummaryEl = document.createElement("div")
  private readonly closeBtn = document.createElement("button")
  private floatingMenuEl?: HTMLElement
  private closeFloatingMenuListener?: (event: PointerEvent) => void
  private refreshTimer?: number
  private mode: "list" | "detail" = "list"
  private detailSlide: "settings" | "overview" | "ship" = "overview"
  private inspectFleetId?: string
  private selectedShipId?: string
  private formationMenuOpen = false
  private moveModeMenuOpen = false
  private planMenuOpen = false
  private dragPointerId?: number
  private dragStartX = 0
  private dragStartY = 0
  private dragDeltaX = 0
  private dragTracking = false
  private isDraggingSlide = false

  constructor(
    private readonly controller: FleetPanelController,
    private readonly parent: HTMLElement = document.body,
  ) {
    this.shipDetailPanel = new ShipDetailPanel(this.controller)
    this.setup()
    this.parent.appendChild(this.Dom)
    this.render()
    this.refreshTimer = window.setInterval(() => this.render(), 300)
  }

  dispose() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer)
    this.closeFloatingMenu()
    this.shipDetailPanel.dispose()
    this.topRightControls.remove()
    this.Dom.remove()
  }

  private setup() {
    this.topRightControls.style.position = "absolute"
    this.topRightControls.style.top = "18px"
    this.topRightControls.style.right = "18px"
    this.topRightControls.style.zIndex = "1200"
    this.topRightControls.style.display = "flex"
    this.topRightControls.style.alignItems = "center"
    this.topRightControls.style.justifyContent = "center"
    this.topRightControls.style.pointerEvents = "auto"

    this.phaseActionBtn.type = "button"
    this.phaseActionBtn.style.width = "56px"
    this.phaseActionBtn.style.height = "56px"
    this.phaseActionBtn.style.display = "grid"
    this.phaseActionBtn.style.placeItems = "center"
    this.phaseActionBtn.style.borderRadius = "999px"
    this.phaseActionBtn.style.border = "1px solid rgba(148,163,184,0.24)"
    this.phaseActionBtn.style.background = "linear-gradient(180deg, rgba(8,12,22,0.96), rgba(6,10,18,0.88))"
    this.phaseActionBtn.style.boxShadow = "0 18px 40px rgba(0,0,0,0.28)"
    this.phaseActionBtn.style.color = "#f8fafc"
    this.phaseActionBtn.style.fontSize = "24px"
    this.phaseActionBtn.style.cursor = "pointer"
    this.phaseActionBtn.style.backdropFilter = "blur(10px)"
    this.topRightControls.appendChild(this.phaseActionBtn)
    this.parent.appendChild(this.topRightControls)

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
    this.detailCol.style.gridTemplateRows = "auto auto 1fr"
    this.detailCol.style.gap = "10px"
    this.detailCol.style.padding = "8px 10px"
    this.detailCol.style.borderRadius = "14px"
    this.detailCol.style.background = "rgba(15,23,42,0.72)"
    this.detailCol.style.border = "1px solid rgba(148,163,184,0.12)"

    this.headerEl.style.display = "flex"
    this.headerEl.style.alignItems = "center"
    this.headerEl.style.justifyContent = "space-between"
    this.headerEl.style.gap = "12px"

    this.titleEl.style.display = "flex"
    this.titleEl.style.alignItems = "center"
    this.titleEl.style.gap = "8px"
    this.titleEl.style.minWidth = "0"

    this.titleBtn.type = "button"
    this.titleBtn.style.border = "0"
    this.titleBtn.style.padding = "0"
    this.titleBtn.style.background = "transparent"
    this.titleBtn.style.color = "#f8fafc"
    this.titleBtn.style.cursor = "pointer"
    this.titleBtn.style.fontSize = "20px"
    this.titleBtn.style.fontWeight = "700"
    this.titleBtn.style.letterSpacing = "0.03em"
    this.titleBtn.style.whiteSpace = "nowrap"
    this.titleBtn.addEventListener("click", () => {
      this.detailSlide = "overview"
      this.render()
    })

    this.titleStateEl.style.fontSize = "16px"
    this.titleStateEl.style.color = "#94a3b8"
    this.titleStateEl.style.whiteSpace = "nowrap"
    this.titleStateEl.style.overflow = "hidden"
    this.titleStateEl.style.textOverflow = "ellipsis"

    this.headerActionsEl.style.display = "flex"
    this.headerActionsEl.style.alignItems = "center"
    this.headerActionsEl.style.gap = "8px"

    this.settingsBtn.type = "button"
    this.settingsBtn.innerText = "⚙"
    this.settingsBtn.setAttribute("aria-label", "Fleet settings")
    this.settingsBtn.style.width = "34px"
    this.settingsBtn.style.height = "34px"
    this.settingsBtn.style.borderRadius = "999px"
    this.settingsBtn.style.border = "1px solid rgba(148,163,184,0.2)"
    this.settingsBtn.style.background = "rgba(15,23,42,0.82)"
    this.settingsBtn.style.color = "#e2e8f0"
    this.settingsBtn.style.cursor = "pointer"
    this.settingsBtn.style.fontSize = "16px"
    this.settingsBtn.style.lineHeight = "1"
    this.settingsBtn.style.display = "grid"
    this.settingsBtn.style.placeItems = "center"
    this.settingsBtn.addEventListener("click", () => {
      this.detailSlide = this.detailSlide === "settings" ? "overview" : "settings"
      this.render()
    })

    this.closeBtn.type = "button"
    this.closeBtn.innerText = "×"
    this.closeBtn.setAttribute("aria-label", "Close fleet panel")
    this.closeBtn.style.width = "34px"
    this.closeBtn.style.height = "34px"
    this.closeBtn.style.borderRadius = "999px"
    this.closeBtn.style.border = "1px solid rgba(148,163,184,0.2)"
    this.closeBtn.style.background = "rgba(15,23,42,0.82)"
    this.closeBtn.style.color = "#e2e8f0"
    this.closeBtn.style.cursor = "pointer"
    this.closeBtn.style.fontSize = "20px"
    this.closeBtn.style.lineHeight = "1"
    this.closeBtn.style.display = "grid"
    this.closeBtn.style.placeItems = "center"
    this.closeBtn.addEventListener("click", () => {
      this.mode = "list"
      this.inspectFleetId = undefined
      this.selectedShipId = undefined
      this.detailSlide = "overview"
      this.shipDetailPanel.hide()
      this.render()
    })

    this.metaEl.style.display = "flex"
    this.metaEl.style.flexWrap = "wrap"
    this.metaEl.style.gap = "12px"
    this.metaEl.style.fontSize = "13px"
    this.metaEl.style.color = "#94a3b8"

    this.battleRow.style.display = "grid"
    this.battleRow.style.gridTemplateColumns = "1fr"
    this.battleRow.style.alignItems = "center"
    this.battleRow.style.gap = "10px"

    this.battlePhaseEl.style.fontSize = "12px"
    this.battlePhaseEl.style.color = "#cbd5e1"
    this.battlePhaseEl.style.minHeight = "0"

    this.battleActionsEl.style.display = "flex"
    this.battleActionsEl.style.flexWrap = "wrap"
    this.battleActionsEl.style.justifyContent = "flex-end"
    this.battleActionsEl.style.gap = "8px"
    this.battleActionsEl.style.minHeight = "0"

    this.plannedOrderEl.style.fontSize = "12px"
    this.plannedOrderEl.style.color = "#93c5fd"
    this.plannedOrderEl.style.minHeight = "0"

    this.membersEl.style.fontSize = "13px"
    this.membersEl.style.color = "#cbd5e1"
    this.membersEl.style.minHeight = "0"

    this.detailViewport.style.position = "relative"
    this.detailViewport.style.overflow = "hidden"
    this.detailViewport.style.borderRadius = "14px"
    this.detailViewport.style.border = "1px solid rgba(148,163,184,0.12)"
    this.detailViewport.style.background = "rgba(2,6,23,0.24)"
    this.detailViewport.style.minHeight = "0"
    this.detailViewport.style.height = "100%"
    this.detailViewport.style.touchAction = "pan-y"
    this.detailViewport.style.cursor = "grab"

    this.detailTrack.style.display = "flex"
    this.detailTrack.style.width = "300%"
    this.detailTrack.style.height = "100%"
    this.detailTrack.style.transition = "transform 220ms ease"

    this.settingsPanel.style.flex = "0 0 33.3333%"
    this.settingsPanel.style.minWidth = "0"
    this.settingsPanel.style.display = "grid"
    this.settingsPanel.style.alignContent = "start"
    this.settingsPanel.style.gap = "12px"
    this.settingsPanel.style.padding = "14px"

    this.overviewPanel.style.flex = "0 0 33.3333%"
    this.overviewPanel.style.minWidth = "0"
    this.overviewPanel.style.display = "grid"
    this.overviewPanel.style.alignContent = "start"
    this.overviewPanel.style.gap = "12px"
    this.overviewPanel.style.padding = "14px"

    this.shipPanel.style.flex = "0 0 33.3333%"
    this.shipPanel.style.minWidth = "0"
    this.shipPanel.style.height = "100%"
    this.shipPanel.style.padding = "14px"

    this.shipGrid.style.display = "grid"
    this.shipGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(98px, 132px))"
    this.shipGrid.style.gap = "8px"
    this.shipGrid.style.alignContent = "start"

    this.settingsSummaryEl.style.fontSize = "13px"
    this.settingsSummaryEl.style.lineHeight = "1.5"
    this.settingsSummaryEl.style.color = "#cbd5e1"
    this.settingsSummaryEl.style.display = "none"

    this.settingsControlRow.className = "fleet-settings-control-row"
    this.formationRow.style.display = "flex"
    this.formationRow.style.minWidth = "0"

    this.moveModeRow.style.display = "flex"
    this.moveModeRow.style.minWidth = "0"

    this.settingsControlRow.style.display = "grid"
    this.settingsControlRow.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))"
    this.settingsControlRow.style.gap = "10px"

    this.planRow.style.display = "flex"
    this.planRow.style.minWidth = "0"

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
      const fleetId = this.inspectFleetId ?? this.controller.getSelectedFleetSummary()?.id
      if (!fleetId) return
      const spacing = Number(this.spacingInput.value)
      this.controller.setSpacing(fleetId, spacing)
      this.spacingValueEl.innerText = `${spacing}`
      this.render()
    })
    spacingRow.appendChild(this.spacingInput)

    this.spacingValueEl.style.fontVariantNumeric = "tabular-nums"
    this.spacingValueEl.style.color = "#f8fafc"
    spacingRow.appendChild(this.spacingValueEl)

    this.titleEl.append(this.titleBtn, this.titleStateEl)
    this.headerActionsEl.append(this.settingsBtn, this.closeBtn)
    this.headerEl.append(this.titleEl, this.headerActionsEl)
    this.overviewPanel.append(
      this.battleRow,
      this.plannedOrderEl,
      this.membersEl,
      this.shipGrid,
    )
    this.settingsPanel.append(
      this.settingsSummaryEl,
      this.settingsControlRow,
      spacingRow,
    )
    this.shipPanel.append(this.shipDetailPanel.Dom)
    this.detailTrack.append(this.settingsPanel, this.overviewPanel, this.shipPanel)
    this.detailViewport.append(this.detailTrack)
    this.detailCol.append(
      this.headerEl,
      this.metaEl,
      this.detailViewport,
    )
    this.battleRow.append(this.battlePhaseEl, this.battleActionsEl)
    this.Dom.append(this.listCol, this.detailCol)

    this.bindPanelEventShield()
    this.bindSlideDrag()
    this.applyStyle()
  }

  private render() {
    this.closeFloatingMenu()
    const fleets = this.controller.listFleetSummaries().filter((fleet) => this.controller.canControlFleet(fleet.id))
    const selected = this.inspectFleetId
      ? this.controller.getFleetSummary(this.inspectFleetId)
      : this.controller.getSelectedFleetSummary() ?? fleets[0]
    const visibleSelected = selected && this.controller.canControlFleet(selected.id) ? selected : fleets[0]
    const snapshot = this.controller.getBattlePhaseSnapshot()

    this.renderFleetList(fleets, this.controller.getSelectedFleetSummary()?.id)
    this.renderDetail(visibleSelected)
    this.renderGlobalPhaseAction(snapshot)
    this.shipDetailPanel.render()
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
      card.style.border = fleet.id === selectedId
        ? "1px solid rgba(125,211,252,0.9)"
        : "1px solid rgba(148,163,184,0.15)"
      card.style.background = fleet.id === selectedId
        ? "rgba(14,116,144,0.24)"
        : "rgba(15,23,42,0.55)"
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
        this.selectedShipId = undefined
        this.shipDetailPanel.hide()
        this.detailSlide = "overview"
        this.mode = "detail"
        this.render()
      })

      this.listCol.appendChild(card)
    })
  }

  private renderDetail(fleet?: FleetSummary) {
    if (!fleet) {
      this.titleBtn.innerText = "No Fleet"
      this.titleStateEl.innerText = ""
      this.headerEl.style.display = "none"
      this.metaEl.innerHTML = ""
      this.battlePhaseEl.innerText = ""
      this.battleActionsEl.innerHTML = ""
      this.plannedOrderEl.innerText = ""
      this.membersEl.innerText = "No fleets available."
      this.settingsControlRow.innerHTML = ""
      this.formationRow.innerHTML = ""
      this.moveModeRow.innerHTML = ""
      this.planRow.innerHTML = ""
      this.spacingInput.disabled = true
      this.spacingValueEl.innerText = "-"
      this.selectedShipId = undefined
      this.shipDetailPanel.hide()
      this.detailTrack.style.transform = "translateX(-33.3333%)"
      return
    }

    this.headerEl.style.display = "flex"
    this.titleBtn.innerText = fleet.name
    this.titleStateEl.innerText = `> ${this.currentSlideLabel()}`
    this.settingsBtn.style.borderColor = this.detailSlide === "settings"
      ? "rgba(125,211,252,0.6)"
      : "rgba(148,163,184,0.2)"
    this.settingsBtn.style.background = this.detailSlide === "settings"
      ? "linear-gradient(180deg, rgba(14,165,233,0.28), rgba(3,105,161,0.26))"
      : "rgba(15,23,42,0.82)"
    this.metaEl.innerHTML = ""
    this.membersEl.innerText = ""

    const canControlFleet = this.controller.canControlFleet(fleet.id)
    this.spacingInput.disabled = !canControlFleet
    this.spacingInput.value = `${Math.round(fleet.spacing)}`
    this.spacingValueEl.innerText = `${Math.round(fleet.spacing)}`

    this.renderBattleControls(fleet)
    this.renderShipGrid(fleet.id)

    this.formationRow.innerHTML = ""
    this.formationRow.appendChild(this.makeLabeledPopupSelect(
      "Formation",
      fleet.formation,
      formations.map((formation) => ({
        label: formation,
        active: formation === fleet.formation,
        onSelect: () => {
          this.formationMenuOpen = false
          this.controller.setFormation(fleet.id, formation)
          this.render()
        },
      })),
      this.formationMenuOpen,
      () => {
        if (!canControlFleet) return
        this.formationMenuOpen = !this.formationMenuOpen
        this.moveModeMenuOpen = false
        this.planMenuOpen = false
        this.render()
      },
      !canControlFleet,
    ))

    this.moveModeRow.innerHTML = ""
    this.moveModeRow.appendChild(this.makeLabeledPopupSelect(
      "Move Mode",
      this.moveModeLabel(fleet.moveMode),
      moveModes.map((moveMode) => ({
        label: this.moveModeLabel(moveMode),
        active: moveMode === fleet.moveMode,
        onSelect: () => {
          this.moveModeMenuOpen = false
          this.controller.setMoveMode(fleet.id, moveMode)
          this.render()
        },
      })),
      this.moveModeMenuOpen,
      () => {
        if (!canControlFleet) return
        this.moveModeMenuOpen = !this.moveModeMenuOpen
        this.formationMenuOpen = false
        this.planMenuOpen = false
        this.render()
      },
      !canControlFleet,
    ))

    this.planRow.innerHTML = ""
    this.planRow.appendChild(this.makeLabeledPopupSelect(
      "Plans",
      "작전 관리",
      [
        {
          label: "Plan Hold",
          active: false,
          onSelect: () => {
            this.planMenuOpen = false
            this.controller.planHold(fleet.id)
            this.render()
          },
        },
        {
          label: "Clear Plans",
          active: false,
          onSelect: () => {
            this.planMenuOpen = false
            this.controller.clearPlans()
            this.render()
          },
        },
      ],
      this.planMenuOpen,
      () => {
        this.planMenuOpen = !this.planMenuOpen
        this.formationMenuOpen = false
        this.moveModeMenuOpen = false
        this.render()
      },
      !canControlFleet,
    ))

    this.settingsControlRow.innerHTML = ""
    this.settingsControlRow.append(this.formationRow, this.moveModeRow, this.planRow)
    this.syncSlidePosition(fleet.id)
  }

  private renderBattleControls(fleet: FleetSummary) {
    const snapshot = this.controller.getBattlePhaseSnapshot()
    const plannedOrder = this.controller.getPlannedOrder(fleet.id)
    const canControlFleet = this.controller.canControlFleet(fleet.id)
    const phaseLabel = snapshot.phase === BattlePhase.Planning
      ? ""
      : `Executing · ${snapshot.remaining.toFixed(1)}s left`

    this.battlePhaseEl.innerText = phaseLabel
    this.plannedOrderEl.innerText = ""

    this.battleActionsEl.innerHTML = ""
    if (!canControlFleet) {
      this.plannedOrderEl.innerText = ""
    }
  }

  private renderGlobalPhaseAction(snapshot: ReturnType<FleetPanelController["getBattlePhaseSnapshot"]>) {
    this.phaseActionBtn.replaceChildren()

    const icon = document.createElement("span")
    icon.setAttribute("aria-hidden", "true")
    icon.style.transform = snapshot.phase === BattlePhase.Executing ? "none" : "translateX(2px)"
    icon.textContent = snapshot.phase === BattlePhase.Executing ? "■" : "▶"
    this.phaseActionBtn.appendChild(icon)

    if (snapshot.phase === BattlePhase.Executing) {
      this.phaseActionBtn.setAttribute("aria-label", "Stop execution")
      this.phaseActionBtn.title = "Stop"
      this.phaseActionBtn.onclick = () => {
        this.controller.stopExecution()
        this.render()
      }
      this.phaseActionBtn.disabled = false
      this.phaseActionBtn.style.opacity = "1"
      this.phaseActionBtn.style.cursor = "pointer"
      this.phaseActionBtn.style.color = "#fecaca"
      this.phaseActionBtn.style.borderColor = "rgba(248,113,113,0.42)"
      return
    }

    this.phaseActionBtn.setAttribute("aria-label", "Execute plans")
    this.phaseActionBtn.title = "Execute"
    this.phaseActionBtn.onclick = () => {
      this.controller.commitPlans()
      this.render()
    }
    this.phaseActionBtn.disabled = snapshot.pendingOrderCount === 0
    this.phaseActionBtn.style.opacity = this.phaseActionBtn.disabled ? "0.45" : "1"
    this.phaseActionBtn.style.cursor = this.phaseActionBtn.disabled ? "default" : "pointer"
    this.phaseActionBtn.style.color = "#bfdbfe"
    this.phaseActionBtn.style.borderColor = "rgba(96,165,250,0.42)"
  }

  private renderShipGrid(fleetId: string) {
    const ships = this.controller.getFleetShips(fleetId)
    this.shipGrid.innerHTML = ""

    ships.forEach((ship) => {
      this.shipGrid.appendChild(this.makeShipCard(fleetId, ship))
    })
  }

  private makeShipCard(fleetId: string, ship: FleetShipPanelState) {
    const card = document.createElement("button")
    card.type = "button"
    card.style.display = "grid"
    card.style.gap = "6px"
    card.style.padding = "8px 9px"
    card.style.borderRadius = "12px"
    card.style.border = ship.selected ? "1px solid rgba(125,211,252,0.65)" : "1px solid rgba(148,163,184,0.16)"
    card.style.background = ship.selected ? "rgba(14,116,144,0.22)" : "rgba(15,23,42,0.56)"
    card.style.color = "#f8fafc"
    card.style.textAlign = "left"
    card.style.cursor = "pointer"

    const head = document.createElement("div")
    head.style.display = "flex"
    head.style.alignItems = "center"
    head.style.justifyContent = "space-between"
    head.style.gap = "6px"

    const name = document.createElement("div")
    name.innerText = ship.id
    name.style.fontSize = "12px"
    name.style.fontWeight = "700"
    name.style.lineHeight = "1.2"
    name.style.wordBreak = "break-word"
    head.appendChild(name)

    const badgeRow = document.createElement("div")
    badgeRow.style.display = "flex"
    badgeRow.style.alignItems = "center"
    badgeRow.style.gap = "4px"

    const modeBadge = document.createElement("span")
    modeBadge.innerText = this.iconEnergyFocus(ship.energyFocus)
    modeBadge.title = this.titleEnergyFocus(ship.energyFocus)
    modeBadge.style.width = "20px"
    modeBadge.style.height = "20px"
    modeBadge.style.display = "grid"
    modeBadge.style.placeItems = "center"
    modeBadge.style.borderRadius = "999px"
    modeBadge.style.background = "rgba(30,41,59,0.9)"
    modeBadge.style.fontSize = "11px"
    badgeRow.appendChild(modeBadge)

    if (ship.isFlagship) {
      const badge = document.createElement("span")
      badge.innerText = "기함"
      badge.style.padding = "2px 6px"
      badge.style.borderRadius = "999px"
      badge.style.background = "rgba(245, 158, 11, 0.18)"
      badge.style.border = "1px solid rgba(245, 158, 11, 0.4)"
      badge.style.color = "#fcd34d"
      badge.style.fontSize = "10px"
      badge.style.fontWeight = "700"
      badgeRow.appendChild(badge)
    }

    head.appendChild(badgeRow)

    const energy = document.createElement("div")
    energy.style.display = "grid"
    energy.style.gap = "4px"

    const energyLabel = document.createElement("div")
    energyLabel.innerText = `Energy ${Math.round(ship.energy)}/${Math.round(ship.maxEnergy)}`
    energyLabel.style.fontSize = "11px"
    energyLabel.style.color = "#93c5fd"

    const energyBar = document.createElement("div")
    energyBar.style.height = "6px"
    energyBar.style.borderRadius = "999px"
    energyBar.style.background = "rgba(30,41,59,0.95)"
    energyBar.style.overflow = "hidden"

    const energyFill = document.createElement("div")
    energyFill.style.width = `${Math.max(0, Math.min(100, ship.energyRatio * 100))}%`
    energyFill.style.height = "100%"
    energyFill.style.background = "linear-gradient(90deg, #38bdf8, #93c5fd)"
    energyBar.appendChild(energyFill)

    energy.append(energyLabel, energyBar)
    card.append(head, energy)
    card.addEventListener("click", () => {
      this.controller.focusShip(ship.id)
      this.selectedShipId = ship.id
      this.detailSlide = "ship"
      this.shipDetailPanel.show(fleetId, ship.id)
      this.render()
    })
    return card
  }

  private syncSlidePosition(fleetId: string) {
    if (this.detailSlide === "ship") {
      const selectedShip = this.selectedShipId
        ? this.controller.getFleetShips(fleetId).find((ship) => ship.id === this.selectedShipId)
        : undefined
      if (!selectedShip) {
        this.selectedShipId = undefined
        this.shipDetailPanel.hide()
        this.detailSlide = "overview"
      } else {
        this.shipDetailPanel.show(fleetId, selectedShip.id)
      }
    }

    if (this.detailSlide !== "ship") {
      this.shipDetailPanel.render()
    }

    if (!this.isDraggingSlide) {
      this.detailTrack.style.transition = "transform 220ms ease"
      this.detailTrack.style.transform = `translateX(${this.slideOffsetPercent(this.detailSlide)}%)`
    }
  }

  private currentSlideLabel() {
    if (this.detailSlide === "settings") return "함대 설정"
    if (this.detailSlide === "ship") return this.selectedShipId ?? "함선 상세"
    return "함대 상세"
  }

  private bindSlideDrag() {
    this.detailViewport.addEventListener("pointerdown", (event) => {
      if (this.mode !== "detail") return
      const target = event.target as HTMLElement | null
      if (target?.closest("input")) return
      this.dragPointerId = event.pointerId
      this.dragStartX = event.clientX
      this.dragStartY = event.clientY
      this.dragDeltaX = 0
      this.dragTracking = true
      this.isDraggingSlide = false
    })

    this.detailViewport.addEventListener("pointermove", (event) => {
      if (!this.dragTracking || event.pointerId !== this.dragPointerId) return
      const deltaX = event.clientX - this.dragStartX
      const deltaY = event.clientY - this.dragStartY
      if (!this.isDraggingSlide) {
        if (Math.abs(deltaX) < 10) return
        if (Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
          this.dragTracking = false
          this.dragPointerId = undefined
          return
        }
        this.isDraggingSlide = true
        this.detailTrack.style.transition = "none"
        this.detailViewport.style.cursor = "grabbing"
        this.detailViewport.setPointerCapture(event.pointerId)
      }
      event.stopPropagation()
      event.preventDefault()
      this.dragDeltaX = deltaX
      const width = this.detailViewport.clientWidth || 1
      const deltaPercent = (this.dragDeltaX / width) * 33.3333
      const next = this.slideOffsetPercent(this.detailSlide) + deltaPercent
      this.detailTrack.style.transform = `translateX(${next}%)`
    })

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== this.dragPointerId) return
      if (!this.isDraggingSlide) {
        this.dragTracking = false
        this.dragPointerId = undefined
        this.dragDeltaX = 0
        return
      }
      event.stopPropagation()
      event.preventDefault()
      if (this.detailViewport.hasPointerCapture(event.pointerId)) {
        this.detailViewport.releasePointerCapture(event.pointerId)
      }
      const width = this.detailViewport.clientWidth || 1
      const threshold = Math.min(120, width * 0.18)
      if (Math.abs(this.dragDeltaX) > threshold) {
        this.shiftSlide(this.dragDeltaX < 0 ? 1 : -1)
      }
      this.dragTracking = false
      this.isDraggingSlide = false
      this.dragPointerId = undefined
      this.dragDeltaX = 0
      this.detailViewport.style.cursor = "grab"
      this.detailTrack.style.transition = "transform 220ms ease"
      this.render()
    }

    this.detailViewport.addEventListener("pointerup", finishDrag)
    this.detailViewport.addEventListener("pointercancel", finishDrag)
  }

  private bindPanelEventShield() {
    const stop = (event: Event) => {
      event.stopPropagation()
    }

    this.Dom.addEventListener("pointerdown", stop)
    this.Dom.addEventListener("pointermove", stop)
    this.Dom.addEventListener("pointerup", stop)
    this.Dom.addEventListener("pointercancel", stop)
    this.Dom.addEventListener("click", stop)
    this.Dom.addEventListener("wheel", stop)
    this.Dom.addEventListener("mousedown", stop)
    this.Dom.addEventListener("mouseup", stop)
  }

  private shiftSlide(direction: -1 | 1) {
    const slides: Array<FleetPanel["detailSlide"]> = ["settings", "overview", "ship"]
    const currentIndex = slides.indexOf(this.detailSlide)
    let nextIndex = Math.max(0, Math.min(slides.length - 1, currentIndex + direction))
    if (slides[nextIndex] === "ship" && !this.selectedShipId) {
      nextIndex = direction > 0 ? Math.max(0, nextIndex - 1) : Math.min(slides.length - 1, nextIndex + 1)
    }
    this.detailSlide = slides[nextIndex]
  }

  private slideOffsetPercent(slide: FleetPanel["detailSlide"]) {
    if (slide === "settings") return 0
    if (slide === "ship") return -66.6667
    return -33.3333
  }

  private iconEnergyFocus(focus: FleetShipPanelState["energyFocus"]) {
    if (focus === "attack") return "⚔️"
    if (focus === "defense") return "🛡️"
    if (focus === "exploration") return "🔭"
    return "🚀"
  }

  private titleEnergyFocus(focus: FleetShipPanelState["energyFocus"]) {
    if (focus === "attack") return "공격"
    if (focus === "defense") return "방어"
    if (focus === "exploration") return "탐색"
    return "항행"
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

  private makeLabeledPopupSelect(
    title: string,
    value: string,
    items: Array<{ label: string, active: boolean, onSelect: () => void }>,
    open: boolean,
    onToggle: () => void,
    disabled: boolean,
  ) {
    const wrap = document.createElement("div")
    wrap.style.display = "grid"
    wrap.style.gap = "6px"
    wrap.style.minWidth = "0"

    const label = document.createElement("div")
    label.innerText = title
    label.style.fontSize = "11px"
    label.style.textTransform = "uppercase"
    label.style.letterSpacing = "0.08em"
    label.style.color = "#94a3b8"
    label.style.whiteSpace = "nowrap"
    label.style.overflow = "hidden"
    label.style.textOverflow = "ellipsis"

    const trigger = this.makeActionButton(value, onToggle, open ? "primary" : "neutral")
    trigger.disabled = disabled
    trigger.style.opacity = disabled ? "0.45" : "1"
    trigger.style.cursor = disabled ? "default" : "pointer"
    trigger.style.textAlign = "left"
    trigger.style.minWidth = "0"
    trigger.style.width = "100%"
    trigger.style.whiteSpace = "nowrap"
    trigger.style.overflow = "hidden"
    trigger.style.textOverflow = "ellipsis"

    wrap.append(label)

    if (open && !disabled) {
      window.requestAnimationFrame(() => {
        if (!trigger.isConnected) return
        this.openFloatingMenu(trigger, items)
      })
    }

    wrap.appendChild(trigger)

    return wrap
  }

  private openFloatingMenu(
    trigger: HTMLElement,
    items: Array<{ label: string, active: boolean, onSelect: () => void }>,
  ) {
    this.closeFloatingMenu()

    const rect = trigger.getBoundingClientRect()
    const menu = document.createElement("div")
    menu.style.position = "fixed"
    menu.style.left = `${rect.left}px`
    menu.style.top = `${Math.max(12, rect.top - 12)}px`
    menu.style.transform = "translateY(-100%)"
    menu.style.minWidth = `${rect.width}px`
    menu.style.display = "grid"
    menu.style.gap = "6px"
    menu.style.padding = "8px"
    menu.style.borderRadius = "12px"
    menu.style.border = "1px solid rgba(148,163,184,0.18)"
    menu.style.background = "rgba(2,6,23,0.96)"
    menu.style.boxShadow = "0 18px 40px rgba(0,0,0,0.28)"
    menu.style.zIndex = "1500"

    items.forEach((item) => {
      menu.appendChild(this.makeActionButton(item.label, item.onSelect, item.active ? "primary" : "neutral"))
    })

    menu.addEventListener("pointerdown", (event) => event.stopPropagation())
    document.body.appendChild(menu)
    this.floatingMenuEl = menu

    this.closeFloatingMenuListener = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && (menu.contains(target) || trigger.contains(target))) return
      this.formationMenuOpen = false
      this.moveModeMenuOpen = false
      this.planMenuOpen = false
      this.closeFloatingMenu()
      this.render()
    }
    window.addEventListener("pointerdown", this.closeFloatingMenuListener)
  }

  private closeFloatingMenu() {
    if (this.closeFloatingMenuListener) {
      window.removeEventListener("pointerdown", this.closeFloatingMenuListener)
      this.closeFloatingMenuListener = undefined
    }
    this.floatingMenuEl?.remove()
    this.floatingMenuEl = undefined
  }

  private describeOrder(order: FleetOrder) {
    switch (order.type) {
      case FleetOrderType.Move:
        if (!order.point) return "Move"
        return `Move (${order.point.x.toFixed(0)}, ${order.point.z.toFixed(0)})`
      case FleetOrderType.Attack:
        return `Attack ${order.targetId ?? "target"}`
      case FleetOrderType.Follow:
        return `Follow ${order.targetId ?? "target"}`
      case FleetOrderType.Hold:
      default:
        return "Hold Position"
    }
  }

  private moveModeLabel(moveMode: FleetMoveMode) {
    if (moveMode === FleetMoveMode.FlagshipFollow) return "Flagship Follow"
    if (moveMode === FleetMoveMode.FlagshipFormation) return "Flagship Formation"
    return "Formation"
  }

  private describeMoveMode(moveMode: FleetMoveMode) {
    if (moveMode === FleetMoveMode.FlagshipFollow) return "Move Flagship Follow"
    if (moveMode === FleetMoveMode.FlagshipFormation) return "Move Flagship Formation"
    return "Move Formation"
  }

  private applyStyle() {
    if (document.getElementById("fleet-command-panel-style")) return

    const style = document.createElement("style")
    style.id = "fleet-command-panel-style"
    style.textContent = `
      #fleet-command-panel button,
      #fleet-command-panel input {
        pointer-events: auto;
      }
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
      @media (max-width: 980px) {
        #fleet-command-panel .fleet-settings-control-row {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }
      @media (max-width: 640px) {
        #fleet-command-panel .fleet-settings-control-row {
          grid-template-columns: minmax(0, 1fr) !important;
        }
      }
    `
    document.head.appendChild(style)
  }
}
