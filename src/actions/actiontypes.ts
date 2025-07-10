import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { CharacterStatus } from "@Glibs/actors/battle/charstatus"
import { IPhysicsObject } from "@Glibs/interface/iobject"
import { StatSystem } from "@Glibs/inventory/stat/statsystem"

export interface IActionUser {
  name?: string
  objs: THREE.Group | THREE.Mesh

  baseSpec: {
    stats: StatSystem
    status: CharacterStatus
    ReceiveCalcDamage: (damage: number) => void
    ReceiveCalcHeal: (heal: number) => void
  }

  applyAction(action: IActionComponent, context?: ActionContext): void
}

/*
| 트리거                                         | 의미                       |
| ------------------------------------------- | ------------------------ |
| `onCast`                                    | 스킬 사용 시 발동               |
| `onEquip`, `onUnequip`                      | 장비 착용 시점                 |
| `onBuffApply`, `onBuffTick`, `onBuffRemove` | 버프 지속/종료 시점              |
| `onInteract` (확장 가능)                        | InteractableObject 지원 예정 |
*/
export type TriggerType =
  | "onCast"
  | "onBuffApply" | "onBuffTick" | "onBuffRemove"
  | "onEquip" | "onUnequip"
  | "onInteract"
  | "onEnterArea"
  | "onAttackHit"
  | "onUse"


export interface ActionDef {
  type: string
  trigger: TriggerType
  [key: string]: any
}



export interface ActionContext {
  source?: any
  level?: number
  skillId?: string
  via?: "item" | "skill" | "buff"
}


export interface IActionComponent {
  id?: string

  // 즉시 발동 (예: 스킬 사용, 아이템 사용)
  activate?(target: IActionUser, context?: ActionContext): void

  // 지속 적용 (예: 장비 착용, 버프 적용)
  apply?(target: IActionUser, context?: ActionContext): void

  // 해제 (예: 장비 해제, 버프 제거)
  remove?(target: IActionUser): void

  // 발동 가능 여부 (쿨다운 등)
  isAvailable?(context?: ActionContext): boolean
}

export const sampleActionDefs = [
  {
    type: "statBoost",
    trigger: "onBuffApply",
    stats: { defense: 5, maxHp: 20 }
  },
  {
    type: "regen",
    trigger: "onBuffTick",
    amount: 2
  },
  {
    type: "fireball",
    trigger: "onCast"
  },
  {
    type: "bleed",
    trigger: "onHit",
    chance: 0.3,
    dps: 5
  },
  {
    type: "knockback",
    trigger: "onHit",
    force: 1.5
  },
  {
    id: "fireball",
    name: "Fireball",
    trigger: "onCast",
    type: "projectileFire",
    cooldown: 3,
    levels: [
      { damage: 10, radius: 1.0, speed: 10 },
      { damage: 15, radius: 1.2, speed: 10 },
      { damage: 20, radius: 1.5, speed: 10 }
    ]
  },
  {
    id: "heal",
    name: "Heal",
    trigger: "onCast",
    type: "regen",
    cooldown: 5,
    levels: [
      { amount: 20 },
      { amount: 35 },
      { amount: 50 }
    ]
  }
]
