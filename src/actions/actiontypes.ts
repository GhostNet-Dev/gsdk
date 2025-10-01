import { CharacterStatus } from "@Glibs/actors/battle/charstatus"
import { StatSystem } from "@Glibs/inventory/stat/statsystem"

export interface IActionUser {
  name?: string
  objs?: THREE.Group | THREE.Mesh | THREE.Object3D

  baseSpec: {
    stats: StatSystem
    status: CharacterStatus
    ReceiveCalcDamage: (damage: number) => void
    ReceiveCalcHeal: (heal: number) => void
  }

  applyAction(action: IActionComponent, context?: ActionContext): void
  removeAction(action: IActionComponent, context?: ActionContext): void
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
  | "onAttack"
  | "onUse" | "onUnuse"
  | "onFire"
  | "onHit"
  | "onActivate"


export interface ActionDef {
  type: string
  trigger: TriggerType
  [key: string]: any
}



export interface ActionContext {
  source?: any
  destination?: any
  level?: number
  skillId?: string
  via?: "item" | "skill" | "buff"
  direction?: THREE.Vector3
  param?: any
}


export interface IActionComponent {
  id?: string

  // 즉시 발동 (예: 스킬 사용, 아이템 사용)
  activate?(target: IActionUser, context?: ActionContext): void

  deactivate?(target: IActionUser, context?: ActionContext): void

  // 지속 적용 (예: 장비 착용, 버프 적용)
  apply?(target: IActionUser, context?: ActionContext): void

  trigger?(target: IActionUser, triggerType: TriggerType, context?: ActionContext): void

  // 해제 (예: 장비 해제, 버프 제거)
  remove?(target: IActionUser): void

  // 발동 가능 여부 (쿨다운 등)
  isAvailable?(context?: ActionContext): boolean
}

export const ActionDefs = {
  MuzzleFlash: {
    type: "muzzleFlash",
    trigger: "onFire",
    texture: "https://hons.ghostwebservice.com/assets/texture/particlepack/muzzle_02.png",
    socket: "muzzlePoint",
    size: 1,
    duration: 0.1
  },
  Casing: {
    type: "casing",
    trigger: "onFire",
    socket: "casingEjectionPoint",
  },
  Shaker: {
    type: "shaker",
    trigger: "onHit",
  },
  Fluffy: {
    type: "fluffy",
    trigger: "onActivate",
  },
  Swing: {
    type: "swing",
    trigger: "onUse",
    socketA: "localTipAOffset",
    socketB: "localTipBOffset",
  },
  StunStars: {
    type: "stunstars",
    trigger: "onActivate" as TriggerType,
  },
  DarkParticle: {
    type: "darkparticle",
    trigger: "onActivate",
  },
  FireFlame: {
    type: "fireflame",
    trigger: "onActivate",
  },
  StatBoost: {
    type: "statBoost",
    trigger: "onBuffApply",
    stats: { defense: 5, maxHp: 20 }
  },
  Regen: {
    type: "regen",
    trigger: "onBuffTick",
    amount: 2
  },
  Bleed: {
    type: "bleed",
    trigger: "onHit",
    chance: 0.3,
    dps: 5
  },
  Knockback: {
    type: "knockback",
    trigger: "onHit",
    force: 1.5
  },
  FireBall: {
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
  Heal: {
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
}
