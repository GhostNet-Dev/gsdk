import { FleetPanelController, FleetShipEnergyFocus, FleetShipPanelState } from "./fleetpaneltypes"

const energyFocuses: FleetShipEnergyFocus[] = ["attack", "defense", "navigation", "exploration"]

export class ShipDetailPanel {
  readonly Dom = document.createElement("div")
  private readonly titleEl = document.createElement("div")
  private readonly bodyEl = document.createElement("div")
  private readonly optionsEl = document.createElement("div")
  private readonly descEl = document.createElement("div")
  private floatingMenuEl?: HTMLElement
  private closeFloatingMenuListener?: (event: PointerEvent) => void
  private fleetId?: string
  private shipId?: string
  private energyMenuOpen = false
  private weaponMenuOpen = false

  private lastShipId?: string
  private lastEnergyMenuOpen = false
  private lastWeaponMenuOpen = false
  private energyTriggerBtn?: HTMLButtonElement
  private weaponTriggerBtn?: HTMLButtonElement

  constructor(
    private readonly controller: FleetPanelController,
  ) {
    this.setup()
  }

  dispose() {
    this.closeFloatingMenu()
    this.Dom.remove()
  }

  show(fleetId: string, shipId: string) {
    this.fleetId = fleetId
    this.shipId = shipId
    this.render()
  }

  hide() {
    this.fleetId = undefined
    this.shipId = undefined
    this.energyMenuOpen = false
    this.weaponMenuOpen = false
    this.lastShipId = undefined
    this.closeFloatingMenu()
    this.renderEmpty()
  }

  render() {
    if (!this.fleetId || !this.shipId) {
      this.closeFloatingMenu()
      this.renderEmpty()
      return
    }

    const ship = this.controller.getFleetShips(this.fleetId).find((item) => item.id === this.shipId)
    if (!ship) {
      this.closeFloatingMenu()
      this.renderEmpty()
      return
    }

    const structuralChange = this.lastShipId !== ship.id ||
      this.lastEnergyMenuOpen !== this.energyMenuOpen ||
      this.lastWeaponMenuOpen !== this.weaponMenuOpen

    if (structuralChange) {
      this.lastShipId = ship.id
      this.lastEnergyMenuOpen = this.energyMenuOpen
      this.lastWeaponMenuOpen = this.weaponMenuOpen
      this.renderShip(ship)
    } else {
      this.updateShipStatus(ship)
    }
  }

  private updateShipStatus(ship: FleetShipPanelState) {
    if (this.energyTriggerBtn && !this.energyMenuOpen) {
      this.energyTriggerBtn.innerText = this.shortLabelEnergyFocus(ship.energyFocus)
    }
    if (this.weaponTriggerBtn && !this.weaponMenuOpen) {
      this.weaponTriggerBtn.innerText = this.weaponButtonLabel(ship)
    }
  }

  private setup() {
    this.Dom.style.display = "grid"
    this.Dom.style.gridTemplateRows = "auto auto auto auto"
    this.Dom.style.gap = "12px"
    this.Dom.style.padding = "18px"
    this.Dom.style.borderRadius = "16px"
    this.Dom.style.border = "1px solid rgba(148,163,184,0.12)"
    this.Dom.style.background = "rgba(15,23,42,0.48)"
    this.Dom.style.pointerEvents = "auto"
    this.Dom.style.color = "#e2e8f0"
    this.Dom.style.fontFamily = "\"Trebuchet MS\", \"Segoe UI\", sans-serif"

    this.titleEl.style.fontSize = "18px"
    this.titleEl.style.fontWeight = "700"
    this.titleEl.style.letterSpacing = "0.03em"

    this.bodyEl.style.display = "grid"
    this.bodyEl.style.gap = "10px"
    this.bodyEl.style.fontSize = "13px"
    this.bodyEl.style.color = "#cbd5e1"

    this.optionsEl.style.display = "grid"
    this.optionsEl.style.gridTemplateColumns = "1fr 1fr"
    this.optionsEl.style.gap = "8px"

    this.descEl.style.fontSize = "12px"
    this.descEl.style.lineHeight = "1.5"
    this.descEl.style.color = "#94a3b8"

    this.Dom.append(this.titleEl, this.bodyEl, this.optionsEl, this.descEl)
    this.renderEmpty()
  }

  private renderShip(ship: FleetShipPanelState) {
    this.closeFloatingMenu()
    this.titleEl.innerText = ship.isFlagship ? `${ship.id} · 기함` : ship.id
    this.bodyEl.innerHTML = ""
    this.optionsEl.innerHTML = ""

    const energyTrigger = this.makePopupSelect(
      this.shortLabelEnergyFocus(ship.energyFocus),
      energyFocuses.map((focus) => ({
        label: this.labelEnergyFocus(focus),
        active: ship.energyFocus === focus,
        onSelect: () => {
          this.energyMenuOpen = false
          this.controller.setShipEnergyFocus(ship.id, focus)
          this.render()
        },
      })),
      this.energyMenuOpen,
      () => {
        this.energyMenuOpen = !this.energyMenuOpen
        this.weaponMenuOpen = false
        this.render()
      },
    )
    this.energyTriggerBtn = energyTrigger.querySelector("button") || undefined
    this.optionsEl.appendChild(energyTrigger)

    if (ship.availableWeapons.length > 0) {
      const weaponTrigger = this.makePopupSelect(
        this.weaponButtonLabel(ship),
        ship.availableWeapons.map((weapon) => ({
          label: weapon.label,
          active: ship.weaponId === weapon.id,
          onSelect: () => {
            this.weaponMenuOpen = false
            this.controller.setShipWeapon(ship.id, weapon.id)
            this.render()
          },
        })),
        this.weaponMenuOpen,
        () => {
          this.weaponMenuOpen = !this.weaponMenuOpen
          this.energyMenuOpen = false
          this.render()
        },
      )
      this.weaponTriggerBtn = weaponTrigger.querySelector("button") || undefined
      this.optionsEl.appendChild(weaponTrigger)
    }

    this.descEl.innerText = this.describeEnergyFocus(ship.energyFocus)
  }

  private renderEmpty() {
    this.titleEl.innerText = "함선 상세"
    this.bodyEl.innerHTML = ""
    this.optionsEl.innerHTML = ""
    this.lastShipId = undefined

    const empty = document.createElement("div")
    empty.innerText = "함선을 선택하면 이 영역에서 상세 정보와 에너지 집중 설정을 바로 조정할 수 있습니다."
    empty.style.lineHeight = "1.6"
    empty.style.color = "#94a3b8"
    empty.style.padding = "8px 0"
    this.bodyEl.appendChild(empty)

    this.descEl.innerText = "오른쪽 슬라이드에서 선택된 함선 상태가 유지됩니다."
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
    btn.addEventListener("pointerdown", (e) => e.stopPropagation())
    return btn
  }

  private makePopupSelect(
    label: string,
    items: Array<{ label: string, active: boolean, onSelect: () => void }>,
    open: boolean,
    onToggle: () => void,
  ) {
    const wrap = document.createElement("div")
    wrap.style.display = "grid"
    wrap.style.gap = "8px"

    const trigger = this.makeActionButton(label, onToggle, open)
    trigger.style.width = "100%"
    trigger.style.textAlign = "left"

    if (open) {
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
      menu.appendChild(this.makeActionButton(item.label, item.onSelect, item.active))
    })

    menu.addEventListener("pointerdown", (event) => event.stopPropagation())
    document.body.appendChild(menu)
    this.floatingMenuEl = menu

    this.closeFloatingMenuListener = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && (menu.contains(target) || trigger.contains(target))) return
      this.energyMenuOpen = false
      this.weaponMenuOpen = false
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

  private labelEnergyFocus(focus: FleetShipEnergyFocus) {
    if (focus === "attack") return "⚔️ 공격"
    if (focus === "defense") return "🛡️ 방어"
    if (focus === "exploration") return "🔭 탐색"
    return "🚀 항행"
  }

  private shortLabelEnergyFocus(focus: FleetShipEnergyFocus) {
    if (focus === "attack") return "공격"
    if (focus === "defense") return "방어"
    if (focus === "exploration") return "탐색"
    return "항행"
  }

  private weaponButtonLabel(ship: FleetShipPanelState) {
    const currentWeapon = ship.availableWeapons.find((weapon) => weapon.id === ship.weaponId)
    const baseLabel = currentWeapon?.label || "무기 선택"
    return ship.isWeaponSwitching ? `${baseLabel} 교체중...` : baseLabel
  }

  private describeEnergyFocus(focus: FleetShipEnergyFocus) {
    if (focus === "attack") return "무장과 공격 행동에 에너지를 우선 배분합니다."
    if (focus === "defense") return "방어 유지와 생존성을 우선하도록 에너지를 분배합니다."
    if (focus === "exploration") return "센서와 정찰, 미지 구역 탐색에 에너지를 우선 배분합니다."
    return "기동과 이동 성능을 우선하도록 에너지를 분배합니다."
  }
}
