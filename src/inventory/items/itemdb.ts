import { Deck } from "./deck"
import { Bind } from "@Glibs/types/assettypes"
import { Loader } from "@Glibs/loader/loader"
import { Char } from "@Glibs/loader/assettypes"
import { SoundType } from "@Glibs/types/soundtypes"



// export class ItemDb {
//     itemDb = new Map<ItemId, ItemProperty>()

//     constructor(private loader: Loader) {
//         this.itemDb.set(ItemId.Hanhwasbat, {
//             id: ItemId.Hanhwasbat,
//             type: ItemType.Attack,
//             levelRequirement: 0,
//             weapon: AttackItemType.Blunt,
//             bind: Bind.Hands_R,
//             asset: this.loader.GetAssets(Char.ItemsBat),
//             level: Level.Common,
//             name: "Hanhwa's Bat",
//             icon: "WeaponTool/TopazStaff.png",
//             stackable: false, binding: true, autoAttack: true,
//             stats: { magicAttack: 5, attack: 3, attackSpeed: 1, speed: 1, attackRange: 5 },
//         })
//         this.itemDb.set(ItemId.DefaultGun, {
//             id: ItemId.DefaultGun,
//             type: ItemType.Attack,
//             levelRequirement: 0,
//             weapon: AttackItemType.OneHandGun,
//             bind: Bind.Hands_R,
//             asset: this.loader.GetAssets(Char.ItemsGun),
//             level: Level.Common,
//             name: "Legacy Gun",
//             icon: "WeaponTool/Bow.png",
//             stackable: false, binding: true, autoAttack: true,
//             stats: { magicAttack: 9, attack: 3, attackSpeed:1, speed: 1, attackRange: 5 },
//         })
//         this.itemDb.set(ItemId.Pistol, {
//             id: ItemId.Pistol,
//             type: ItemType.Attack,
//             levelRequirement: 0,
//             weapon: AttackItemType.OneHandGun,
//             bind: Bind.Hands_R,
//             asset: this.loader.GetAssets(Char.ItemsPistol),
//             level: Level.Common,
//             name: "Pistol",
//             icon: "WeaponTool/Bow.png",
//             sound: SoundType.Pistol9mm,
//             stackable: false, binding: true, autoAttack: true,
//             stats: { magicAttack: 9, attack: 3, attackSpeed:1, speed: 1, attackRange: 7 },
//         })
//         this.itemDb.set(ItemId.M4A1, {
//             id: ItemId.M4A1,
//             type: ItemType.Attack,
//             levelRequirement: 0,
//             weapon: AttackItemType.TwoHandGun,
//             bind: Bind.Hands_R,
//             asset: this.loader.GetAssets(Char.ItemsM4A1),
//             level: Level.Common,
//             name: "M4A1",
//             icon: "WeaponTool/Bow.png",
//             sound: SoundType.NATO556,
//             stackable: false, binding: true, autoAttack: true,
//             stats: { 
//                 magicAttack: 9, attack: 3, attackSpeed: .2, speed: 1, attackRange: 10 
//             },
//         })
//         this.itemDb.set(ItemId.M16, {
//             id: ItemId.M16,
//             type: ItemType.Attack,
//             levelRequirement: 0,
//             weapon: AttackItemType.TwoHandGun,
//             bind: Bind.Hands_R,
//             asset: this.loader.GetAssets(Char.ItemsGunsM16),
//             level: Level.Common,
//             name: "M16",
//             icon: "WeaponTool/Bow.png",
//             sound: SoundType.NATO556,
//             stackable: false, binding: true, autoAttack: true,
//             stats: { 
//                 magicAttack: 9, attack: 3, attackSpeed: .1, speed: 1, attackRange: 10 
//             },
//         })
//         this.itemDb.set(ItemId.WarterCan, {
//             id: ItemId.WarterCan,
//             type: ItemType.Farm,
//             levelRequirement: 0,
//             bind: Bind.Hands_R,
//             asset: this.loader.GetAssets(Char.ItemsWateringCan),
//             level: Level.Common,
//             name: "Wartering Can",
//             icon: "Misc/Lantern.png",
//             stackable: false, binding: true,
//             stats: { magicAttack: 5, attack: 3, speed: 1, attackRange: 5 },
//         })
//         this.itemDb.set(ItemId.Hammer, {
//             id: ItemId.Hammer,
//             type: ItemType.Attack,
//             levelRequirement: 0,
//             bind: Bind.Hands_R,
//             asset: this.loader.GetAssets(Char.ItemsHammer),
//             level: Level.Common,
//             name: "Hammer H3",
//             icon: "WeaponTool/Hammer.png",
//             stackable: false, binding: true,
//             stats: { magicAttack: 5, attack: 3, speed: 1.5, attackRange: 5 },
//         })
//         this.itemDb.set(ItemId.Leather, {
//             id: ItemId.Leather,
//             type: ItemType.Material,
//             levelRequirement: 0,
//             name: "Leather",
//             namekr: "가죽",
//             icon: "Material/Leather.png",
//             stackable: true,
//             binding: false,
//             price: 1,
//         })
//         this.itemDb.set(ItemId.Logs, {
//             id: ItemId.Logs,
//             type: ItemType.Material,
//             levelRequirement: 0,
//             name: "WoodLog",
//             namekr: "통나무",
//             icon: "Material/WoodLog.png",
//             stackable: true,
//             binding: false,
//             price: 1,
//         })
//         this.itemDb.set(ItemId.Rocks, {
//             id: ItemId.Rocks,
//             type: ItemType.Material,
//             levelRequirement: 0,
//             name: "Rocks",
//             namekr: "돌조각",
//             icon: "OreGem/SilverNugget.png",
//             stackable: true,
//             binding: false,
//             price: 1,
//         })
//         this.itemDb.set(ItemId.ZombieDeck, {
//             id: ItemId.ZombieDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "Zombie Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.Zombie
//         })
//         this.itemDb.set(ItemId.MinataurDeck, {
//             id: ItemId.MinataurDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "Minataur Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.Minotaur
//         })
//         this.itemDb.set(ItemId.BatPigDeck, {
//             id: ItemId.BatPigDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "BatPig Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.BatPig
//         })
//         this.itemDb.set(ItemId.CrabDeck, {
//             id: ItemId.CrabDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "Crab Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.Crap
//         })
//         this.itemDb.set(ItemId.BuilderDeck, {
//             id: ItemId.BuilderDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "Builder Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.Builder
//         })
//         this.itemDb.set(ItemId.GolemDeck, {
//             id: ItemId.GolemDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "Golem Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.Golem
//         })
//         this.itemDb.set(ItemId.BigGolemDeck, {
//             id: ItemId.BigGolemDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "BigGolem Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.BigGolem
//         })
//         this.itemDb.set(ItemId.KittenMonkDeck, {
//             id: ItemId.KittenMonkDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "KittenMonk Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.KittenMonk
//         })
//         this.itemDb.set(ItemId.SkeletonDeck, {
//             id: ItemId.SkeletonDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "Skeleton Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.Skeleton
//         })
//         this.itemDb.set(ItemId.SnakeDeck, {
//             id: ItemId.SnakeDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "Snake Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.Snake
//         })
//         this.itemDb.set(ItemId.ToadMageDeck, {
//             id: ItemId.ToadMageDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "ToadMage Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.ToadMage
//         })
//         this.itemDb.set(ItemId.VikingDeck, {
//             id: ItemId.VikingDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "Viking Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.Viking
//         })
//         this.itemDb.set(ItemId.WereWolfDeck, {
//             id: ItemId.WereWolfDeck,
//             type: ItemType.Deck,
//             levelRequirement: 0,
//             name: "WereWolf Deck",
//             icon: "Misc/Book.png",
//             stackable: false,
//             binding: false,
//             price: 1,
//             deck: Deck.WereWolf
//         })
//         this.itemDb.set(ItemId.Apple, {
//             id: ItemId.Apple,
//             type: ItemType.Farm,
//             levelRequirement: 0,
//             name: "Apple",
//             icon: "Food/Apple.png",
//             stackable: true,
//             binding: false,
//             price: 1,
//         })
//         this.itemDb.set(ItemId.Coconut, {
//             id: ItemId.Coconut,
//             type: ItemType.Farm,
//             levelRequirement: 0,
//             name: "Coconut",
//             icon: "Food/GreenApple.png",
//             stackable: true,
//             binding: false,
//             price: 1,
//         })
//         this.itemDb.set(ItemId.Tomato, {
//             id: ItemId.Tomato,
//             type: ItemType.Farm,
//             levelRequirement: 0,
//             name: "Tomato",
//             icon: "Food/Wine2.png",
//             stackable: true,
//             binding: false,
//             price: 1,
//         })
//         this.itemDb.set(ItemId.Potato, {
//             id: ItemId.Potato,
//             type: ItemType.Farm,
//             levelRequirement: 0,
//             name: "Potato",
//             icon: "Food/GreenApple.png",
//             stackable: true,
//             binding: false,
//             price: 1,
//         })
//         this.itemDb.set(ItemId.Carrot, {
//             id: ItemId.Carrot,
//             type: ItemType.Farm,
//             levelRequirement: 0,
//             name: "Carrot",
//             icon: "Food/GreenApple.png",
//             stackable: true,
//             binding: false,
//             price: 1,
//         })
//     }
//     GetItem(key: ItemId): ItemProperty  {
//         const ret = this.itemDb.get(key)
//         if(ret == undefined)
//             throw new Error("unkown key");
//         return ret
//     }
// }