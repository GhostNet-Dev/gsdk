import { ItemId } from "../../inventory/items/itemdb"
import { Char } from "../../loader/assetmodel"
import { MadeBy } from "../furniture/furndb"
import { MonDrop } from "../monsters/monsterdb"

export class PlantId {
    public static AppleTree = "appletree"
    public static CoconutTree = "coconutree"
    public static Tomato = "tomato"
    public static Potato = "potato"
    public static Carrot = "carrot"
    public static List = [
        this.AppleTree, this.CoconutTree, this.Tomato, this.Potato,
        this.Carrot
    ]
}

export enum PlantType {
    Tree,
    Vegetable,
    Fruit,
}

export type PlantProperty = {
    plantId: PlantId
    type: PlantType
    assetId: Char
    name: string
    namekr: string
    maxLevel: number
    levelUpTime: number
    warteringTime: number
    madeby?: MadeBy[]
    drop?: MonDrop[]
}

export class PlantDb {
    plantDb = new Map<string, PlantProperty>()
    get Items() { return this.plantDb }
    constructor() {
        this.plantDb.set(PlantId.AppleTree, {
            plantId: PlantId.AppleTree,
            type: PlantType.Tree,
            assetId: Char.AppleTree,
            name: "Apple Tree",
            namekr: "사과나무",
            maxLevel: 2,
            levelUpTime: 1000 * 10, //* 60 * 60 * 24, // a day
            warteringTime: 1000 * 60 * 60, // an hour
            drop: [
                { itemId: ItemId.Apple, ratio: 1 }
            ],
        })
        this.plantDb.set(PlantId.CoconutTree, {
            plantId: PlantId.CoconutTree,
            type: PlantType.Tree,
            assetId: Char.CoconutTree,
            name: "Coconut Tree",
            namekr: "코코넛나무",
            maxLevel: 2,
            levelUpTime: 1000 * 10, //* 60 * 60 * 24, // a day
            warteringTime: 1000 * 60 * 60, // an hour
            drop: [
                { itemId: ItemId.Coconut, ratio: 1 }
            ],
        })
        this.plantDb.set(PlantId.Tomato, {
            plantId: PlantId.Tomato,
            type: PlantType.Vegetable,
            assetId: Char.Tomato0,
            name: "Tomato",
            namekr: "토마토",
            maxLevel: 3,
            levelUpTime: 1000 * 10, //* 60 * 60 * 24, // a day
            warteringTime: 1000 * 60 * 60, // an hour
            drop: [
                { itemId: ItemId.Tomato, ratio: 1 }
            ],
        })
        this.plantDb.set(PlantId.Potato, {
            plantId: PlantId.Potato,
            type: PlantType.Vegetable,
            assetId: Char.Potato0,
            name: "Potato",
            namekr: "감자",
            maxLevel: 3,
            levelUpTime: 1000 * 60 * 60 * 24, // a day
            warteringTime: 1000 * 60 * 60, // an hour
            drop: [
                { itemId: ItemId.Potato, ratio: 1 }
            ],
        })
        this.plantDb.set(PlantId.Carrot, {
            plantId: PlantId.Carrot,
            type: PlantType.Vegetable,
            assetId: Char.Carrot0,
            name: "Carrot",
            namekr: "당근",
            maxLevel: 3,
            levelUpTime: 1000 * 60 * 60 * 24, // a day
            warteringTime: 1000 * 60 * 60, // an hour
            drop: [
                { itemId: ItemId.Carrot, ratio: 1 }
            ],
        })
    }
    get(id: string) {
        return this.plantDb.get(id)
    }
}