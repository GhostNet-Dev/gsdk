import { IKeyCommand } from "@Glibs/interface/ievent"
import IEventController from "@Glibs/interface/ievent"
import { KeyType } from "@Glibs/types/eventtypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { GUX } from "@Glibs/ux/gux"

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

/** 슬롯 컨테이너 기본 위치 프리셋 */
export type SkillSlotLayout = "left" | "right" | "bottom" | "top" | "custom"

/** 슬롯 모양 */
export type SkillSlotShape = "rounded" | "circle" | "square" | "squircle"

/** 슬롯 비주얼 테마 */
export type SkillSlotTheme = "dark" | "glass" | "light" | "minimal"

/** flex 방향 (custom 포지션에서 직접 지정) */
export type SkillSlotOrientation = "horizontal" | "vertical"

export type LearnedSkillMessage = {
  nodeId: string
  techId: string
  level: number
  tech: unknown
  icon?: string
}

type SkillSlotData = {
  skill: LearnedSkillMessage
  el: HTMLElement
  fill: HTMLElement
  levelEl: HTMLElement
  keyEl: HTMLElement
  iconEl: HTMLElement
  nameEl: HTMLElement
  timerEl: HTMLElement
  castUntil: number
  cooldownMs: number
}

export type SkillSlotsOptions = {
  /** 사전 정의 위치 프리셋. "custom" 시 customX/Y 로 좌표를 직접 지정합니다. */
  position: SkillSlotLayout
  /** position="custom" 일 때 left 값 (e.g. "20px", "50%") */
  customX?: string
  /** position="custom" 일 때 top 값 (e.g. "80px", "50%") */
  customY?: string
  /** position="custom" 또는 강제 방향 변경 시 사용 */
  orientation?: SkillSlotOrientation
  /** 위치 미세 조정 오프셋 (px). 프리셋 위치에서 추가로 이동합니다. */
  offsetX: number
  offsetY: number

  slotSize: number
  gap: number
  maxSlots: number
  iconFallback: string
  keyLabels: string[]

  showTooltip: boolean
  showLevel: boolean
  showKeyHint: boolean
  showName: boolean

  zIndex: number

  /** 슬롯 모양 */
  shape: SkillSlotShape
  /** 비주얼 테마 */
  theme: SkillSlotTheme
  /** 컨테이너 투명도 0–1 */
  opacity: number
}

const DEFAULT_OPTIONS: SkillSlotsOptions = {
  position: "right",
  offsetX: 0,
  offsetY: 0,
  slotSize: 58,
  gap: 8,
  maxSlots: 4,
  iconFallback: "✨",
  keyLabels: ["Action5", "Action6", "Action7", "Action8"],
  showTooltip: true,
  showLevel: true,
  showKeyHint: true,
  showName: true,
  zIndex: 45,
  shape: "rounded",
  theme: "dark",
  opacity: 1,
}

/* -------------------------------------------------------------------------- */
/* SkillSlotsUX                                                                */
/* -------------------------------------------------------------------------- */

export class SkillSlotsUX extends GUX {
  Dom: HTMLElement
  private opts: SkillSlotsOptions
  private slots: Array<SkillSlotData | null> = []
  private rafId = 0

  constructor(
    private eventCtrl: IEventController,
    options: Partial<SkillSlotsOptions> = {},
  ) {
    super()
    this.opts = { ...DEFAULT_OPTIONS, ...options }

    this.applyDynamicStyle("gux-skill-slots-style", SKILL_SLOTS_CSS)

    this.Dom = document.createElement("div")
    this.Dom.className = "gux-skill-slots"
    document.body.appendChild(this.Dom)

    this.applyAllOptions()

    this.eventCtrl.RegisterEventListener(EventTypes.UpdateSkill + "player", (skill: LearnedSkillMessage) => {
      this.bindSkill(skill)
    })
    this.eventCtrl.RegisterEventListener(EventTypes.RemoveSkill + "player", (skill: LearnedSkillMessage) => {
      this.unbindSkill(skill.nodeId)
    })
    this.eventCtrl.RegisterEventListener(EventTypes.KeyDown, (keyCommand: IKeyCommand) => {
      const type = keyCommand.Type
      if (type >= KeyType.Action5 && type <= KeyType.Action8) {
        const index = type - KeyType.Action5
        const slot = this.slots[index]
        if (!slot) return
        slot.castUntil = performance.now() + slot.cooldownMs
      }
    })
    this.eventCtrl.RegisterEventListener(EventTypes.SkillSlotCast + "player", (slotIndex = 0) => {
      const slot = this.slots[slotIndex]
      if (!slot) return
      slot.castUntil = performance.now() + slot.cooldownMs
    })

    this.loop()
  }

  /* ── Show / Hide ──────────────────────────────────────────────────────── */

  Show(): void {
    this.visible = true
    this.Dom.style.display = "flex"
  }

  Hide(): void {
    this.visible = false
    this.Dom.style.display = "none"
  }

  /* ── Setters ──────────────────────────────────────────────────────────── */

  setPosition(position: SkillSlotLayout) {
    this.opts.position = position
    this.Dom.dataset.position = position
    this.applyPositionStyle()
  }

  /** position="custom" 일 때 컨테이너 좌표와 방향을 설정합니다. */
  setCustomPosition(x: string, y: string, orientation: SkillSlotOrientation = "vertical") {
    this.opts.position = "custom"
    this.opts.customX = x
    this.opts.customY = y
    this.opts.orientation = orientation
    this.Dom.dataset.position = "custom"
    this.applyPositionStyle()
  }

  /** 프리셋 위치에서 추가 오프셋(px)을 적용합니다. */
  setOffset(x: number, y: number) {
    this.opts.offsetX = x
    this.opts.offsetY = y
    this.applyPositionStyle()
  }

  setSlotSize(px: number) {
    this.opts.slotSize = Math.max(24, px)
    this.Dom.style.setProperty("--gux-skill-slot-size", `${this.opts.slotSize}px`)
  }

  setGap(px: number) {
    this.opts.gap = Math.max(0, px)
    this.Dom.style.setProperty("--gux-skill-slot-gap", `${this.opts.gap}px`)
  }

  setMaxSlots(count: number) {
    this.opts.maxSlots = Math.max(1, count)
    while (this.slots.length > this.opts.maxSlots) {
      const slot = this.slots.pop()
      slot?.el.remove()
    }
  }

  setZIndex(zIndex: number) {
    this.opts.zIndex = zIndex
    this.Dom.style.zIndex = String(zIndex)
  }

  setKeyLabels(labels: string[]) {
    this.opts.keyLabels = labels
    this.slots.forEach((slot, i) => {
      if (!slot) return
      slot.keyEl.textContent = this.opts.showKeyHint ? (labels[i] ?? "") : ""
    })
  }

  /** 슬롯 모양을 변경합니다. */
  setShape(shape: SkillSlotShape) {
    this.opts.shape = shape
    this.Dom.dataset.shape = shape
  }

  /** 비주얼 테마를 변경합니다. */
  setTheme(theme: SkillSlotTheme) {
    this.opts.theme = theme
    this.Dom.dataset.theme = theme
  }

  /** 컨테이너 전체 투명도를 설정합니다 (0–1). */
  setOpacity(opacity: number) {
    this.opts.opacity = Math.max(0, Math.min(1, opacity))
    this.Dom.style.opacity = String(this.opts.opacity)
  }

  setShowName(show: boolean) {
    this.opts.showName = show
    this.slots.forEach((slot) => {
      if (!slot) return
      slot.nameEl.style.display = show ? "" : "none"
    })
  }

  setShowLevel(show: boolean) {
    this.opts.showLevel = show
    this.slots.forEach((slot) => {
      if (!slot) return
      slot.levelEl.textContent = show ? `Lv.${slot.skill.level}` : ""
    })
  }

  setShowKeyHint(show: boolean) {
    this.opts.showKeyHint = show
    this.slots.forEach((slot, i) => {
      if (!slot) return
      slot.keyEl.textContent = show ? (this.opts.keyLabels[i] ?? "") : ""
    })
  }

  /* ── Private helpers ──────────────────────────────────────────────────── */

  private applyAllOptions() {
    this.Dom.style.setProperty("--gux-skill-slot-size", `${this.opts.slotSize}px`)
    this.Dom.style.setProperty("--gux-skill-slot-gap", `${this.opts.gap}px`)
    this.Dom.style.zIndex = String(this.opts.zIndex)
    this.Dom.style.opacity = String(this.opts.opacity)
    this.Dom.dataset.position = this.opts.position
    this.Dom.dataset.shape = this.opts.shape
    this.Dom.dataset.theme = this.opts.theme
    this.applyPositionStyle()
  }

  private applyPositionStyle() {
    const { position, customX, customY, orientation, offsetX, offsetY } = this.opts

    // 인라인 위치 초기화
    this.Dom.style.removeProperty("left")
    this.Dom.style.removeProperty("right")
    this.Dom.style.removeProperty("top")
    this.Dom.style.removeProperty("bottom")
    this.Dom.style.removeProperty("transform")
    this.Dom.style.removeProperty("flex-direction")

    if (position === "custom") {
      this.Dom.style.left = customX ?? "0px"
      this.Dom.style.top = customY ?? "0px"
      this.Dom.style.flexDirection = orientation === "horizontal" ? "row" : "column"
      if (offsetX) this.Dom.style.left = `calc(${customX ?? "0px"} + ${offsetX}px)`
      if (offsetY) this.Dom.style.top = `calc(${customY ?? "0px"} + ${offsetY}px)`
      return
    }

    // orientation 강제 지정 시 CSS 프리셋을 override
    if (orientation) {
      this.Dom.style.flexDirection = orientation === "horizontal" ? "row" : "column"
    }

    // 오프셋 적용 (CSS 변수로 전달)
    if (offsetX !== 0) this.Dom.style.setProperty("--gux-offset-x", `${offsetX}px`)
    else this.Dom.style.removeProperty("--gux-offset-x")
    if (offsetY !== 0) this.Dom.style.setProperty("--gux-offset-y", `${offsetY}px`)
    else this.Dom.style.removeProperty("--gux-offset-y")
  }

  private bindSkill(skill: LearnedSkillMessage) {
    let index = this.slots.findIndex((slot) => slot?.skill.nodeId === skill.nodeId)
    if (index < 0) index = this.slots.findIndex((slot) => slot == null)
    if (index < 0) {
      if (this.slots.length >= this.opts.maxSlots) index = 0
      else index = this.slots.length
    }

    const slot = this.createSlot(skill, index)
    this.slots[index] = slot
  }

  private unbindSkill(nodeId: string) {
    const index = this.slots.findIndex((slot) => slot?.skill.nodeId === nodeId)
    if (index < 0) return

    this.slots[index]?.el.remove()
    this.slots[index] = null

    const compacted = this.slots.filter((slot): slot is SkillSlotData => slot != null)
    this.slots = compacted
    compacted.forEach((slot, i) => {
      slot.el.dataset.index = String(i)
      slot.keyEl.textContent = this.opts.showKeyHint ? (this.opts.keyLabels[i] ?? "") : ""
      this.Dom.appendChild(slot.el)
    })
  }

  private createSlot(skill: LearnedSkillMessage, index: number): SkillSlotData {
    const existing = this.slots[index]
    if (existing) {
      existing.skill = skill
      existing.cooldownMs = this.resolveCooldownMs(skill.tech)
      existing.castUntil = 0
      this.renderSkill(existing)
      return existing
    }

    const el = document.createElement("div")
    el.className = "gux-skill-slot"
    el.dataset.index = String(index)
    el.onclick = () => {
      const slotIndex = Number(el.dataset.index ?? 0)
      if (!Number.isFinite(slotIndex)) return
      const slot = this.slots[slotIndex]
      if (!slot || performance.now() < slot.castUntil) return
      this.eventCtrl.SendEventMessage(EventTypes.SkillSlotCast + "player", slotIndex)
    }

    const fill = document.createElement("i")
    fill.className = "gux-skill-cd"

    const icon = document.createElement("span")
    icon.className = "gux-skill-icon"

    const key = document.createElement("span")
    key.className = "gux-skill-key"

    const level = document.createElement("span")
    level.className = "gux-skill-level"

    const name = document.createElement("span")
    name.className = "gux-skill-name"
    if (!this.opts.showName) name.style.display = "none"

    const timer = document.createElement("span")
    timer.className = "gux-skill-timer"

    el.append(fill, icon, key, level, name, timer)
    this.Dom.appendChild(el)

    const slotData: SkillSlotData = {
      skill,
      el,
      fill,
      levelEl: level,
      keyEl: key,
      iconEl: icon,
      nameEl: name,
      timerEl: timer,
      castUntil: 0,
      cooldownMs: this.resolveCooldownMs(skill.tech),
    }

    this.renderSkill(slotData)
    return slotData
  }

  private renderSkill(slot: SkillSlotData) {
    const tech = this.asRecord(slot.skill.tech)
    const levelText = `Lv.${slot.skill.level}`
    const techName = this.asString(tech?.name) ?? slot.skill.techId

    const icon = slot.skill.icon || this.opts.iconFallback

    if (icon.length < 10) {
      slot.iconEl.textContent = icon
      slot.iconEl.style.backgroundImage = "none"
    } else {
      slot.iconEl.textContent = ""
      slot.iconEl.style.backgroundImage = `url(${icon})`
      slot.iconEl.style.backgroundSize = "contain"
      slot.iconEl.style.backgroundRepeat = "no-repeat"
      slot.iconEl.style.backgroundPosition = "center"
    }

    slot.keyEl.textContent = this.opts.showKeyHint ? (this.opts.keyLabels[Number(slot.el.dataset.index)] ?? "") : ""
    slot.levelEl.textContent = this.opts.showLevel ? levelText : ""
    slot.nameEl.textContent = techName
    slot.nameEl.style.display = this.opts.showName ? "" : "none"

    if (this.opts.showTooltip) {
      slot.el.title = `${techName} (${levelText})`
    } else {
      slot.el.removeAttribute("title")
    }
  }

  private resolveCooldownMs(tech: unknown): number {
    const cooldown = this.asRecord(tech)?.cooldown
    if (typeof cooldown !== "number") return 1000
    return Math.max(100, cooldown * 1000)
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (value == null || typeof value !== "object") return
    return value as Record<string, unknown>
  }

  private asString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined
  }

  private loop = () => {
    const now = performance.now()
    this.slots.forEach((slot) => {
      if (!slot) return
      const remain = Math.max(0, slot.castUntil - now)
      const ratio = slot.cooldownMs > 0 ? remain / slot.cooldownMs : 0

      slot.el.style.setProperty("--cd-ratio", String(Math.min(1, ratio)))

      const wasOnCooldown = slot.el.classList.contains("is-cooldown")
      slot.el.classList.toggle("is-cooldown", remain > 0)

      if (remain > 0) {
        const secs = remain / 1000
        slot.timerEl.textContent = secs >= 1 ? String(Math.ceil(secs)) : secs.toFixed(1)
      } else {
        slot.timerEl.textContent = ""
        if (wasOnCooldown) {
          slot.el.classList.remove("is-ready")
          void slot.el.offsetWidth
          slot.el.classList.add("is-ready")
        }
      }
    })
    this.rafId = requestAnimationFrame(this.loop)
  }

  getAssignments(): Array<LearnedSkillMessage | null> {
    return Array.from({ length: this.opts.maxSlots }, (_, i) => this.slots[i]?.skill ?? null)
  }

  dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.Dom.remove()
    this.slots.length = 0
  }
}

/* -------------------------------------------------------------------------- */
/* CSS                                                                         */
/* -------------------------------------------------------------------------- */

const SKILL_SLOTS_CSS = `
/* ── Layout ─────────────────────────────────────────────────────────────── */
.gux-skill-slots {
  --gux-skill-slot-size: 58px;
  --gux-skill-slot-gap: 8px;
  --gux-offset-x: 0px;
  --gux-offset-y: 0px;
  position: fixed;
  display: flex;
  gap: var(--gux-skill-slot-gap);
  pointer-events: auto;
}

.gux-skill-slots[data-position="right"] {
  right: calc(14px + var(--gux-offset-x));
  top: 50%;
  transform: translateY(calc(-50% + var(--gux-offset-y)));
  flex-direction: column;
}
.gux-skill-slots[data-position="left"] {
  left: calc(14px + var(--gux-offset-x));
  top: 50%;
  transform: translateY(calc(-50% + var(--gux-offset-y)));
  flex-direction: column;
}
.gux-skill-slots[data-position="bottom"] {
  bottom: calc(14px - var(--gux-offset-y));
  left: 50%;
  transform: translateX(calc(-50% + var(--gux-offset-x)));
  flex-direction: row;
}
.gux-skill-slots[data-position="top"] {
  top: calc(14px + var(--gux-offset-y));
  left: 50%;
  transform: translateX(calc(-50% + var(--gux-offset-x)));
  flex-direction: row;
}
.gux-skill-slots[data-position="custom"] {
  position: fixed;
}

/* ── Slot base ───────────────────────────────────────────────────────────── */
.gux-skill-slot {
  width: var(--gux-skill-slot-size);
  height: var(--gux-skill-slot-size);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.08s ease, opacity 0.15s;
  flex-shrink: 0;
}
.gux-skill-slot:active { transform: scale(0.93); }

/* ── Shape variants ──────────────────────────────────────────────────────── */
.gux-skill-slots[data-shape="rounded"] .gux-skill-slot,
.gux-skill-slots[data-shape="rounded"] .gux-skill-cd  { border-radius: 14px; }

.gux-skill-slots[data-shape="circle"]  .gux-skill-slot,
.gux-skill-slots[data-shape="circle"]  .gux-skill-cd  { border-radius: 50%; }

.gux-skill-slots[data-shape="square"]  .gux-skill-slot,
.gux-skill-slots[data-shape="square"]  .gux-skill-cd  { border-radius: 4px; }

.gux-skill-slots[data-shape="squircle"] .gux-skill-slot,
.gux-skill-slots[data-shape="squircle"] .gux-skill-cd { border-radius: 28%; }

/* ── Theme: dark (default) ───────────────────────────────────────────────── */
.gux-skill-slots[data-theme="dark"] .gux-skill-slot {
  border: 1px solid rgba(255,255,255,0.28);
  background: linear-gradient(180deg, rgba(26,28,35,0.90), rgba(8,10,14,0.90));
  box-shadow: 0 10px 18px rgba(0,0,0,0.35);
}

/* ── Theme: glass ────────────────────────────────────────────────────────── */
.gux-skill-slots[data-theme="glass"] .gux-skill-slot {
  border: 1px solid rgba(255,255,255,0.20);
  background: rgba(255,255,255,0.10);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  box-shadow: 0 4px 20px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.15);
}

/* ── Theme: light ────────────────────────────────────────────────────────── */
.gux-skill-slots[data-theme="light"] .gux-skill-slot {
  border: 1px solid rgba(0,0,0,0.14);
  background: linear-gradient(180deg, #f0f2f8, #d8dce8);
  box-shadow: 0 4px 12px rgba(0,0,0,0.14);
}
.gux-skill-slots[data-theme="light"] .gux-skill-icon  { color: #1a1c23; }
.gux-skill-slots[data-theme="light"] .gux-skill-key   { color: #4a4e5c; }
.gux-skill-slots[data-theme="light"] .gux-skill-level { color: #c07800; }
.gux-skill-slots[data-theme="light"] .gux-skill-name  {
  color: #2a2d3a;
  background: rgba(200,206,220,0.92);
}
.gux-skill-slots[data-theme="light"] .gux-skill-timer { color: #1a1c23; }
.gux-skill-slots[data-theme="light"] .gux-skill-cd {
  background: conic-gradient(
    from -90deg,
    rgba(0,0,0,0.30) calc(var(--cd-ratio,0) * 1turn),
    transparent      calc(var(--cd-ratio,0) * 1turn)
  );
}

/* ── Theme: minimal ──────────────────────────────────────────────────────── */
.gux-skill-slots[data-theme="minimal"] .gux-skill-slot {
  border: 1.5px solid rgba(255,255,255,0.30);
  background: transparent;
  box-shadow: none;
}

/* ── Cooldown overlay (dark/glass/minimal share same style) ─────────────── */
.gux-skill-cd {
  position: absolute;
  inset: 0;
  background: conic-gradient(
    from -90deg,
    rgba(0,0,0,0.78) calc(var(--cd-ratio,0) * 1turn),
    transparent      calc(var(--cd-ratio,0) * 1turn)
  );
  z-index: 1;
  pointer-events: none;
}
.gux-skill-slot.is-cooldown { filter: saturate(0.3) brightness(0.72); }

/* ── Ready flash ─────────────────────────────────────────────────────────── */
@keyframes gux-skill-ready {
  0%   { box-shadow: 0 0 0 0px  rgba(255,215,60,0.95); }
  40%  { box-shadow: 0 0 0 7px  rgba(255,215,60,0.55); }
  100% { box-shadow: 0 0 0 0px  rgba(255,215,60,0.00); }
}
.gux-skill-slot.is-ready { animation: gux-skill-ready 0.45s ease-out forwards; }

/* ── Inner elements ──────────────────────────────────────────────────────── */
.gux-skill-icon {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: calc(var(--gux-skill-slot-size) * 0.48);
  z-index: 2;
  pointer-events: none;
}
.gux-skill-timer {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: calc(var(--gux-skill-slot-size) * 0.28);
  font-weight: 800;
  color: #fff;
  text-shadow: 0 0 8px rgba(0,0,0,1), 0 1px 3px rgba(0,0,0,1);
  z-index: 4;
  pointer-events: none;
  letter-spacing: -0.5px;
}
.gux-skill-key {
  position: absolute;
  left: 5px;
  top: 4px;
  font-size: calc(var(--gux-skill-slot-size) * 0.165);
  color: #f8fafc;
  text-shadow: 0 1px 1px rgba(0,0,0,0.8);
  z-index: 3;
  pointer-events: none;
  line-height: 1;
}
.gux-skill-level {
  position: absolute;
  right: 5px;
  bottom: 4px;
  font-size: calc(var(--gux-skill-slot-size) * 0.165);
  color: #fde68a;
  text-shadow: 0 1px 1px rgba(0,0,0,0.8);
  z-index: 3;
  pointer-events: none;
  line-height: 1;
}
.gux-skill-name {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: calc(var(--gux-skill-slot-size) * 0.22);
  font-size: calc(var(--gux-skill-slot-size) * 0.145);
  line-height: calc(var(--gux-skill-slot-size) * 0.22);
  text-align: center;
  color: #e2e8f0;
  background: rgba(15,17,22,0.88);
  z-index: 2;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}
`
