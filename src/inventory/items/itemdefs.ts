import { ActionDefs } from "@Glibs/actions/actiontypes";
import { Char } from "@Glibs/loader/assettypes";
import { Bind } from "@Glibs/types/assettypes";
import { AttackItemType } from "@Glibs/types/inventypes";
import { SoundType } from "@Glibs/types/soundtypes";
import { itemIcons } from "@Glibs/ux/icons/itemicons";

export const itemDefs = {
  Hanhwasbat: {
    id: "Hanhwasbat",
    name: "Hanhwa's Bat",
    nameKr: "한호의 배타",
    descriptionKr: "오랜 세월 사용되어 낡은 흔적이 역력한 나무 배트입니다. 예상외로 무게 균형이 잘 잡혀 있어 자기 방어는 물론, 뭔가를 멀리 날려버리는 데에도 효과적입니다. 그 유래는 미스터리에 싸여 있지만, 풍부한 역사를 지녔다고 전해집니다.",
    description: "A simple, wooden bat, worn from years of use. It has a surprisingly balanced feel, making it a reliable tool for both self-defense and knocking something out of the park. It's said to have a rich history, though its origins are shrouded in mystery.",
    icon: itemIcons.Topazstaff,
    type: "meleeattack",
    levelRequirement: 0,
    weapon: AttackItemType.TwoHandSword,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsBat,
    level: "common",
    stackable: false,
    binding: true,
    stats: { "damageMin": 3, "damageMax": 5, "speed": 1, "attackRange": 2 },
    actions: [ActionDefs.FireFlame],
  },
  Sword: {
    id: "Sword",
    name: "Starter Sword",
    nameKr: "시작용 소드",
    descriptionKr: "모험을 막 시작한 이들을 위한 기본 지급 검입니다. 화려하진 않지만, 튼튼하고 단순한 디자인으로 임무를 완수하기에 충분합니다. 균형이 잘 잡혀 있어 초반 전투에서 믿음직한 동반자가 될 것입니다.",
    description: "A standard-issue sword, perfect for a fledgling adventurer. It's nothing fancy—just a simple, sturdy blade designed to get the job done. It's well-balanced and a reliable companion for your first few skirmishes.",
    icon: itemIcons.Topazstaff,
    type: "meleeattack",
    levelRequirement: 0,
    weapon: AttackItemType.TwoHandSword,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsSwordSword1,
    level: "common",
    stackable: false,
    sound: SoundType.SwordAttack1,
    binding: true, autoAttack: true,
    stats: { "damageMin": 3, "damageMax": 5, "speed": 1, "attackRange": 2 },
    actions: [ActionDefs.Swing],
  },
  DefaultGun: {
    id: "DefaultGun",
    name: "Legacy Gun",
    descriptionKr: "오래된 시대의 유물처럼 보이는 구식 총기입니다. 투박하지만 단순한 디자인이 오히려 내구성을 증명합니다. 최신 무기들의 화려함은 없지만, 의외로 강력한 한 방을 선사합니다.",
    description: "An old-school firearm, clearly a relic from a bygone era. It's a bit clunky, but its simple design is a testament to its durability. While it may lack the bells and whistles of modern weaponry, it packs a surprisingly powerful punch.",
    icon: itemIcons.Bow,
    type: "rangeattack",
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
    type: "rangeattack",
    levelRequirement: 0,
    weapon: AttackItemType.OneHandGun,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsPistol,
    level: "common",
    name: "Pistol",
    descriptionKr: `근접 전투에서 빠르고 정확한 대응이 필요한 이들을 위한 작고 믿음직한 권총입니다. 
                    작은 크기 덕분에 다루기 쉽고, 보조 무기로도 이상적입니다.`,
    description: `A compact and reliable sidearm. 
            The pistol is a practical choice for those who need a quick and precise response 
            in close-quarters combat. 
            Its small size makes it easy to handle and ideal as a backup weapon.`,
    icon: itemIcons.Bow,
    sound: SoundType.Pistol9mm,
    stackable: false, binding: true, autoAttack: true,
    stats: { "attack": 1, "attackSpeed": 1, "speed": 1, "attackRange": 7 },
    actions: [ActionDefs.MuzzleFlash, ActionDefs.Casing],
  },
  M4A1: {
    id: "M4A1",
    type: "rangeattack",
    levelRequirement: 0,
    weapon: AttackItemType.TwoHandGun,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsM4A1,
    level: "common",
    name: "M4A1",
    descriptionKr: "다재다능하고 널리 사용되는 돌격소총입니다. 화력, 정확성, 연사 속도가 균형을 이루고 있어 다양한 상황에서 신뢰할 수 있는 무기를 필요로 하는 숙련된 전투원들에게 인기가 높습니다.",
    description: "A versatile and widely-used assault rifle. The M4A1 offers a solid balance of firepower, accuracy, and rate of fire. Its customizable nature makes it a favorite among experienced fighters who need a dependable weapon for a variety of situations.",
    icon: itemIcons.Bow,
    sound: SoundType.NATO556,
    stackable: false, binding: true, autoAttack: true,
    stats: {
      "attack": 3, "attackSpeed": .2, "speed": 1, "attackRange": 10
    },
    actions: [ActionDefs.MuzzleFlash, ActionDefs.Casing],
  },
  M16: {
    id: "M16",
    type: "rangeattack",
    levelRequirement: 0,
    weapon: AttackItemType.TwoHandGun,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsGunsM16,
    level: "common",
    name: "M16",
    descriptionKr: "장거리에서 뛰어난 정확성을 자랑하는 고전적인 돌격소총입니다. 신속하고 치명적인 사격을 가할 수 있어, 적을 멀리서 제압하려는 명사수들에게 탁월한 선택입니다.",
    description: "A classic and iconic assault rifle known for its exceptional accuracy over long distances. The M16 delivers a swift and deadly barrage of rounds, making it an excellent choice for marksmen who prefer to keep their enemies at a distance.",
    icon: itemIcons.Bow,
    sound: SoundType.NATO556,
    stackable: false, binding: true, autoAttack: true,
    stats: {
      "attack": 3, "attackSpeed": .1, "speed": 1, "attackRange": 10
    },
    actions: [ActionDefs.MuzzleFlash, ActionDefs.Casing],
  },
  SCAR: {
    id: "SCAR",
    type: "rangeattack",
    levelRequirement: 0,
    weapon: AttackItemType.TwoHandGun,
    bind: Bind.Hands_R,
    assetKey: Char.ItemsGunsScar,
    level: "common",
    name: "SCAR",
    descriptionKr: "강력하고 빠른 대응을 위해 설계된 현대식 고성능 전투 소총입니다. 높은 연사력과 믿을 수 없는 저지력을 자랑하며, 어떤 전장에서도 압도적인 성능을 보여주는 최상급 무기입니다.",
    description: "A modern, high-performance combat rifle. The SCAR is engineered for a powerful and fast response, boasting a high rate of fire and incredible stopping power. It’s a top-tier choice for those who need a weapon that can dominate any battlefield.",
    icon: itemIcons.Bow,
    sound: SoundType.NATO556,
    stackable: false, binding: true, autoAttack: true,
    stats: {
      "attack": 3, "attackSpeed": .1, "speed": 1, "attackRange": 10
    },
    actions: [ActionDefs.MuzzleFlash, ActionDefs.Casing],
  },
  WarterCan: {
    id: "WarterCan",
    name: "Wartering Can",
    descriptionKr: "단순히 식물에 물을 주는 용도가 아닙니다. 모든 농부에게 꼭 필요한 튼튼한 도구입니다. 작물을 건강하게 키울 만큼 충분한 양의 물을 담을 수 있습니다. 평화로운 삶을 위한 필수품입니다.",
    description: "This isn't just for watering plants; it's a trusty tool for any aspiring farmer. It’s durable and holds just enough water to keep your crops happy and healthy. While not a conventional weapon, it’s a staple for a peaceful life.",
    icon: itemIcons.Lantern,
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
    descriptionKr: "파괴와 건설을 위해 만들어진 튼튼한 해머입니다. 단단한 머리와 견고한 손잡이는 벽을 부수거나 새로운 구조물을 만들 때 효과적이며, 필요하다면 강력한 일격을 가하는 데에도 사용됩니다.",
    description: "A heavy-duty hammer built for demolition and construction. Its solid head and sturdy handle make it effective for breaking down walls, crafting new structures, or—if the need arises—delivering a forceful blow in combat.",
    icon: itemIcons.Hammer,
    type: "meleeattack",
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
    descriptionKr: "단순하지만 꼭 필요한 제작 재료입니다. 이 고품질의 가죽은 갑옷, 도구는 물론 장식품까지 다양한 물건을 만드는 데 사용됩니다. 제작 기술이 있는 사람에게는 다재다능한 자원입니다.",
    description: "A simple but essential crafting material. This high-quality leather can be used to craft everything from armor and tools to decorative items. It’s a versatile resource for those with a knack for crafting.",
    icon: itemIcons.Leather,
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
    descriptionKr: "수많은 프로젝트의 기본 건축 자재입니다. 숲에서 바로 가져온 원시적인 자원으로, 판자로 가공하거나 연료로 사용하거나 새로운 물건을 만드는 데 쓰입니다. 생존과 건설에 필수적인 자원입니다.",
    description: "The basic building block of countless projects. This log is a raw resource straight from the forest, ready to be processed into planks, used as fuel, or crafted into something new. A vital resource for survival and construction.",
    icon: itemIcons.Woodlog,
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
    descriptionKr: "건축과 제작을 위한 기초 재료입니다. 이 바위들은 견고하고 내구성이 뛰어나, 기반, 벽, 또는 단단한 도구를 만드는 데 완벽합니다. 오래가는 무언가를 만들고자 하는 사람에게는 시대를 초월한 자원입니다.",
    description: "A foundational material for building and crafting. These rocks are sturdy and durable, perfect for creating foundations, walls, or solid tools. They are a timeless resource for anyone looking to build something that lasts.",
    icon: itemIcons.Silvernugget,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Book,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Apple,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Greenapple,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Wine2,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Greenapple,
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
    descriptionKr: "",
    description: "",
    icon: itemIcons.Greenapple,
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