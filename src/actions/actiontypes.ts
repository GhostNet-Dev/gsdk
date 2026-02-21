import { CharacterStatus } from "@Glibs/actors/battle/charstatus"
import { StatSystem } from "@Glibs/inventory/stat/statsystem"

export interface IActionUser {
  name?: string
  objs?: THREE.Group | THREE.Mesh | THREE.Object3D
  targets?: THREE.Object3D[]

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

export const actionDefs = {

  // =================================================================
  // 1. [공용 스탯 - 공격] (이전 VS 트리 통합)
  // =================================================================

  StatBoost: {
    type: "statBoost",
    trigger: "onBuffApply",
    stats: { defense: 5, maxHp: 20 }
  },
  HpStatBoost: {
    type: "hpStatBoost",
    trigger: "onActivate",
    levels: [
      { hp: 3, },
      { hp: 5, },
      { hp: 10, }
    ]
  },
  AttackStatBoost: {
    type: "attackStatBoost",
    trigger: "onActivate",
    levels: [
      { attack: 3, },
      { attack: 5, },
      { attack: 7, },
      { attack: 10, },
      { attack: 14, }
    ]
  },
  ProjectileSpeedStatBoost: {
    type: "projectileSpeedStatBoost",
    trigger: "onActivate",
    levels: [
      { projectileSpeed: 0.1 },
      { projectileSpeed: 0.2 },
      { projectileSpeed: 0.3 },
    ]
  },
  AreaStatBoost: {
    type: "areaStatBoost",
    trigger: "onActivate",
    levels: [
      { attackRange: 0.4 },
      { attackRange: 0.8 },
      { attackRange: 1.2 },
      { attackRange: 1.6 },
      { attackRange: 2.0 },
    ]
  },
  CooldownStatBoost: {
    type: "cooldownStatBoost",
    trigger: "onActivate",
    levels: [
      { cooldownReduction: 0.05 },
      { cooldownReduction: 0.10 },
      { cooldownReduction: 0.15 },
      { cooldownReduction: 0.20 },
      { cooldownReduction: 0.25 },
    ]
  },
  CritRateStatBoost: {
    type: "critRateStatBoost",
    trigger: "onActivate",
    levels: [
      { criticalRate: 3 },
      { criticalRate: 6 },
      { criticalRate: 9 },
      { criticalRate: 12 },
      { criticalRate: 15 },
    ]
  },
  // =================================================================
  // 1. Effector
  // =================================================================
  MuzzleFlash: { // 총열 불꽃 효과
    type: "muzzleFlash",
    trigger: "onFire",
    texture: "https://hons.ghostwebservice.com/assets/texture/particlepack/muzzle_02.png",
    socket: "muzzlePoint",
    size: 1,
    duration: 0.1
  },
  Casing: { // 탄피 배출
    type: "casing",
    trigger: "onFire",
    socket: "casingEjectionPoint",
  },
  Shaker: { // 나무에 도끼 충격과 같은 강한 흔들림 효과를 적용합니다.
    type: "shaker",
    trigger: "onHit",
  },
  Fluffy: { // 나무에 바람에 흔들림 효과를 적용합니다.
    type: "fluffy",
    trigger: "onActivate",
  },
  Swing: { // 칼을 휘두를때 발생하는 효과
    type: "swing",
    trigger: "onUse",
    socketA: "localTipAOffset",
    socketB: "localTipBOffset",
  },
  SwingArc: { // 칼을 휘두를때 발생하는 효과
    type: "swingarc",
    trigger: "onUse",
    socketA: "localTipAOffset",
    socketB: "localTipBOffset",
  },
  StunStars: { // 머리 위에 별이 도는 효과
    type: "stunstars",
    trigger: "onActivate" as TriggerType,
  },
  DarkParticle: { // 어둠 덩어리가 배출되는 효과
    type: "darkparticle",
    trigger: "onActivate",
  },
  FireFlame: { // 물체에 불꽃 효과를 엊는다.
    type: "fireflame",
    trigger: "onActivate",
  },
  GhostAura: { // 물체에 유령효과를 엊는다.
    type: "ghostaura",
    trigger: "onActivate",
  },
  FireDefence: {
    type: "firedefence",
    trigger: "onActivate",
  },
  ElectricAura: { // 물체에 전기가 흐르는 효과를 엊는다. 
    type: "electricaura",
    trigger: "onActivate",
  },
  // =================================================================
  // friendly
  // =================================================================
  ElectricDefence: {
    type: "electricdefence",
    trigger: "onActivate",
  },
  WaterDefence: {
    type: "waterdefence",
    trigger: "onActivate",
  },
  // =================================================================
  // Skill Effector
  // =================================================================
  Knockback: {
    type: "knockback",
    trigger: "onHit",
    force: 1.5
  },
  // =================================================================
  // buff
  // =================================================================
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

  CurseTorment: {
    type: "statBoost",
    trigger: "onActivate",
    levels: [
      { },
      { goldBonus: 2, expBonus: 2, itemDropRate: 1, defense: -2, hp: -5 },
      { goldBonus: 4, expBonus: 4, itemDropRate: 2, defense: -4, hp: -10 },
      { goldBonus: 6, expBonus: 6, itemDropRate: 3, defense: -6, hp: -15 },
      { goldBonus: 8, expBonus: 8, itemDropRate: 4, defense: -8, hp: -20 },
      { goldBonus: 10, expBonus: 10, itemDropRate: 5, defense: -10, hp: -25 },
    ]
  },
  // =================================================================
  // Magic
  // =================================================================
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
  Meteor: {
    id: "skill_meteor",
    name: "Meteor",
    trigger: "onCast",
    type: "meteor",
    cooldown: 7,
    distance: 8,
    fallDuration: 0.65,
    ringRadius: 1.9,
    ringCount: 6,
    levels: [
      { damage: 20, radius: 2.0 },
      { damage: 28, radius: 2.4 },
      { damage: 36, radius: 2.8 }
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


export type ActionDefs = typeof actionDefs
export type ActionId = keyof ActionDefs
export type ActionProperty = ActionDefs[ActionId] // 공통 타입