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
    CharHumanMale,
    CharHumanFemale,
    CharHumanTwoB,
    CharHumanWizard,
    CharHumanCuteGirl,
    CharHumanOfficeGirl,
    CharMonHellboy,

    Arrow,

    Tree,
    DeadTree,
    DeadTree2,
    Mushroom1,
    Mushroom2,
    Portal,
    Test,
    CharMonZombie,
    CharMonMinataur,
    CharMonBatPig,
    CharMonBilbyMon,
    CharMonBird,
    CharMonCrab,
    CharMonGorillish,
    CharMonPantherBlackWhite,
    CharAniFoxish,
    CharMonPantherBlue,
    CharAniPantherRed,
    CharAnimalPack,
    CharMonWereWolf,
    CharMonGolem,
    CharMonBigGolem,
    CharMonSnake,
    CharHumanViking,
    CharHumanBuilder,
    CharMonToadMage,
    CharMonKittenMonk,
    CharMonSkeleton,

    CharMonKayKitSkeletonMage,
    CharMonKayKitSkeletonMinion,
    CharMonKayKitSkeletonRogue,
    CharMonKayKitSkeletonWarrior,
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

    CharHumanKayKitAdvBarbarian,
    CharHumanKayKitAdvKnight,
    CharHumanKayKitAdvMage,
    CharHumanKayKitAdvRogue,
    CharHumanKayKitAdvRogueHooded,

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

    /* Dungeon Kit */
    KayKitDungeonArrow,
    KayKitDungeonArtifact,
    KayKitDungeonAxedoubleCommon,
    KayKitDungeonAxedoubleRare,
    KayKitDungeonAxedoubleUncommon,
    KayKitDungeonAxeCommon,
    KayKitDungeonAxeRare,
    KayKitDungeonAxeUncommon,
    KayKitDungeonBanner,
    KayKitDungeonBarrel,
    KayKitDungeonBarreldark,
    KayKitDungeonBench,
    KayKitDungeonBooka,
    KayKitDungeonBookb,
    KayKitDungeonBookc,
    KayKitDungeonBookd,
    KayKitDungeonBooke,
    KayKitDungeonBookf,
    KayKitDungeonBookopena,
    KayKitDungeonBookopenb,
    KayKitDungeonBookcase,
    KayKitDungeonBookcasefilled,
    KayKitDungeonBookcasefilledBroken,
    KayKitDungeonBookcasewide,
    KayKitDungeonBookcasewidefilled,
    KayKitDungeonBookcasewidefilledBroken,
    KayKitDungeonBookcasewideBroken,
    KayKitDungeonBookcaseBroken,
    KayKitDungeonBricks,
    KayKitDungeonBucket,
    KayKitDungeonChair,
    KayKitDungeonChesttopCommon,
    KayKitDungeonChesttopCommonEmpty,
    KayKitDungeonChesttopRare,
    KayKitDungeonChesttopRareMimic,
    KayKitDungeonChesttopUncommon,
    KayKitDungeonChesttopUncommonMimic,
    KayKitDungeonChestCommon,
    KayKitDungeonChestCommonEmpty,
    KayKitDungeonChestRare,
    KayKitDungeonChestRareMimic,
    KayKitDungeonChestUncommon,
    KayKitDungeonChestUncommonMimic,
    KayKitDungeonCoin,
    KayKitDungeonCoinslarge,
    KayKitDungeonCoinsmedium,
    KayKitDungeonCoinssmall,
    KayKitDungeonCrate,
    KayKitDungeonCratedark,
    KayKitDungeonCrateplatformLarge,
    KayKitDungeonCrateplatformMedium,
    KayKitDungeonCrateplatformSmall,
    KayKitDungeonCrossbowCommon,
    KayKitDungeonCrossbowRare,
    KayKitDungeonCrossbowUncommon,
    KayKitDungeonDaggerCommon,
    KayKitDungeonDaggerRare,
    KayKitDungeonDaggerUncommon,
    KayKitDungeonDoor,
    KayKitDungeonDoorGate,
    KayKitDungeonFloordecorationShatteredbricks,
    KayKitDungeonFloordecorationTileslarge,
    KayKitDungeonFloordecorationTilessmall,
    KayKitDungeonFloordecorationWood,
    KayKitDungeonFloordecorationWoodleft,
    KayKitDungeonFloordecorationWoodright,
    KayKitDungeonHammerCommon,
    KayKitDungeonHammerRare,
    KayKitDungeonHammerUncommon,
    KayKitDungeonLootsacka,
    KayKitDungeonLootsackb,
    KayKitDungeonMug,
    KayKitDungeonPillar,
    KayKitDungeonPillarBroken,
    KayKitDungeonPlate,
    KayKitDungeonPlatefull,
    KayKitDungeonPlatehalf,
    KayKitDungeonPota,
    KayKitDungeonPotaDecorated,
    KayKitDungeonPotb,
    KayKitDungeonPotbDecorated,
    KayKitDungeonPotc,
    KayKitDungeonPotcDecorated,
    KayKitDungeonPotionlargeBlue,
    KayKitDungeonPotionlargeGreen,
    KayKitDungeonPotionlargeRed,
    KayKitDungeonPotionmediumBlue,
    KayKitDungeonPotionmediumGreen,
    KayKitDungeonPotionmediumRed,
    KayKitDungeonPotionsmallBlue,
    KayKitDungeonPotionsmallGreen,
    KayKitDungeonPotionsmallRed,
    KayKitDungeonPots,
    KayKitDungeonQuiverEmpty,
    KayKitDungeonQuiverFull,
    KayKitDungeonQuiverHalfFull,
    KayKitDungeonScaffoldHigh,
    KayKitDungeonScaffoldHighCornerboth,
    KayKitDungeonScaffoldHighCornerleft,
    KayKitDungeonScaffoldHighCornerright,
    KayKitDungeonScaffoldHighRailing,
    KayKitDungeonScaffoldLow,
    KayKitDungeonScaffoldLowCornerboth,
    KayKitDungeonScaffoldLowCornerleft,
    KayKitDungeonScaffoldLowCornerright,
    KayKitDungeonScaffoldLowRailing,
    KayKitDungeonScaffoldMedium,
    KayKitDungeonScaffoldMediumCornerboth,
    KayKitDungeonScaffoldMediumCornerleft,
    KayKitDungeonScaffoldMediumCornerright,
    KayKitDungeonScaffoldMediumRailing,
    KayKitDungeonScaffoldSmallHigh,
    KayKitDungeonScaffoldSmallHighCornerleft,
    KayKitDungeonScaffoldSmallHighCornerright,
    KayKitDungeonScaffoldSmallHighLong,
    KayKitDungeonScaffoldSmallHighRailing,
    KayKitDungeonScaffoldSmallHighRailingLong,
    KayKitDungeonScaffoldSmallLow,
    KayKitDungeonScaffoldSmallLowCornerleft,
    KayKitDungeonScaffoldSmallLowCornerright,
    KayKitDungeonScaffoldSmallLowLong,
    KayKitDungeonScaffoldSmallLowRailing,
    KayKitDungeonScaffoldSmallLowRailingLong,
    KayKitDungeonScaffoldSmallMedium,
    KayKitDungeonScaffoldSmallMediumCornerleft,
    KayKitDungeonScaffoldSmallMediumCornerright,
    KayKitDungeonScaffoldSmallMediumLong,
    KayKitDungeonScaffoldSmallMediumRailing,
    KayKitDungeonScaffoldSmallMediumRailingLong,
    KayKitDungeonScaffoldStairs,
    KayKitDungeonShieldCommon,
    KayKitDungeonShieldRare,
    KayKitDungeonShieldUncommon,
    KayKitDungeonSpellbook,
    KayKitDungeonStaffCommon,
    KayKitDungeonStaffRare,
    KayKitDungeonStaffUncommon,
    KayKitDungeonStairs,
    KayKitDungeonStairsWide,
    KayKitDungeonStool,
    KayKitDungeonSwordCommon,
    KayKitDungeonSwordRare,
    KayKitDungeonSwordUncommon,
    KayKitDungeonTablelarge,
    KayKitDungeonTablemedium,
    KayKitDungeonTablesmall,
    KayKitDungeonTilebrickaLarge,
    KayKitDungeonTilebrickaMedium,
    KayKitDungeonTilebrickaSmall,
    KayKitDungeonTilebrickbLarge,
    KayKitDungeonTilebrickbLargecrackeda,
    KayKitDungeonTilebrickbLargecrackedb,
    KayKitDungeonTilebrickbMedium,
    KayKitDungeonTilebrickbSmall,
    KayKitDungeonTilespikes,
    KayKitDungeonTilespikesLarge,
    KayKitDungeonTilespikesShallow,
    KayKitDungeonTorch,
    KayKitDungeonTorchwall,
    KayKitDungeonTrapdoor,
    KayKitDungeonWall,
    KayKitDungeonWallcorner,
    KayKitDungeonWalldecorationa,
    KayKitDungeonWalldecorationb,
    KayKitDungeonWallintersection,
    KayKitDungeonWallsingle,
    KayKitDungeonWallsingleBroken,
    KayKitDungeonWallsingleCorner,
    KayKitDungeonWallsingleDecorationa,
    KayKitDungeonWallsingleDecorationb,
    KayKitDungeonWallsingleDoor,
    KayKitDungeonWallsingleSplit,
    KayKitDungeonWallsingleWindow,
    KayKitDungeonWallsingleWindowgate,
    KayKitDungeonWallsplit,
    KayKitDungeonWallBroken,
    KayKitDungeonWallDoor,
    KayKitDungeonWallEnd,
    KayKitDungeonWallEndBroken,
    KayKitDungeonWallGate,
    KayKitDungeonWallGatecorner,
    KayKitDungeonWallGatedoor,
    KayKitDungeonWallWindow,
    KayKitDungeonWallWindowgate,
    KayKitDungeonWeaponrack,


    OceanStarterSubMarine,
    OceanStarterSmallCoral,
    OceanStarterSmallBoat,
    OceanStarterPirateShip,
    OceanStarterLongPlant,
    OceanStarterCrashedShip,
    OceanStarterChestOld,
    OceanStarterChest,
    OceanStarterAnemonie,

    CharAniOceanDolphin,
    CharAniOceanFish1,
    CharAniOceanFish2,
    CharAniOceanFish3,
    CharAniOceanMantaRay,
    CharAniOceanShark,
    CharAniOceanWhale,

    CharHumanKenneyCriminalMale,
    CharHumanKenneyCyborgFemale,
    CharHumanKenneyHumanFemale,
    CharHumanKenneyHumanMale,
    CharHumanKenneySkaterFemale,
    CharHumanKenneySkaterMale,
    CharHumanKenneySurvivorFemale,
    CharHumanKenneySurvivorMale,
    CharMonKenneyZombieA,
    CharMonKenneyZombieB,
    CharMonKenneyZombieFemaleA,
    CharMonKenneyZombieFemaleB,

    CharAniFarmPetCow,
    CharAniFarmPetHorse,
    CharAniFarmPetLlama,
    CharAniFarmPetPig,
    CharAniFarmPetPug,
    CharAniFarmPetSheep,
    CharAniFarmPetZebra,

    CharAniEasypackFrog,
    CharAniEasypackRat,
    CharAniEasypackSnake,
    CharAniEasypackSnakeAngry,
    CharAniEasypackSpider,
    CharAniEasypackWasp,
    CharMonEasypackSlime,

    CharHumanUltimate,
    CharHumanUltimateGun,

    UltimateCubeBricks,
    UltimateCubeCrate,
    UltimateCubeDefault,
    UltimateCubeDirtSingle,
    UltimateCubeExclamation,
    UltimateCubeGrassSingle,
    UltimateCubeQuestion,
    UltimateCubeSpike,

    CharMonUltimateEnermyBee,
    CharMonUltimateEnermyCrab,
    CharMonUltimateEnermy,
    CharMonUltimateEnermySkull,

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

    CharAniBilby,
    CharAniDog,
    CharAniCat,
    CharAniBee,
    CharAniPetSnake,

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