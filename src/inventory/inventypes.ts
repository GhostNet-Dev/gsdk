import { IAsset } from "@Glibs/interface/iasset"
import { IItem } from "@Glibs/interface/iinven"
import { Bind } from "@Glibs/types/assettypes"
import { MonsterId } from "@Glibs/types/monstertypes"

export enum ItemType {
    Attack,
    Shield,
    Armor,
    Potion,
    Material,
    Farm,
    Deck,
}

export enum AttackItemType {
    Blunt, //둔기 
    Axe,
    Knife,
    Sword,
    Bow,
    Gun,
    Wand,
}

export enum Level {
    Common,
    Uncommon,
    Rare,
    Unique,
    Legendary,
    Mythic,
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
    attackRange?: number
    autoAttack?: boolean

    sound?: string

    speed?: number

    agility?: number
    stamina?: number
    fireResistance?: number
    natureResistance?: number

    deck?: DeckType
}

export class ItemId {
    public static Hanhwasbat = "Hanhwasbat"//Symbol("Hanhwa's Bat")
    public static WarterCan = "WarterCan"//Symbol("Warter Can")
    public static Hammer = "Hammer"//Symbol("Hammer H3")
    public static DefaultGun = "DefaultGun"//Symbol("DefaultGun")
    public static Pistol = "Pistol"//Symbol("DefaultGun")
    public static M4A1 = "M4A1"//Symbol("DefaultGun")
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

export class DeckId {
    public static Zombie ="ZombieDeck"
    public static Minotaur = "MinataurDeck"
    public static Batpig = "BatpigDeck"
    public static Bilby = "BilbyDeck"
    public static Birdmon = "BirdmonDeck"
    public static Crab = "CrabDeck"
    public static Builder = "BuilderDeck"
    public static Golem = "GolemDeck"
    public static BigGolem = "BiggolemDeck"
    public static KittenMonk = "KittenmonkDeck"
    public static Skeleton = "SkeletonDeck"
    public static Snake = "SnakeDeck"
    public static ToadMage = "ToadmageDeck"
    public static Viking = "VikingDeck"
    public static WereWolf = "WerewolfDeck"

    public static List = [
        this.Zombie, this.Minotaur, this.Batpig, this.Bilby, this.Birdmon,
        this.Crab, this.Builder, this.Golem, this.BigGolem, this.KittenMonk,
        this.Skeleton, this.Snake, this.ToadMage, this.Viking, this.WereWolf
    ]
}

export type DeckType = {
    id: DeckId
    title: string
    contents: string
    maxLv: number// 레벨업 한계
    minTime: number // 소환 가능한 최소 시간
    maxTime: number // 소환 가능한 최대 시간
    maxSpawn: number // 소환 가능한 몬스터 수
    uniq: boolean
    monId: MonsterId
}

export type InventorySlot = {
    item: IItem,
    count: number,
}

export type InvenData = {
    bodySlot: IItem []
    inventroySlot: InventorySlot []
}

