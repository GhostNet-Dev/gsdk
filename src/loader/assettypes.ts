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
    Spellcasting,
    Dance0,
    Hit,

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
    Foxish,
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

    KayKitSkeletonMage,
    KayKitSkeletonMinion,
    KayKitSkeletonRogue,
    KayKitSkeletonWarrior,
    KayKitSkeletonArrow,
    KayKitSkeletonArrowBroken,
    KayKitSkeletonArrowBrokenHalf,
    KayKitSkeletonArrowHalf,
    KayKitSkeletonAxe,
    KayKitSkeletonBlade,
    KayKitSkeletonCrossbow,
    KayKitSkeletonQuiver,
    KayKitSkeletonShieldLarge_A,
    KayKitSkeletonShieldLarge_B,
    KayKitSkeletonShieldSmall_A,
    KayKitSkeletonShieldSmall_B,
    KayKitSkeletonStaff,

    KayKitAdvBarbarian,
    KayKitAdvKnight,
    KayKitAdvMage,
    KayKitAdvRogue,
    KayKitAdvRogueHooded,

    KayKitAdvArrow,
    KayKitAdvArrowBundle,
    KayKitAdvAxe1Handed,
    KayKitAdvAxe2Handed,
    KayKitAdvCrossbow1Handed,
    KayKitAdvCrossbow2Handed,
    KayKitAdvDagger,
    KayKitAdvMugEmpty,
    KayKitAdvMugFull,
    KayKitAdvQuiver,

    KayKitAdvShieldBadge,
    KayKitAdvShieldBadgeColor,
    KayKitAdvShieldRound,
    KayKitAdvShieldRoundBarbarian,
    KayKitAdvShieldRoundColor,
    KayKitAdvShieldSpikes,
    KayKitAdvShieldSpikesColor,
    KayKitAdvShieldSquare,
    KayKitAdvShieldSquareColor,

    KayKitAdvSmokeBomb,
    KayKitAdvSpellbookClosed,
    KayKitAdvSpellbookOpen,
    KayKitAdvStaff,
    KayKitAdvSword1Handed,
    KayKitAdvSword2Handed,
    KayKitAdvSword2HandedColor,
    KayKitAdvWand,

    OceanStarterSubMarine,
    OceanStarterSmallCoral,
    OceanStarterSmallBoat,
    OceanStarterPirateShip,
    OceanStarterLongPlant,
    OceanStarterCrashedShip,
    OceanStarterChestOld,
    OceanStarterChest,
    OceanStarterAnemonie,

    OceanDolphin,
    OceanFish1,
    OceanFish2,
    OceanFish3,
    OceanMantaRay,
    OceanShark,
    OceanWhale,

    KenneyCriminalMale,
    KenneyCyborgFemale,
    KenneyHumanFemale,
    KenneyHumanMale,
    KenneySkaterFemale,
    KenneySkaterMale,
    KenneySurvivorFemale,
    KenneySurvivorMale,
    KenneyZombieA,
    KenneyZombieB,
    KenneyZombieFemaleA,
    KenneyZombieFemaleB,

    FarmPetCow,
    FarmPetHorse,
    FarmPetLlama,
    FarmPetPig,
    FarmPetPug,
    FarmPetSheep,
    FarmPetZebra,

    EasypackFrog,
    EasypackRat,
    EasypackSnake,
    EasypackSnakeAngry,
    EasypackSpider,
    EasypackWasp,
    EasypackSlime,

    UltimateChar,
    UltimateCharGun,

    UltimateCubeBricks,
    UltimateCubeCrate,
    UltimateCubeDefault,
    UltimateCubeDirtSingle,
    UltimateCubeExclamation,
    UltimateCubeGrassSingle,
    UltimateCubeQuestion,
    UltimateCubeSpike,

    UltimateEnermyBee,
    UltimateEnermyCrab,
    UltimateEnermy,
    UltimateEnermySkull,

    UltimateLvAndMaArrow,
    UltimateLvAndMaArrowSide,
    UltimateLvAndMaArrowUp,
    UltimateLvAndMaBomb,
    UltimateLvAndMaBouncer,
    UltimateLvAndMaBridgeModular,
    UltimateLvAndMaBridgeModularCenter,
    UltimateLvAndMaBridgeSmall,
    UltimateLvAndMaCannon,
    UltimateLvAndMaCannonBall,
    UltimateLvAndMaChest,
    UltimateLvAndMaDoor,
    UltimateLvAndMaFence1,
    UltimateLvAndMaFenceCorner,
    UltimateLvAndMaFenceMiddle,
    UltimateLvAndMaGoalFlag,
    UltimateLvAndMaHazardCylinder,
    UltimateLvAndMaHazardSaw,
    UltimateLvAndMaHazardSpikeTrap,
    UltimateLvAndMaLever,
    UltimateLvAndMaNumbers0,
    UltimateLvAndMaNumbers1,
    UltimateLvAndMaNumbers2,
    UltimateLvAndMaNumbers3,
    UltimateLvAndMaNumbers4,
    UltimateLvAndMaNumbers5,
    UltimateLvAndMaNumbers6,
    UltimateLvAndMaNumbers7,
    UltimateLvAndMaNumbers8,
    UltimateLvAndMaNumbers9,
    UltimateLvAndMaPipe90,
    UltimateLvAndMaPipeEnd,
    UltimateLvAndMaPipeStraight,
    UltimateLvAndMaPipeT,
    UltimateLvAndMaPlantLarge,
    UltimateLvAndMaPlantSmall,
    UltimateLvAndMaSpikes,
    UltimateLvAndMaSpikyBall,
    UltimateLvAndMaStairs,
    UltimateLvAndMaStairsModularEnd,
    UltimateLvAndMaStairsModularMiddle,
    UltimateLvAndMaStairsModularStart,
    UltimateLvAndMaStairsSmall,
    UltimateLvAndMaTower,

    UltimateModPlatform2DCubeDirt1x1Center,
    UltimateModPlatform2DCubeDirt1x1End,
    UltimateModPlatform2DCubeGrass1x1Center,
    UltimateModPlatform2DCubeGrass1x1End,
    UltimateModPlatform3DCubeDirtCenterTall,
    UltimateModPlatform3DCubeDirtCornerTall,
    UltimateModPlatform3DCubeDirtSideTall,
    UltimateModPlatform3DCubeGrassBottomTall,
    UltimateModPlatform3DCubeGrassCornerTall,
    UltimateModPlatform3DCubeGrassCornerBottomTall,
    UltimateModPlatform3DCubeGrassCornerCenterTall,
    UltimateModPlatform3DCubeGrassSideBottomTall,
    UltimateModPlatform3DCubeGrassSideCenterTall,
    UltimateModPlatform3DCubeGrassSideTall,
    UltimateModPlatformSingleCubeDirt,
    UltimateModPlatformSingleCubeGrass,
    UltimateModPlatformSingleHeightDirtCenter,
    UltimateModPlatformSingleHeightDirtCorner,
    UltimateModPlatformSingleHeightDirtSide,
    UltimateModPlatformSingleHeightGrassCenter,
    UltimateModPlatformSingleHeightGrassCorner,
    UltimateModPlatformSingleHeightGrassSide,

    UltimateNatureBush,
    UltimateNatureBushFruit,
    UltimateNatureCloud1,
    UltimateNatureCloud2,
    UltimateNatureCloud3,
    UltimateNatureFruit,
    UltimateNatureGrass1,
    UltimateNatureGrass2,
    UltimateNatureGrass3,
    UltimateNatureRock1,
    UltimateNatureRock2,
    UltimateNatureRockPlatforms1,
    UltimateNatureRockPlatforms2,
    UltimateNatureRockPlatforms3,
    UltimateNatureRockPlatformsLarge,
    UltimateNatureRockPlatformsMedium,
    UltimateNatureRockPlatformTall,
    UltimateNatureTree,
    UltimateNatureTreeFruit,

    UltimatePAPCoin,
    UltimatePAPGemBlue,
    UltimatePAPGemGreen,
    UltimatePAPGemPink,
    UltimatePAPHeart,
    UltimatePAPHeartHalf,
    UltimatePAPHeartOutline,
    UltimatePAPKey,
    UltimatePAPStar,
    UltimatePAPStarOutline,
    UltimatePAPThunder,

    Bilby,
    Dog,
    Cat,
    Bee,
    PetSnake,

    Bat,
    Gun,
    WateringCan,
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