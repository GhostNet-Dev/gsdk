import { ItemId } from "../../inventory/items/itemdb"
import { Char } from "../../loader/assetmodel"


export class FurnId {
    public static DefaultBed = "defaultbed"
    public static DefaultBath = "defaultbath"
    public static DefaultBookShelf = "defaultbookshelf"
    public static DefaultCloset = "defaultcloset"
    public static DefaultDesk = "defaultdesk"
    public static DefaultKitchen = "defaultkitchen"
    public static DefaultKitTable = "defaultkittable"
    public static DefaultOven = "defaultoven"
    public static DefaultRefrigerator = "defaultrefrigerator"
    public static DefaultSink = "defaultsink"
    public static DefaultTable = "defaulttable"
    public static DefaultToilet = "defaulttoilet"
    public static DefaultTv = "defaulttv"
    public static List = [
        this.DefaultBed, this.DefaultBath, this.DefaultBookShelf, this.DefaultCloset,
        this.DefaultDesk, this.DefaultKitTable, this.DefaultKitchen, this.DefaultOven,
        this.DefaultRefrigerator, this.DefaultSink, this.DefaultTable, this.DefaultToilet,
        this.DefaultTv, 
    ]
}
export enum FurnType {
    Bed, Bath, BookShelf, Closet, Desk, Kitchen, Table, Oven, Refrigerator,
    Sink, Toilet, Tv
}
export enum LocType {
    Living, Dining, Master, Kitchen, Bath
}

export type MadeBy = {
    itemId: string,
    count: number
}
export type FurnProperty = {
    id: FurnId
    type: FurnType
    loc: LocType
    assetId: Char
    name: string
    namekr: string
    buildingTime: number
    madeby?: MadeBy[]
}

export class FurnDb {
    furnDb = new Map<FurnId, FurnProperty>()
    get Items() { return this.furnDb }
    constructor() {
        this.furnDb.set(FurnId.DefaultBed, {
            id: FurnId.DefaultBed,
            type: FurnType.Bed,
            loc: LocType.Master,
            assetId: Char.Bed,
            name: "Bed",
            namekr: "침대",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Rocks, count: 2 },
                { itemId: ItemId.Logs, count: 5 },
                { itemId: ItemId.Leather, count: 5 },
            ]
        })
        this.furnDb.set(FurnId.DefaultBath, {
            id: FurnId.DefaultBath,
            type: FurnType.Bath,
            loc: LocType.Bath,
            assetId: Char.Bath,
            name: "Bath",
            namekr: "욕조",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Rocks, count: 10 },
            ]
        })
        this.furnDb.set(FurnId.DefaultBookShelf, {
            id: FurnId.DefaultBookShelf,
            type: FurnType.BookShelf,
            loc: LocType.Living,
            assetId: Char.Bookshelf,
            name: "BookShelf",
            namekr: "책장",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Logs, count: 5 },
            ]
        })
        this.furnDb.set(FurnId.DefaultCloset, {
            id: FurnId.DefaultCloset,
            type: FurnType.Closet,
            loc: LocType.Master,
            assetId: Char.Closet,
            name: "Closet",
            namekr: "옷장",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Logs, count: 10 },
            ]
        })
        this.furnDb.set(FurnId.DefaultDesk, {
            id: FurnId.DefaultDesk,
            type: FurnType.Desk,
            loc: LocType.Master,
            assetId: Char.Desk,
            name: "Desk",
            namekr: "컴퓨터책상",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Logs, count: 10 },
            ]
        })
        this.furnDb.set(FurnId.DefaultKitchen, {
            id: FurnId.DefaultKitchen,
            type: FurnType.Kitchen,
            loc: LocType.Kitchen,
            assetId: Char.Kitchen,
            name: "Kitchen",
            namekr: "부엌",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Rocks, count: 5 },
                { itemId: ItemId.Logs, count: 20 },
            ]
        })
        this.furnDb.set(FurnId.DefaultKitTable, {
            id: FurnId.DefaultKitTable,
            type: FurnType.Table,
            assetId: Char.KitTable,
            loc: LocType.Dining,
            name: "Kitchen Table",
            namekr: "식탁",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Logs, count: 5 },
            ]
        })
        this.furnDb.set(FurnId.DefaultOven, {
            id: FurnId.DefaultOven,
            type: FurnType.Oven,
            loc: LocType.Kitchen,
            assetId: Char.Oven,
            name: "Oven",
            namekr: "오븐",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Rocks, count: 10 },
                { itemId: ItemId.Logs, count: 2 },
            ]
        })
        this.furnDb.set(FurnId.DefaultRefrigerator, {
            id: FurnId.DefaultRefrigerator,
            type: FurnType.Refrigerator,
            loc: LocType.Kitchen,
            assetId: Char.Refrigerator,
            name: "Refrigerator",
            namekr: "냉장고",
            buildingTime: 1000 * 60, // a min
        })
        this.furnDb.set(FurnId.DefaultSink, {
            id: FurnId.DefaultSink,
            type: FurnType.Sink,
            loc: LocType.Bath,
            assetId: Char.Sink,
            name: "Sink",
            namekr: "세면대",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Rocks, count: 20 },
            ]
        })
        this.furnDb.set(FurnId.DefaultTable, {
            id: FurnId.DefaultTable,
            type: FurnType.Table,
            loc: LocType.Master,
            assetId: Char.Table,
            name: "Table",
            namekr: "책상",
            buildingTime: 1000 * 60, // a min
        })
        this.furnDb.set(FurnId.DefaultToilet, {
            id: FurnId.DefaultToilet,
            type: FurnType.Toilet,
            loc: LocType.Bath,
            assetId: Char.Toilet,
            name: "Toilet",
            namekr: "변기",
            buildingTime: 1000 * 60, // a min
            madeby: [
                { itemId: ItemId.Rocks, count: 10 },
            ]
        })
        this.furnDb.set(FurnId.DefaultTv, {
            id: FurnId.DefaultTv,
            type: FurnType.Tv,
            loc: LocType.Living,
            assetId: Char.TV,
            name: "TV",
            namekr: "티비",
            buildingTime: 1000 * 60, // a min
        })
    }
    get(id: FurnId) {
        return this.furnDb.get(id)
    }
}