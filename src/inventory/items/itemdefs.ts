import { ActionDefs } from "@Glibs/actions/actiontypes";
import { Char } from "@Glibs/loader/assettypes";
import { Bind } from "@Glibs/types/assettypes";
import { AttackItemType } from "@Glibs/types/inventypes";
import { SoundType } from "@Glibs/types/soundtypes";

export const itemDefs = {
  Hanhwasbat: {
    id: "Hanhwasbat",
    name: "Hanhwa's Bat",
    nameKr: "한호의 배타",
    icon: "WeaponTool/TopazStaff.png",
    type: "attack",
    levelRequirement: 0,
    weapon: AttackItemType.Sword,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsBat,
    level: "common",
    stackable: false,
    binding: true,
    stats: { "damageMin": 3, "damageMax": 5, "speed": 1, "attackRange": 2 },
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Sword: {
    id: "Sword",
    name: "Starter Sword",
    nameKr: "시작용 소드",
    icon: "WeaponTool/TopazStaff.png",
    type: "attack",
    levelRequirement: 0,
    weapon: AttackItemType.Sword,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsSwordSword1,
    level: "common",
    stackable: false,
    binding: true,
    stats: { "damageMin": 3, "damageMax": 5, "speed": 1, "attackRange": 2 },
    actions: [ActionDefs.Swing],
  },
  DefaultGun: {
    id: "DefaultGun",
    name: "Legacy Gun",
    icon: "WeaponTool/Bow.png",
    type: "attack",
    levelRequirement: 0,
    weapon: AttackItemType.OneHandGun,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsGun,
    level: "common",
    stackable: false,
    binding: true,
    stats: { "damageMin": 3, "damageMax": 9, "speed": 1 },
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Pistol: {
    id: "Pistol",
    type: "attack",
    levelRequirement: 0,
    weapon: AttackItemType.OneHandGun,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsPistol,
    level: "common",
    name: "Pistol",
    icon: "WeaponTool/Bow.png",
    sound: SoundType.Pistol9mm,
    stackable: false, binding: true, autoAttack: true,
    stats: { "magicAttack": 9, "attack": 1, "attackSpeed": 1, "speed": 1, "attackRange": 7 },
    actions: [ActionDefs.MuzzleFlash, ActionDefs.Casing],
  },
  M4A1: {
    id: "M4A1",
    type: "attack",
    levelRequirement: 0,
    weapon: AttackItemType.TwoHandGun,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsM4A1,
    level: "common",
    name: "M4A1",
    icon: "WeaponTool/Bow.png",
    sound: SoundType.NATO556,
    stackable: false, binding: true, autoAttack: true,
    stats: {
      "magicAttack": 9, "attack": 3, "attackSpeed": .2, "speed": 1, "attackRange": 10
    },
    actions: [ActionDefs.MuzzleFlash, ActionDefs.Casing],
  },
  M16: {
    id: "M16",
    type: "attack",
    levelRequirement: 0,
    weapon: AttackItemType.TwoHandGun,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsGunsM16,
    level: "common",
    name: "M16",
    icon: "WeaponTool/Bow.png",
    sound: SoundType.NATO556,
    stackable: false, binding: true, autoAttack: true,
    stats: {
      "magicAttack": 9, "attack": 3, "attackSpeed": .1, "speed": 1, "attackRange": 10
    },
  },
  WarterCan: {
    id: "WarterCan",
    name: "Wartering Can",
    icon: "Misc/Lantern.png",
    type: "farm",
    bind: Bind.Hands_R,
    assetKey: Char.ItemsWateringCan,
    level: "common",
    stackable: false,
    binding: true,
    stats: { "damageMin": 3, "damageMax": 5, "speed": 1 },
    enchantments: {},
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Hammer: {
    id: "Hammer",
    name: "Hammer H3",
    icon: "WeaponTool/Hammer.png",
    type: "attack",
    bind: Bind.Hands_R,
    assetKey: Char.ItemsHammer,
    level: "common",
    stackable: false,
    binding: true,
    stats: { "damageMin": 3, "damageMax": 5, "speed": 1 },
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Leather: {
    id: "Leather",
    name: "Leather",
    icon: "Material/Leather.png",
    type: "material",
    stackable: true,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Logs: {
    id: "Logs",
    name: "WoodLog",
    icon: "Material/WoodLog.png",
    type: "material",
    stackable: true,
    binding: false,
    assetDrop: Char.KayKitResourceWoodLogA,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Rocks: {
    id: "Rocks",
    name: "Rocks",
    icon: "OreGem/SilverNugget.png",
    type: "material",
    stackable: true,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  ZombieDeck: {
    id: "ZombieDeck",
    name: "Zombie Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  MinataurDeck: {
    id: "MinataurDeck",
    name: "Minataur Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  BatPigDeck: {
    id: "BatPigDeck",
    name: "BatPig Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  CrabDeck: {
    id: "CrabDeck",
    name: "Crab Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  BuilderDeck: {
    id: "BuilderDeck",
    name: "Builder Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  BirdmonDeck: {
    id: "BirdmonDeck",
    name: "Birdmon Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  BilbyDeck: {
    id: "BilbyDeck",
    name: "Bilby Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  GolemDeck: {
    id: "GolemDeck",
    name: "Golem Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  BigGolemDeck: {
    id: "BigGolemDeck",
    name: "BigGolem Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  KittenMonkDeck: {
    id: "KittenMonkDeck",
    name: "KittenMonk Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  SkeletonDeck: {
    id: "SkeletonDeck",
    name: "Skeleton Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  SnakeDeck: {
    id: "SnakeDeck",
    name: "Snake Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  ToadMageDeck: {
    id: "ToadMageDeck",
    name: "ToadMage Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  VikingDeck: {
    id: "VikingDeck",
    name: "Viking Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  WereWolfDeck: {
    id: "WereWolfDeck",
    name: "WereWolf Deck",
    icon: "Misc/Book.png",
    type: "deck",
    stackable: false,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Apple: {
    id: "Apple",
    name: "Apple",
    icon: "Food/Apple.png",
    type: "farm",
    stackable: true,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Coconut: {
    id: "Coconut",
    name: "Coconut",
    icon: "Food/GreenApple.png",
    type: "farm",
    stackable: true,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Tomato: {
    id: "Tomato",
    name: "Tomato",
    icon: "Food/Wine2.png",
    type: "farm",
    stackable: true,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Potato: {
    id: "Potato",
    name: "Potato",
    icon: "Food/GreenApple.png",
    type: "farm",
    stackable: true,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
  Carrot: {
    id: "Carrot",
    name: "Carrot",
    icon: "Food/GreenApple.png",
    type: "farm",
    stackable: true,
    binding: false,
    actions: [
      {
        "type": "statBoost",
        "stats": {
          "attack": 2
        }
      }
    ],
  },
} as const;


// export type ItemId = keyof typeof itemDefs
// export type ItemProperty = (typeof itemDefs)[ItemId]

export type Itemdefs = typeof itemDefs
export type ItemId = keyof Itemdefs
export type ItemProperty = Itemdefs[ItemId] // 공통 타입