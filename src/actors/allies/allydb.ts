import { Char } from "@Glibs/types/assettypes";
import { AllyId, AllyProperty } from "./allytypes";
import { NewDefaultAllyState } from "./ally/allystate";

const allyStatPresets: Record<AllyId, AllyProperty["stats"]> = {
    [AllyId.Warrior]: {
        hp: 80,
        mp: 0,
        attackMelee: 18,
        defense: 15,
        speed: 1,
        attackSpeedMelee: 1.5,
    },
    [AllyId.Archer]: {
        hp: 50,
        mp: 30,
        attackMelee: 14,
        defense: 8,
        speed: 1,
        attackSpeedMelee: 1.0,
    },
    [AllyId.Mage]: {
        hp: 40,
        mp: 80,
        magicAttack: 24,
        defense: 5,
        speed: 1,
        attackSpeedMelee: 2.0,
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
            idleStates: NewDefaultAllyState,
        })
        this.allyDb.set(AllyId.Mage, {
            id: AllyId.Mage,
            model: Char.CharHumanKayKitAdvMage,
            stats: allyStatPresets[AllyId.Mage],
            idleStates: NewDefaultAllyState,
        })
    }

    GetItem(key: AllyId): AllyProperty {
        const ret = this.allyDb.get(key)
        if (ret == undefined) throw new Error("unknown ally id")
        return ret
    }
}
