import { EffectType } from "@Glibs/types/effecttypes"

export enum AttackType {
    NormalSwing,
    Magic0,
    Exp,
    Heal,
    AOE, // Area of effect
    Buff,

    PlantAPlant,
    Wartering,
    Havest,

    Building,

    Delete,
}

export enum ActionType {
    Idle,
    Run,
    Jump,
    Punch,
    Sword,
    Gun,
    Bow,
    Wand,
    Fight,
    Dance,
    MagicH1,
    MagicH2,
    Dying,
    Clim,
    Swim,
    Downfall,

    PickFruit,
    PickFruitTree,
    PlantAPlant,
    Hammering,
    Watering,
    Building,
}

export type AttackOption = {
    type: AttackType,
    effect?: EffectType,
    damage: number
    distance?: number
    obj?: THREE.Object3D
    targetPoint?: THREE.Vector3
}

export interface PlayerStatusParam {
    level?: number
    maxHealth?: number
    health?: number
    maxMana?: number
    mana?: number
    maxExp?: number
    exp?: number
    immortal?: boolean
}

export type PlayerStatus = {
    level: number
    maxHealth: number
    health: number
    maxMana: number
    mana: number
    maxExp: number
    exp: number
    immortal: boolean
}

