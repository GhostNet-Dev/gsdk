import { Deck } from "./deck"
import { AttackItemType, ItemId, ItemProperty, ItemType, Level } from "../inventypes"
import { Bind } from "@Glibs/types/assettypes"
import { Loader } from "@Glibs/loader/loader"
import { Char } from "@Glibs/loader/assettypes"
import { SoundType } from "@Glibs/types/soundtypes"



export class ItemDb {
    itemDb = new Map<ItemId, ItemProperty>()

    constructor(private loader: Loader) {
        this.itemDb.set(ItemId.Hanhwasbat, {
            id: ItemId.Hanhwasbat,
            type: ItemType.Attack,
            weapon: AttackItemType.Blunt,
            bind: Bind.Hands_R,
            asset: this.loader.GetAssets(Char.ItemsBat),
            level: Level.Common,
            name: "Hanhwa's Bat",
            icon: "WeaponTool/TopazStaff.png",
            stackable: false, binding: true, autoAttack: true,
            damageMax: 5, damageMin: 3, speed: 1, attackRange: 5,
        })
        this.itemDb.set(ItemId.DefaultGun, {
            id: ItemId.DefaultGun,
            type: ItemType.Attack,
            weapon: AttackItemType.Gun,
            bind: Bind.Hands_R,
            asset: this.loader.GetAssets(Char.ItemsGun),
            level: Level.Common,
            name: "Legacy Gun",
            icon: "WeaponTool/Bow.png",
            stackable: false, binding: true, autoAttack: true,
            damageMax: 9, damageMin: 3, speed: 1, attackRange: 10,
        })
        this.itemDb.set(ItemId.Pistol, {
            id: ItemId.Pistol,
            type: ItemType.Attack,
            weapon: AttackItemType.Gun,
            bind: Bind.Hands_R,
            asset: this.loader.GetAssets(Char.ItemsPistol),
            level: Level.Common,
            name: "Pistol",
            icon: "WeaponTool/Bow.png",
            sound: SoundType.Pistol762x39,
            stackable: false, binding: true, autoAttack: true,
            damageMax: 9, damageMin: 3, speed: 1, attackRange: 15,
        })
        this.itemDb.set(ItemId.M4A1, {
            id: ItemId.M4A1,
            type: ItemType.Attack,
            weapon: AttackItemType.Gun,
            bind: Bind.Hands_R,
            asset: this.loader.GetAssets(Char.ItemsM4A1),
            level: Level.Common,
            name: "M4A1",
            icon: "WeaponTool/Bow.png",
            stackable: false, binding: true, autoAttack: true,
            damageMax: 9, damageMin: 3, speed: .3, attackRange: 20,
        })
        this.itemDb.set(ItemId.WarterCan, {
            id: ItemId.WarterCan,
            type: ItemType.Farm,
            bind: Bind.Hands_R,
            asset: this.loader.GetAssets(Char.ItemsWateringCan),
            level: Level.Common,
            name: "Wartering Can",
            icon: "Misc/Lantern.png",
            stackable: false, binding: true,
            damageMax: 5, damageMin: 3, speed: 1, attackRange: 5,
        })
        this.itemDb.set(ItemId.Hammer, {
            id: ItemId.Hammer,
            type: ItemType.Attack,
            bind: Bind.Hands_R,
            asset: this.loader.GetAssets(Char.ItemsHammer),
            level: Level.Common,
            name: "Hammer H3",
            icon: "WeaponTool/Hammer.png",
            stackable: false, binding: true,
            damageMax: 5, damageMin: 3, speed: 1.5, attackRange: 5,
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