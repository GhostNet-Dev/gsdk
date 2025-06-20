import { IAsset } from "@Glibs/interface/iasset"
import { IItem } from "@Glibs/interface/iinven"
import { StatKey } from "@Glibs/inventory/stat/stattypes"
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
    // 기본 정보
    id: string;                        // 고유 ID
    name: string;                     // 이름
    namekr?: string;                  // 한국어 이름
    icon: string;                     // UI 아이콘 경로
    type: ItemType;                   // weapon, armor 등
    slot?: string;                    // 장착 부위
    weapon?: AttackItemType;          // 귀속 타입
    autoAttack?: boolean;
    level?: Level;
    levelRequirement: number;
    durability?: number;
    weight?: number;
    price?: number;
    tradable?: boolean;
    stackable: boolean;
    binding: boolean;
    bind?: Bind;                      // 귀속 타입
    deck?: DeckType;                  // 세트, 강화 슬롯 등

    asset?: IAsset;                   // 시각 자산
    meshs?: THREE.Group;             // 3D 메쉬
    sound?: string;

    // 전투용 또는 능력치용 스탯
    stats?: Partial<Record<StatKey, number>>;

    // 확장 효과
    enchantments?: Partial<Record<StatKey, number>>;
    sockets?: number;
    setBonus?: number;

    // 접두사/접미사 이름
    prefix?: string;
    suffix?: string;
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

