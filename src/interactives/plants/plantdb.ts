import { itemDefs } from "@Glibs/inventory/items/itemdefs"
import { Char } from "@Glibs/types/assettypes"
import { PlantId, PlantProperty, PlantType } from "@Glibs/types/planttypes"

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
                { itemId: itemDefs.Apple.id, ratio: 1 }
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
                { itemId: itemDefs.Coconut.id, ratio: 1 }
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
                { itemId: itemDefs.Tomato.id, ratio: 1 }
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
                { itemId: itemDefs.Potato.id, ratio: 1 }
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
                { itemId: itemDefs.Carrot.id, ratio: 1 }
            ],
        })
    }
    get(id: string) {
        return this.plantDb.get(id)
    }
}