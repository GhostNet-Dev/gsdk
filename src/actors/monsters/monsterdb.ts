import { baseStatPresets } from "@Glibs/actors/battle/stats"
import { itemDefs } from "@Glibs/inventory/items/itemdefs"
import { Char } from "@Glibs/types/assettypes"
import { MonsterId, MonsterProperty, MonsterType } from "@Glibs/types/monstertypes"


export class MonsterDb {
    monDb = new Map<MonsterId, MonsterProperty>()
    constructor() {
        this.monDb.set(MonsterId.Bee, {
            id: MonsterId.Bee,
            type: MonsterType.Insect,
            model: Char.CharAniBee,
            stats: baseStatPresets[MonsterId.Bee]
        })
        this.monDb.set(MonsterId.Zombie, {
            id: MonsterId.Zombie,
            type: MonsterType.Undead,
            model: Char.CharMonZombie,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.ZombieDeck.id, ratio: 0.1 }
            ],
            stats: baseStatPresets[MonsterId.Zombie]
        })
        this.monDb.set(MonsterId.Minotaur, {
            id: MonsterId.Minotaur,
            type: MonsterType.Beast,
            model: Char.CharMonMinataur,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.MinataurDeck.id, ratio: 0.05 }
            ],
            stats: baseStatPresets[MonsterId.Minotaur]
        })
        this.monDb.set(MonsterId.Batpig, {
            id: MonsterId.Batpig,
            type: MonsterType.Beast,
            model: Char.CharMonBatPig,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.BatPigDeck.id, ratio: 0.05 }
            ],
            stats: baseStatPresets[MonsterId.Batpig]
        })
        this.monDb.set(MonsterId.Bilby, {
            id: MonsterId.Bilby,
            type: MonsterType.Beast,
            model: Char.CharAniBilby,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.BilbyDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Birdmon, {
            id: MonsterId.Birdmon,
            type: MonsterType.Beast,
            model: Char.CharMonBird,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.BirdmonDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Crab, {
            id: MonsterId.Crab,
            type: MonsterType.Beast,
            model: Char.CharMonCrab,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.CrabDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Builder, {
            id: MonsterId.Builder,
            type: MonsterType.Warrior,
            model: Char.CharHumanBuilder,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.BuilderDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Golem, {
            id: MonsterId.Golem,
            type: MonsterType.Element,
            model: Char.CharMonGolem,
            drop: [
                { itemId: itemDefs.Rocks.id, ratio: 0.5 },
                { itemId: itemDefs.GolemDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.BigGolem, {
            id: MonsterId.BigGolem,
            type: MonsterType.Element,
            model: Char.CharMonBigGolem,
            drop: [
                { itemId: itemDefs.Rocks.id, ratio: 0.5 },
                { itemId: itemDefs.BigGolemDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.KittenMonk, {
            id: MonsterId.KittenMonk,
            type: MonsterType.Beast,
            model: Char.CharMonKittenMonk,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.KittenMonkDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Skeleton, {
            id: MonsterId.Skeleton,
            type: MonsterType.Undead,
            model: Char.CharMonSkeleton,
            drop: [
                { itemId: itemDefs.SkeletonDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Snake, {
            id: MonsterId.Snake,
            type: MonsterType.Beast,
            model: Char.CharMonSnake,
            drop: [
                { itemId: itemDefs.SnakeDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.ToadMage, {
            id: MonsterId.ToadMage,
            type: MonsterType.Beast,
            model: Char.CharMonToadMage,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.ToadMageDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Viking, {
            id: MonsterId.Viking,
            type: MonsterType.Warrior,
            model: Char.CharHumanViking,
            drop: [
                { itemId: itemDefs.VikingDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.WereWolf, {
            id: MonsterId.WereWolf,
            type: MonsterType.Beast,
            model: Char.CharMonWereWolf,
            drop: [
                { itemId: itemDefs.Leather.id, ratio: 0.5 },
                { itemId: itemDefs.WereWolfDeck.id, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Stone, {
            id: MonsterId.Stone,
            type: MonsterType.Rock,
            model: Char.Stone,
            drop: [
                { itemId: itemDefs.Rocks.id, ratio: 1 }
            ]
        })
        this.monDb.set(MonsterId.Tree, {
            id: MonsterId.Tree,
            type: MonsterType.Plant,
            model: Char.Tree,
            drop: [
                { itemId: itemDefs.Logs.id, ratio: 1 }
            ]
        })
        this.monDb.set(MonsterId.DefaultBall, {
            id: MonsterId.DefaultBall,
            type: MonsterType.Rock,
            model: Char.None,
        })
        this.monDb.set(MonsterId.DefaultBullet, {
            id: MonsterId.DefaultBullet,
            type: MonsterType.Rock,
            model: Char.None,
        })
        this.monDb.set(MonsterId.BulletLine, {
            id: MonsterId.BulletLine,
            type: MonsterType.Rock,
            model: Char.None,
        })
    }
    GetItem(key: MonsterId): MonsterProperty  {
        const ret = this.monDb.get(key)
        if(ret == undefined)
            throw new Error("unkown key");
        return ret
    }
}