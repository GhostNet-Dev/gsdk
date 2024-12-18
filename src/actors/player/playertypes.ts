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

export type AttackOption = {
    type: AttackType,
    effect?: EffectType,
    damage: number
    distance?: number
    obj?: THREE.Object3D
}

export type PlayerStatus = {
    level: number
    maxHealth: number
    health: number
    maxMana: number
    mana: number
    maxExp: number
    exp: number
}

