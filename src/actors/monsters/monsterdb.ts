import { baseStatPresets } from "@Glibs/actors/battle/stats"
import { ItemId } from "@Glibs/inventory/inventypes"
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
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.ZombieDeck, ratio: 0.1 }
            ],
            stats: baseStatPresets[MonsterId.Zombie]
        })
        this.monDb.set(MonsterId.Minotaur, {
            id: MonsterId.Minotaur,
            type: MonsterType.Beast,
            model: Char.CharMonMinataur,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.MinataurDeck, ratio: 0.05 }
            ],
            stats: baseStatPresets[MonsterId.Minotaur]
        })
        this.monDb.set(MonsterId.Batpig, {
            id: MonsterId.Batpig,
            type: MonsterType.Beast,
            model: Char.CharMonBatPig,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.BatPigDeck, ratio: 0.05 }
            ],
            stats: baseStatPresets[MonsterId.Batpig]
        })
        this.monDb.set(MonsterId.Bilby, {
            id: MonsterId.Bilby,
            type: MonsterType.Beast,
            model: Char.CharAniBilby,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.BilbyDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Birdmon, {
            id: MonsterId.Birdmon,
            type: MonsterType.Beast,
            model: Char.CharMonBird,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.BirdmonDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Crab, {
            id: MonsterId.Crab,
            type: MonsterType.Beast,
            model: Char.CharMonCrab,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.CrabDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Builder, {
            id: MonsterId.Builder,
            type: MonsterType.Warrior,
            model: Char.CharHumanBuilder,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.BuilderDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Golem, {
            id: MonsterId.Golem,
            type: MonsterType.Element,
            model: Char.CharMonGolem,
            drop: [
                { itemId: ItemId.Rocks, ratio: 0.5 },
                { itemId: ItemId.GolemDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.BigGolem, {
            id: MonsterId.BigGolem,
            type: MonsterType.Element,
            model: Char.CharMonBigGolem,
            drop: [
                { itemId: ItemId.Rocks, ratio: 0.5 },
                { itemId: ItemId.BigGolemDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.KittenMonk, {
            id: MonsterId.KittenMonk,
            type: MonsterType.Beast,
            model: Char.CharMonKittenMonk,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.KittenMonkDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Skeleton, {
            id: MonsterId.Skeleton,
            type: MonsterType.Undead,
            model: Char.CharMonSkeleton,
            drop: [
                { itemId: ItemId.SkeletonDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Snake, {
            id: MonsterId.Snake,
            type: MonsterType.Beast,
            model: Char.CharMonSnake,
            drop: [
                { itemId: ItemId.SnakeDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.ToadMage, {
            id: MonsterId.ToadMage,
            type: MonsterType.Beast,
            model: Char.CharMonToadMage,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.ToadMageDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Viking, {
            id: MonsterId.Viking,
            type: MonsterType.Warrior,
            model: Char.CharHumanViking,
            drop: [
                { itemId: ItemId.VikingDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.WereWolf, {
            id: MonsterId.WereWolf,
            type: MonsterType.Beast,
            model: Char.CharMonWereWolf,
            drop: [
                { itemId: ItemId.Leather, ratio: 0.5 },
                { itemId: ItemId.WereWolfDeck, ratio: 0.05 }
            ]
        })
        this.monDb.set(MonsterId.Stone, {
            id: MonsterId.Stone,
            type: MonsterType.Rock,
            model: Char.Stone,
            drop: [
                { itemId: ItemId.Rocks, ratio: 1 }
            ]
        })
        this.monDb.set(MonsterId.Tree, {
            id: MonsterId.Tree,
            type: MonsterType.Plant,
            model: Char.Tree,
            drop: [
                { itemId: ItemId.Logs, ratio: 1 }
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