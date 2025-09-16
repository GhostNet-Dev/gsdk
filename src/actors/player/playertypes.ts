import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { CharacterStatus } from "@Glibs/actors/battle/charstatus"
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
    TreeIdle,
    Run,
    Jump,
    Punch,
    Rolling,
    SleepingIdle,

    Sword,
    SwordRun,
    TwoHandSwordIdle,
    TwoHandSword1,
    TwoHandSword2,
    TwoHandSwordTonado,
    TwoHandSwordFinish,

    OneHandGun,
    PistolRun,

    TwoHandGun,
    RifleRun,
    RifleIdle,

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
    CutDownTree,
    
    AxeAttack,
    AxeAttack360,
    AxeRun,

    MonBiteNeck,
    MonAgonizing,
    MonRunningCrawl,
}
export type PlayMode =
  | "default"
  | "tree"

export type AttackOption = {
    type: AttackType,
    effect?: EffectType,
    damage: number
    spec?: BaseSpec[],
    distance?: number
    obj?: THREE.Object3D
    targetPoint?: THREE.Vector3
    callback?: Function
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


export const DefaultStatus: CharacterStatus = {
    level: 1,
    health: 100,
    mana: 100,
    stamina: 100,
    maxExp: 100,
    exp: 0,
    immortal: false,

    stats: {
        attack: 1,
        magicAttack: 1,
        defense:1,
        magicDefense: 1,
        attackRange: 1,
        speed: 4,
        attackSpeed: 1,
        criticalRate: .01,
        criticalDamage: 1.5,
        accuracy: .95,
        evasion: .01,
        penetration: 1,
        block: .01,

        hp:100,
        hpRegen:1,
        mp: 100,
        mpRegen: 1,
        stamina: 100,
        staminaRegen: 1,
        movementSpeed: 1,
        castingSpeed: 1,
        cooldownReduction: 1,
        goldBonus: 1,
        expBonus: 1,
        itemDropRate: 1,
        threatLevel: 1,
        stealth: 1,
        strength: 1,
        dexterity: 1,
        constitution: 1,
        intelligence: 1,
        wisdom: 1,
        agility: 1,
        luck: 1,
        reflectDamage: 1,
        fireResistance: 1,
        iceResistance: 1,
        poisonResistance: 1,
        stunResistance: 1,
        slowResistance: 1,
        debuffResistance: 1,
        knockbackResistance: 1
    }
}