import { ItemId } from "@Glibs/inventory/inventypes"
import { Char } from "@Glibs/types/assettypes"
import { MonsterId, MonsterProperty, MonsterType } from "@Glibs/types/monstertypes"


export class MonsterDb {
    monDb = new Map<MonsterId, MonsterProperty>()
    constructor() {
        this.monDb.set(MonsterId.Bee, {
            id: MonsterId.Bee,
            type: MonsterType.Insect,
            model: Char.Bee,
            health: 10,
            speed: 1,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
        })
        this.monDb.set(MonsterId.Zombie, {
            id: MonsterId.Zombie,
            type: MonsterType.Undead,
            model: Char.Zombie,
            health: 10,
            speed: 1,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.ZombieDeck, ratio: 0.1 }
            ]
        })
        this.monDb.set(MonsterId.Minotaur, {
            id: MonsterId.Minotaur,
            type: MonsterType.Beast,
            model: Char.Minataur,
            health: 10,
            speed: 1,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.MinataurDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Batpig, {
            id: MonsterId.Batpig,
            type: MonsterType.Beast,
            model: Char.BatPig,
            health: 5,
            speed: 3,
            damageMin:1,
            damageMax: 3,
            attackSpeed: 1,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.BatPigDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Bilby, {
            id: MonsterId.Bilby,
            type: MonsterType.Beast,
            model: Char.Bilby,
            health: 10,
            speed: 1,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.BilbyDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Birdmon, {
            id: MonsterId.Birdmon,
            type: MonsterType.Beast,
            model: Char.BirdMon,
            health: 6,
            speed: 5,
            damageMin:1,
            damageMax: 3,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.BirdmonDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Crab, {
            id: MonsterId.Crab,
            type: MonsterType.Beast,
            model: Char.CrabMon,
            health: 8,
            speed: 1,
            damageMin:4,
            damageMax: 6,
            attackSpeed: 1,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.CrabDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Builder, {
            id: MonsterId.Builder,
            type: MonsterType.Warrior,
            model: Char.Builder,
            health: 10,
            speed: 4,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.BuilderDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Golem, {
            id: MonsterId.Golem,
            type: MonsterType.Element,
            model: Char.Golem,
            health: 10,
            speed: 1,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Rocks, ratio: 0.5 },
                { itemId: ItemId.GolemDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.BigGolem, {
            id: MonsterId.BigGolem,
            type: MonsterType.Element,
            model: Char.BigGolem,
            health: 10,
            speed: 4,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Rocks, ratio: 0.5 },
                { itemId: ItemId.BigGolemDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.KittenMonk, {
            id: MonsterId.KittenMonk,
            type: MonsterType.Beast,
            model: Char.KittenMonk,
            health: 10,
            speed: 4,
            damageMin:4,
            damageMax: 5,
            attackSpeed: 1,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.KittenMonkDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Skeleton, {
            id: MonsterId.Skeleton,
            type: MonsterType.Undead,
            model: Char.Skeleton,
            health: 10,
            speed: 3,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.SkeletonDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Snake, {
            id: MonsterId.Snake,
            type: MonsterType.Beast,
            model: Char.Snake,
            health: 10,
            speed: 4,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.SnakeDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.ToadMage, {
            id: MonsterId.ToadMage,
            type: MonsterType.Beast,
            model: Char.ToadMage,
            health: 10,
            speed: 5,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.ToadMageDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Viking, {
            id: MonsterId.Viking,
            type: MonsterType.Warrior,
            model: Char.Viking,
            health: 10,
            speed: 4,
            damageMin:1,
            damageMax: 5,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.VikingDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.WereWolf, {
            id: MonsterId.WereWolf,
            type: MonsterType.Beast,
            model: Char.WereWolf,
            health: 10,
            speed: 4,
            damageMin:8,
            damageMax: 10,
            attackSpeed: 2,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.WereWolfDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Stone, {
            id: MonsterId.Stone,
            type: MonsterType.Rock,
            model: Char.Stone,
            health: 1,
            speed: 0,
            damageMin:0,
            damageMax: 0,
            attackSpeed: 0,
            drop: [
                { itemId: ItemId.Rocks, ratio: 1 }
            ]
        })
        this.monDb.set(MonsterId.Tree, {
            id: MonsterId.Tree,
            type: MonsterType.Plant,
            model: Char.Tree,
            health: 1,
            speed: 0,
            damageMin:0,
            damageMax: 0,
            attackSpeed: 0,
            drop: [
                { itemId: ItemId.Logs, ratio: 1 }
            ]
        })
        this.monDb.set(MonsterId.DefaultBall, {
            id: MonsterId.DefaultBall,
            type: MonsterType.Rock,
            model: Char.None,
            health: 1,
            speed: 8,
            damageMin:3,
            damageMax: 4,
            attackSpeed: 7,
        })
        this.monDb.set(MonsterId.DefaultBullet, {
            id: MonsterId.DefaultBullet,
            type: MonsterType.Rock,
            model: Char.None,
            health: 1,
            speed: 17,
            damageMin:3,
            damageMax: 4,
            attackSpeed: 7,
        })
    }
    GetItem(key: MonsterId): MonsterProperty  {
        const ret = this.monDb.get(key)
        if(ret == undefined)
            throw new Error("unkown key");
        return ret
    }
}