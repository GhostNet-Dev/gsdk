import { Char } from "@Glibs/types/assettypes";
import { AllyId, AllyProperty } from "./allytypes";
import { NewDefaultAllyState } from "./ally/allystate";
import { ActionType } from "@Glibs/types/playertypes";
import { allyProjectileDefs } from "@Glibs/actors/projectile/projectiledefs";

const allyStatPresets: Record<AllyId, AllyProperty["stats"]> = {
    [AllyId.Warrior]: {
        hp: 80,
        mp: 0,
        attackMelee: 18,
        defense: 15,
        speed: 2,
        attackSpeedMelee: 1.5,
    },
    [AllyId.Archer]: {
        hp: 50,
        mp: 30,
        attackMelee: 8,
        attackRanged: 16,
        defense: 8,
        speed: 2,
        attackSpeedMelee: 1.0,
        attackSpeedRanged: 1.0,
        attackRange: 18,
    },
    [AllyId.Mage]: {
        hp: 40,
        mp: 80,
        attackMelee: 4,
        attackRanged: 0,
        magicAttack: 24,
        defense: 5,
        speed: 2,
        attackSpeedMelee: 2.0,
        attackSpeedRanged: 1.35,
        attackRange: 22,
    },
}

export class AllyDb {
    private allyDb = new Map<AllyId, AllyProperty>()

    constructor() {
        this.allyDb.set(AllyId.Warrior, {
            id: AllyId.Warrior,
            model: Char.CharHumanKayKitAdvKnight,
            stats: allyStatPresets[AllyId.Warrior],
            idleStates: NewDefaultAllyState,
        })
        this.allyDb.set(AllyId.Archer, {
            id: AllyId.Archer,
            model: Char.CharHumanKayKitAdvRogue,
            stats: allyStatPresets[AllyId.Archer],
            projectileDef: allyProjectileDefs.ArcherKnife,
            attackAction: ActionType.Bow,
            idleStates: NewDefaultAllyState,
        })
        this.allyDb.set(AllyId.Mage, {
            id: AllyId.Mage,
            model: Char.CharHumanKayKitAdvMage,
            stats: allyStatPresets[AllyId.Mage],
            projectileDef: allyProjectileDefs.MageEnergyHoming,
            attackAction: ActionType.MagicH1,
            idleStates: NewDefaultAllyState,
        })
    }

    GetItem(key: AllyId): AllyProperty {
        const ret = this.allyDb.get(key)
        if (ret == undefined) throw new Error("unknown ally id")
        return ret
    }
}
