import { IKeyCommand } from "@Glibs/interface/ievent"
import IEventController from "@Glibs/interface/ievent"
import { KeyType } from "@Glibs/types/eventtypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import { GUX } from "@Glibs/ux/gux"

export type SkillSlotLayout = "left" | "right" | "bottom"

type LearnedSkillMessage = {
  nodeId: string
  techId: string
  level: number
  tech: unknown
}

type SkillSlotData = {
  skill: LearnedSkillMessage
  el: HTMLElement
  fill: HTMLElement
  levelEl: HTMLElement
  keyEl: HTMLElement
  iconEl: HTMLElement
  nameEl: HTMLElement
  castUntil: number
  cooldownMs: number
}

export type SkillSlotsOptions = {
  position: SkillSlotLayout
  slotSize: number
  gap: number
  maxSlots: number
  iconFallback: string
  keyLabels: string[]
  showTooltip: boolean
  showLevel: boolean
  showKeyHint: boolean
  zIndex: number
}

const DEFAULT_OPTIONS: SkillSlotsOptions = {
  position: "right",
  slotSize: 58,
  gap: 8,
  maxSlots: 1,
  iconFallback: "✨",
  keyLabels: ["Action5"],
  showTooltip: true,
  showLevel: true,
  showKeyHint: true,
  zIndex: 45,
}

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

    this.setPosition(this.opts.position)
    this.setSlotSize(this.opts.slotSize)
    this.setGap(this.opts.gap)
    this.setMaxSlots(this.opts.maxSlots)
    this.setZIndex(this.opts.zIndex)

    this.eventCtrl.RegisterEventListener(EventTypes.UpdateSkill + "player", (skill: LearnedSkillMessage) => {
      this.bindSkill(skill)
    })
    this.eventCtrl.RegisterEventListener(EventTypes.RemoveSkill + "player", (skill: LearnedSkillMessage) => {
      this.unbindSkill(skill.nodeId)
    })
    this.eventCtrl.RegisterEventListener(EventTypes.KeyDown, (keyCommand: IKeyCommand) => {
      if (keyCommand.Type !== KeyType.Action5) return
      const slot = this.slots[0]
      if (!slot) return
      slot.castUntil = performance.now() + slot.cooldownMs
    })

    this.loop()
  }

  Show(): void {
    this.visible = true
    this.Dom.style.display = "flex"
  }

  Hide(): void {
    this.visible = false
    this.Dom.style.display = "none"
  }

  setPosition(position: SkillSlotLayout) {
    this.opts.position = position
    this.Dom.dataset.position = position
  }

  setSlotSize(px: number) {
    this.opts.slotSize = Math.max(36, px)
    this.Dom.style.setProperty("--gux-skill-slot-size", `${this.opts.slotSize}px`)
  }

  setGap(px: number) {
    this.opts.gap = Math.max(2, px)
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

    el.append(fill, icon, key, level, name)
    this.Dom.appendChild(el)

    const slotData: SkillSlotData = {
      skill,
      el,
      fill,
      levelEl: level,
      keyEl: key,
      iconEl: icon,
      nameEl: name,
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

    slot.iconEl.textContent = this.opts.iconFallback
    slot.keyEl.textContent = this.opts.showKeyHint ? (this.opts.keyLabels[Number(slot.el.dataset.index)] ?? "") : ""
    slot.levelEl.textContent = this.opts.showLevel ? levelText : ""
    slot.nameEl.textContent = techName

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
      slot.fill.style.transform = `scaleY(${Math.min(1, ratio)})`
      slot.el.classList.toggle("is-cooldown", remain > 0)
    })
    this.rafId = requestAnimationFrame(this.loop)
  }

  dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId)
    this.Dom.remove()
    this.slots.length = 0
  }
}

const SKILL_SLOTS_CSS = `
.gux-skill-slots {
  --gux-skill-slot-size: 58px;
  --gux-skill-slot-gap: 8px;
  position: fixed;
  display: flex;
  gap: var(--gux-skill-slot-gap);
  pointer-events: none;
}
.gux-skill-slots[data-position="right"] {
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
}
.gux-skill-slots[data-position="left"] {
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  flex-direction: column;
}
.gux-skill-slots[data-position="bottom"] {
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: row;
}
.gux-skill-slot {
  width: var(--gux-skill-slot-size);
  height: var(--gux-skill-slot-size);
  position: relative;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.3);
  background: linear-gradient(180deg, rgba(26,28,35,0.88), rgba(8,10,14,0.88));
  box-shadow: 0 10px 18px rgba(0,0,0,0.35);
  overflow: hidden;
}
.gux-skill-cd {
  position: absolute;
  inset: 0;
  transform-origin: bottom center;
  transform: scaleY(0);
  background: rgba(8, 10, 14, 0.68);
  transition: transform 40ms linear;
  z-index: 1;
}
.gux-skill-slot.is-cooldown { filter: saturate(0.55); }
.gux-skill-icon {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: calc(var(--gux-skill-slot-size) * 0.48);
  z-index: 2;
}
.gux-skill-key {
  position: absolute;
  left: 5px;
  top: 4px;
  font-size: 10px;
  color: #f8fafc;
  text-shadow: 0 1px 1px rgba(0,0,0,0.8);
  z-index: 3;
}
.gux-skill-level {
  position: absolute;
  right: 5px;
  bottom: 4px;
  font-size: 10px;
  color: #fde68a;
  text-shadow: 0 1px 1px rgba(0,0,0,0.8);
  z-index: 3;
}
.gux-skill-name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 14px;
  font-size: 9px;
  line-height: 14px;
  text-align: center;
  color: #e2e8f0;
  background: rgba(15, 17, 22, 0.9);
  z-index: 2;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`
