import { Bind, IAsset } from "@Loader/assetmodel"
import { Loader } from "@Loader/loader"
import { Deck, DeckType } from "./deck"
import { AttackItemType, ItemType, Level } from "./item"

export class ItemId {
    public static Hanhwasbat = "Hanhwasbat"//Symbol("Hanhwa's Bat")
    public static WarterCan = "WarterCan"//Symbol("Warter Can")
    public static Hammer = "Hammer"//Symbol("Hammer H3")
    public static DefaultGun = "DefaultGun"//Symbol("DefaultGun")
    public static Leather = "Leather"//Symbol("Leather")
    public static Logs = "Logs"//Symbol("Logs")
    public static Rocks = "Rocks"//Symbol("Rocks")

    public static ZombieDeck = "ZombieDeck"
    public static MinataurDeck = "MinataurDeck"
    public static BatPigDeck = "BatPigDeck"
    public static BilbyDeck = "BilbyDeck"
    public static BirdmonDeck = "BirdmonDeck"
    public static CrabDeck = "CrabDeck"
    public static BuilderDeck = "BuilderDeck"
    public static GolemDeck = "GolemDeck"
    public static BigGolemDeck = "BigGolemDeck"
    public static KittenMonkDeck = "KittenMonkDeck"
    public static SkeletonDeck = "SkeletonDeck"
    public static SnakeDeck = "SnakeDeck"
    public static ToadMageDeck = "GolemDeck"
    public static VikingDeck = "VikingDeck"
    public static WereWolfDeck = "WerewolfDeck"

    public static Apple = "Apple"
    public static Coconut = "Coconut"
    public static Tomato = "Tomato"
    public static Potato = "Potato"
    public static Carrot = "Carrot"

    public static DeckList: string[] = [
        this.ZombieDeck, this.MinataurDeck, this.BatPigDeck, this.BilbyDeck,
        this.BirdmonDeck, this.CrabDeck, this.SkeletonDeck, this.GolemDeck,
        this.BigGolemDeck, this.KittenMonkDeck, this.SnakeDeck, this.BuilderDeck,
        this.ToadMageDeck, this.VikingDeck, this.WereWolfDeck
    ]
    public static DropList: string[] = [
        this.Leather, this.Logs, this.Rocks
    ]
    public static HavestList: string[] = [
        this.Apple, this.Coconut, this.Tomato, this.Potato, this.Carrot
    ]
    public static ItemCategory: string[][] = [
        this.DeckList, this.DropList, this.HavestList
    ]
}


export type ItemProperty = {
    id: string
    type: ItemType
    weapon?: AttackItemType
    bind?: Bind
    asset?: IAsset
    meshs?: THREE.Group

    level?: Level
    name: string
    namekr?: string
    icon: string
    stackable: boolean
    binding: boolean
    price?: number

    damageMin?: number
    damageMax?: number
    armor?: number

    speed?: number

    agility?: number
    stamina?: number
    fireResistance?: number
    natureResistance?: number

    deck?: DeckType
}

export class ItemDb {
    itemDb = new Map<ItemId, ItemProperty>()

    constructor(private loader: Loader) {
        this.itemDb.set(ItemId.Hanhwasbat, {
            id: ItemId.Hanhwasbat,
            type: ItemType.Attack,
            weapon: AttackItemType.Blunt,
            bind: Bind.Hands_R,
            asset: this.loader.BatAsset,
            level: Level.Common,
            name: "Hanhwa's Bat",
            icon: "WeaponTool/TopazStaff.png",
            stackable: false, binding: true,
            damageMax: 5, damageMin: 3, speed: 1,
        })
        this.itemDb.set(ItemId.DefaultGun, {
            id: ItemId.DefaultGun,
            type: ItemType.Attack,
            weapon: AttackItemType.Gun,
            bind: Bind.Hands_R,
            asset: this.loader.GunAsset,
            level: Level.Common,
            name: "Legacy Gun",
            icon: "WeaponTool/Bow.png",
            stackable: false, binding: true,
            damageMax: 9, damageMin: 3, speed: 1,
        })
        this.itemDb.set(ItemId.WarterCan, {
            id: ItemId.WarterCan,
            type: ItemType.Farm,
            bind: Bind.Hands_R,
            asset: this.loader.WarteringCanAsset,
            level: Level.Common,
            name: "Wartering Can",
            icon: "Misc/Lantern.png",
            stackable: false, binding: true,
            damageMax: 5, damageMin: 3, speed: 1,
        })
        this.itemDb.set(ItemId.Hammer, {
            id: ItemId.Hammer,
            type: ItemType.Attack,
            bind: Bind.Hands_R,
            asset: this.loader.HammerAsset,
            level: Level.Common,
            name: "Hammer H3",
            icon: "WeaponTool/Hammer.png",
            stackable: false, binding: true,
            damageMax: 5, damageMin: 3, speed: 1.5,
        })
        this.itemDb.set(ItemId.Leather, {
            id: ItemId.Leather,
            type: ItemType.Material,
            name: "Leather",
            namekr: "가죽",
            icon: "Material/Leather.png",
            stackable: true,
            binding: false,
            price: 1,
        })
        this.itemDb.set(ItemId.Logs, {
            id: ItemId.Logs,
            type: ItemType.Material,
            name: "WoodLog",
            namekr: "통나무",
            icon: "Material/WoodLog.png",
            stackable: true,
            binding: false,
            price: 1,
        })
        this.itemDb.set(ItemId.Rocks, {
            id: ItemId.Rocks,
            type: ItemType.Material,
            name: "Rocks",
            namekr: "돌조각",
            icon: "OreGem/SilverNugget.png",
            stackable: true,
            binding: false,
            price: 1,
        })
        this.itemDb.set(ItemId.ZombieDeck, {
            id: ItemId.ZombieDeck,
            type: ItemType.Deck,
            name: "Zombie Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.Zombie
        })
        this.itemDb.set(ItemId.MinataurDeck, {
            id: ItemId.MinataurDeck,
            type: ItemType.Deck,
            name: "Minataur Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.Minotaur
        })
        this.itemDb.set(ItemId.BatPigDeck, {
            id: ItemId.BatPigDeck,
            type: ItemType.Deck,
            name: "BatPig Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.BatPig
        })
        this.itemDb.set(ItemId.CrabDeck, {
            id: ItemId.CrabDeck,
            type: ItemType.Deck,
            name: "Crab Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.Crap
        })
        this.itemDb.set(ItemId.BuilderDeck, {
            id: ItemId.BuilderDeck,
            type: ItemType.Deck,
            name: "Builder Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.Builder
        })
        this.itemDb.set(ItemId.GolemDeck, {
            id: ItemId.GolemDeck,
            type: ItemType.Deck,
            name: "Golem Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.Golem
        })
        this.itemDb.set(ItemId.BigGolemDeck, {
            id: ItemId.BigGolemDeck,
            type: ItemType.Deck,
            name: "BigGolem Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.BigGolem
        })
        this.itemDb.set(ItemId.KittenMonkDeck, {
            id: ItemId.KittenMonkDeck,
            type: ItemType.Deck,
            name: "KittenMonk Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.KittenMonk
        })
        this.itemDb.set(ItemId.SkeletonDeck, {
            id: ItemId.SkeletonDeck,
            type: ItemType.Deck,
            name: "Skeleton Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.Skeleton
        })
        this.itemDb.set(ItemId.SnakeDeck, {
            id: ItemId.SnakeDeck,
            type: ItemType.Deck,
            name: "Snake Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.Snake
        })
        this.itemDb.set(ItemId.ToadMageDeck, {
            id: ItemId.ToadMageDeck,
            type: ItemType.Deck,
            name: "ToadMage Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.ToadMage
        })
        this.itemDb.set(ItemId.VikingDeck, {
            id: ItemId.VikingDeck,
            type: ItemType.Deck,
            name: "Viking Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.Viking
        })
        this.itemDb.set(ItemId.WereWolfDeck, {
            id: ItemId.WereWolfDeck,
            type: ItemType.Deck,
            name: "WereWolf Deck",
            icon: "Misc/Book.png",
            stackable: false,
            binding: false,
            price: 1,
            deck: Deck.WereWolf
        })
        this.itemDb.set(ItemId.Apple, {
            id: ItemId.Apple,
            type: ItemType.Farm,
            name: "Apple",
            icon: "Food/Apple.png",
            stackable: true,
            binding: false,
            price: 1,
        })
        this.itemDb.set(ItemId.Coconut, {
            id: ItemId.Coconut,
            type: ItemType.Farm,
            name: "Coconut",
            icon: "Food/GreenApple.png",
            stackable: true,
            binding: false,
            price: 1,
        })
        this.itemDb.set(ItemId.Tomato, {
            id: ItemId.Tomato,
            type: ItemType.Farm,
            name: "Tomato",
            icon: "Food/Wine2.png",
            stackable: true,
            binding: false,
            price: 1,
        })
        this.itemDb.set(ItemId.Potato, {
            id: ItemId.Potato,
            type: ItemType.Farm,
            name: "Potato",
            icon: "Food/GreenApple.png",
            stackable: true,
            binding: false,
            price: 1,
        })
        this.itemDb.set(ItemId.Carrot, {
            id: ItemId.Carrot,
            type: ItemType.Farm,
            name: "Carrot",
            icon: "Food/GreenApple.png",
            stackable: true,
            binding: false,
            price: 1,
        })
    }
    GetItem(key: ItemId): ItemProperty  {
        const ret = this.itemDb.get(key)
        if(ret == undefined)
            throw new Error("unkown key");
        return ret
    }
}