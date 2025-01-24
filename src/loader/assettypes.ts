export enum Bind {
    Body, // chainmail, platemail, wizard robe
    Hands_L, //Gloves
    Hands_R, //Gloves
    Head,
    Legs,
    Feet,
}

export enum Ani {
    Idle,
    Walk,
    Run,
    Jump,
    Punch,
    FightIdle,
    Dying,
    Shooting,
    Sword,
    MagicH1,
    MagicH2,
    Dance0,

    Wartering,
    Hammering,
    PickFruit,
    PickFruitTree,
    PlantAPlant,

    MonBiting,
    MonScream,
    MonHurt,
}

export enum Char{
    Male,
    Female,
    TwoB,
    Wizard,
    CuteGirl,
    OfficeGirl,
    Hellboy,

    Arrow,

    Tree,
    DeadTree,
    DeadTree2,
    Mushroom1,
    Mushroom2,
    Portal,
    Test,
    Zombie,
    Minataur,
    BatPig,
    BilbyMon,
    BirdMon,
    CrabMon,
    Gorillish,
    PantherBlackWhite,
    PantherBlue,
    PantherRed,
    AnimalPack,
    WereWolf,
    Golem,
    BigGolem,
    Snake,
    Viking,
    Builder,
    ToadMage,
    KittenMonk,
    Skeleton,

    Bilby,
    Dog,
    Cat,
    Bee,
    PetSnake,

    Bat,
    Gun,
    WarteringCan,
    Hammer,
    Grass,
    FluffyTree,
    AppleTree,
    Apple,
    CoconutTree,
    Coconut,
    Tomato0,
    Tomato1,
    Tomato2,
    Potato0,
    Potato1,
    Potato2,
    Carrot0,
    Carrot1,
    Carrot2,

    Bed,
    Bath,
    Bookshelf,
    Closet,
    Desk,
    Kitchen,
    KitTable,
    Oven,
    Refrigerator,
    Sink,
    Table,
    Toilet,
    TV,
    Stone,

    Empty,
    None,
}
export enum ModelType {
    Gltf,
    GltfParser,
    Fbx
}
export type AssetInfo = {
    scale?: number
    calX?: number
    calY?: number
    calZ?: number
}