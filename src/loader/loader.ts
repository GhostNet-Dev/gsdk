import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { IAsset } from "./iasset";
import { Char } from "./assettypes";
import { DeadtreeFab } from "./plant/deadtreefab";
import { MaleFab } from "./malefab";
import { FemaleFab } from "./femalefab";
import { MushroomFab } from "./plant/mushroomfab";
import { DeadTree2Fab, TreeFab } from "./plant/treefab";
import { PortalFab } from "./portalfab";
import { TestFab } from "./testfab";
import { ZombieFab } from "./monster/zombiefab";
import { BatFab } from "./item/batfab";
import { GunFab } from "./item/gunfab";
import { MinataurFab } from "./monster/minataurfab";
import { CrabFab } from "./monster/crabfab";
import { StoneFab } from "./stonefab";
import { HammerFab, WarteringCanFab } from "./plant/farmtoolsfab";
import { BedFab, ClosetFab, DeskFab } from "./furniture/funiturefab";
import { AppleTreeFab, CoconutTreeFab } from "./plant/plantfab";
import { BatPigFab } from "./monster/batpigfab";
import { BirdMonFab } from "./monster/birdmonfab";
import { BilbyFab } from "./pet/bilbyfab";
import { WereWolfFab } from "./monster/werewolffab";
import { BigGolemFab, GolemFab } from "./monster/golemfab";
import { SnakeFab } from "./monster/snakefab";
import { VikingFab } from "./monster/vikingfab";
import { BuilderFab } from "./monster/builderfab";
import { ToadMageFab } from "./monster/toadmagefab";
import { KittenMonkFab } from "./monster/kittenmonk";
import { SkeletonFab } from "./monster/skeleton";
import { Tomato0Fab, Tomato1Fab, Tomato2Fab } from "./plant/tomatofab";
import { Carrot0Fab, Carrot1Fab, Carrot2Fab } from "./plant/carrotfab";
import { Potato0Fab, Potato1Fab, Potato2Fab } from "./plant/potatofab";
import { BathFab, SinkFab, ToiletFab } from "./furniture/bathfab";
import { BookShelfFab, TableFab, TvFab } from "./furniture/livingfab";
import { KitTableFab, KitchenFab, OvenFab, RefrigeratorFab } from "./furniture/kitchenfab";
import { AppleFab, CoconutFab } from "./plant/fruitfab";
import { DogFab } from "./pet/dogfab";
import { PetSnakeFab } from "./pet/animalpackfab";
import { BeeFab } from "./pet/bee";
import { EmptyFab } from "./emptyfab";
import { HellBoyFab } from "./hellboy";
import { CuteGirlFab } from "./cutegirl";
import { OfficeGirlFab } from "./officegirl";
import { WizardFab } from "./wizardfab";
import { TwoBFab } from "./twobfab";
import { ArrowFab } from "./arrowfab";
import { GrassFab } from "./plant/grassfab";
import { FluffyTreeFab } from "./plant/fluffytree";
import { CatFab } from "./pet/catfab";
import { KayKitSkeletonAXeFab, KayKitSkeletonArrowBrokenFab, KayKitSkeletonArrowBrokenHalfFab, KayKitSkeletonArrowFab, KayKitSkeletonArrowHalfFab, KayKitSkeletonBladeFab, KayKitSkeletonCrossbowFab, KayKitSkeletonQuiverFab, KayKitSkeletonShieldLargeAFab, KayKitSkeletonShieldLargeBFab, KayKitSkeletonShieldSmallAFab, KayKitSkeletonShieldSmallBFab, KayKitSkeletonStaffFab } from "./kaykit/items/skeletonsitems";
import { KayKitSkeletonMageFab, KayKitSkeletonMinionFab, KayKitSkeletonRogueFab, KayKitSkeletonWarriorFab } from "./kaykit/skeletons/skeletons";
import { KayKitAdvBarbarianFab, KayKitAdvKnightFab, KayKitAdvMageFab, KayKitAdvRogueFab, KayKitAdvRogueHoodedFab } from "./kaykit/adventuerers/adventurers";
import { KayKitArrowBundleFab, KayKitArrowFab, KayKitAxe1HandedFab, KayKitAxe2HandedFab, KayKitCrossbow1HandedFab, KayKitCrossbow2HandedFab, KayKitDaggerFab, KayKitMugEmptyFab, KayKitMugFullFab, KayKitQuiverFab, KayKitShieldBadgeColorFab, KayKitShieldBadgeFab, KayKitShieldRoundBarbarianFab, KayKitShieldRoundColorFab, KayKitShieldRoundFab, KayKitShieldSpikesColorFab, KayKitShieldSpikesFab, KayKitShieldSquareColorFab, KayKitShieldSquareFab, KayKitSmokeBombFab, KayKitSpellbookClosedFab, KayKitSpellbookOpenFab, KayKitStaffFab, KayKitSword1HandedFab, KayKitSword2HandedColorFab, KayKitSword2HandedFab, KayKitWandFab } from "./kaykit/items/advitems";
import { OceanStarterAnemonieFab, OceanStarterChestFab, OceanStarterChestOldFab, OceanStarterCrashedShipFab, OceanStarterLongPlantFab, OceanStarterPirateShipFab, OceanStarterSmallBoatFab, OceanStarterSmallCoralFab, OceanStarterSubmarineFab } from "./oceanpack/oceanpack";
import { EasypackFrogFab, EasypackRatFab, EasypackSlimeFab, EasypackSnakeAngryFab, EasypackSnakeFab, EasypackSpiderFab, EasypackWaspFab } from "./monster/easypack";
import { OceanDolphinFab, OceanFish1Fab, OceanFish2Fab, OceanFish3Fab, OceanMantaRayFab, OceanSharkFab, OceanWhaleFab } from "./oceanpack/oceananimalfab";
import { UltimateCharFab, UltimateCharGunFab } from "./ultimatepack/charactersfab";
import { UltimateCubeBricksFab, UltimateCubeCrateFab, UltimateCubeDefaultFab, UltimateCubeDirtSingleFab, UltimateCubeExclamationFab, UltimateCubeGrassSingleFab, UltimateCubeQuestionFab } from "./ultimatepack/cubefab";
import { UltimateEnermyBeeFab, UltimateEnermyCrabFab, UltimateEnermyFab, UltimateEnermySkullFab } from "./ultimatepack/enermyfab";
import { UltimateLvAndMaArrowFab, UltimateLvAndMaArrowSideFab, UltimateLvAndMaArrowUpFab, UltimateLvAndMaBombFab, UltimateLvAndMaBouncerFab, UltimateLvAndMaBridgeModularCenterFab, UltimateLvAndMaBridgeModularFab, UltimateLvAndMaBridgeSmallFab, UltimateLvAndMaCannonBallFab, UltimateLvAndMaCannonFab, UltimateLvAndMaChestFab, UltimateLvAndMaDoorFab, UltimateLvAndMaFence1Fab, UltimateLvAndMaFenceCornerFab, UltimateLvAndMaFenceMiddleFab, UltimateLvAndMaGoalFlagFab, UltimateLvAndMaHazardCylinderFab, UltimateLvAndMaHazardSawFab, UltimateLvAndMaHazardSpikeTrapFab, UltimateLvAndMaLeverFab, UltimateLvAndMaNumber0Fab, UltimateLvAndMaNumber1Fab, UltimateLvAndMaNumber2Fab, UltimateLvAndMaNumber3Fab, UltimateLvAndMaNumber4Fab, UltimateLvAndMaNumber5Fab, UltimateLvAndMaNumber6Fab, UltimateLvAndMaNumber7Fab, UltimateLvAndMaNumber8Fab, UltimateLvAndMaNumber9Fab, UltimateLvAndMaPipe90Fab, UltimateLvAndMaPipeEndFab, UltimateLvAndMaPipeStraightFab, UltimateLvAndMaPipeTFab, UltimateLvAndMaPlantLargeFab, UltimateLvAndMaPlantSmallFab, UltimateLvAndMaSpikesFab, UltimateLvAndMaSpikyBallFab, UltimateLvAndMaStairsFab, UltimateLvAndMaStairsModularEndFab, UltimateLvAndMaStairsModularMiddleFab, UltimateLvAndMaStairsModularStartFab, UltimateLvAndMaStairsSmallFab, UltimateLvAndMaTowerFab } from "./ultimatepack/lvandmachinefab";
import { UltimateModPlatform2DCubeDirt1x1CenterFab, UltimateModPlatform2DCubeDirt1x1EndFab, UltimateModPlatform2DCubeGrass1x1CenterFab, UltimateModPlatform2DCubeGrass1x1EndFab, UltimateModPlatform3DCubeDirtCenterTallFab, UltimateModPlatform3DCubeDirtCornerTallFab, UltimateModPlatform3DCubeDirtSideTallFab, UltimateModPlatform3DCubeGrassBottomTallFab, UltimateModPlatform3DCubeGrassCornerBottomTallFab, UltimateModPlatform3DCubeGrassCornerCenterTallFab, UltimateModPlatform3DCubeGrassCornerTallFab, UltimateModPlatform3DCubeGrassSideBottomTallFab, UltimateModPlatform3DCubeGrassSideCenterTallFab, UltimateModPlatform3DCubeGrassSideTallFab, UltimateModPlatformSingleCubeDirtFab, UltimateModPlatformSingleCubeGrassFab, UltimateModPlatformSingleHeightDirtCenterFab, UltimateModPlatformSingleHeightDirtCornerFab, UltimateModPlatformSingleHeightDirtSideFab, UltimateModPlatformSingleHeightGrassCenterFab, UltimateModPlatformSingleHeightGrassCornerFab, UltimateModPlatformSingleHeightGrassSideFab } from "./ultimatepack/modplatformfab";
import { UltimateNatureBushFab, UltimateNatureBushFruitFab, UltimateNatureCloud1Fab, UltimateNatureCloud2Fab, UltimateNatureCloud3Fab, UltimateNatureFruitFab, UltimateNatureGrass1Fab, UltimateNatureGrass2Fab, UltimateNatureGrass3Fab, UltimateNatureRock1Fab, UltimateNatureRock2Fab, UltimateNatureRockPlatformTallFab, UltimateNatureRockPlatforms1Fab, UltimateNatureRockPlatforms2Fab, UltimateNatureRockPlatforms3Fab, UltimateNatureRockPlatformsLargeFab, UltimateNatureRockPlatformsMediumFab, UltimateNatureTreeFab, UltimateNatureTreeFruitFab } from "./ultimatepack/naturefab";
import { UltimatePAPCoinFab, UltimatePAPGemBlueFab, UltimatePAPGemGreenFab, UltimatePAPGemPinkFab, UltimatePAPHeartFab, UltimatePAPHeartHalfFab, UltimatePAPHeartOutlineFab, UltimatePAPKeyFab, UltimatePAPStarFab, UltimatePAPStarOutlineFab, UltimatePAPThunderFab } from "./ultimatepack/powerpickupfab";
import { FarmPetCowFab, FarmPetHorseFab, FarmPetLlamaFab, FarmPetPigFab, FarmPetPugFab, FarmPetSheepFab, FarmPetZebraFab } from "./pet/farmanimalfab";
import { FoxishFab } from "./monster/foxishfab";
import { PantherBlackWhiteFab, PantherBlueFab, PantherRedFab } from "./monster/pantherfab";
import { KenneyCriminalMaleFab, KenneyCyborgFemaleFab, KenneyHumanFemaleFab, KenneyHumanMaleFab, KenneySkaterFemaleFab, KenneySkaterMaleFab, KenneySurvivorFemaleFab, KenneySurvivorMaleFab, KenneyZombieAFab, KenneyZombieBFab, KenneyZombieFemaleAFab, KenneyZombieFemaleBFab } from "./kenney/charactersfab";


// Fab 클래스 타입
type FabConstructor = new (loader: Loader, ...args: any[]) => IAsset;

export class Loader {
    private fbxLoader = new FBXLoader();
    private loadingManager = new THREE.LoadingManager();
    private loader = new GLTFLoader(this.loadingManager);

    fabClasses = new Map<Char, FabConstructor>();
    private fabInstances = new Map<Char, IAsset>();

    constructor(public rootPath: string = "https://hons.ghostwebservice.com/") {
        THREE.Cache.enabled = true;

        this.registerFabs();
    }

    private registerFabs() {
        // 모든 Fab 클래스 등록 (생략 없이)
        this.fabClasses.set(Char.CharHumanMale, MaleFab);
        this.fabClasses.set(Char.CharHumanFemale, FemaleFab);
        this.fabClasses.set(Char.CharMonHellboy, HellBoyFab);
        this.fabClasses.set(Char.CharHumanCuteGirl, CuteGirlFab);
        this.fabClasses.set(Char.CharHumanOfficeGirl, OfficeGirlFab);
        this.fabClasses.set(Char.CharHumanWizard, WizardFab);
        this.fabClasses.set(Char.CharHumanTwoB, TwoBFab);
        this.fabClasses.set(Char.Arrow, ArrowFab);

        this.fabClasses.set(Char.Mushroom1, MushroomFab);
        this.fabClasses.set(Char.Mushroom2, MushroomFab);
        this.fabClasses.set(Char.Tree, TreeFab);
        this.fabClasses.set(Char.DeadTree, DeadtreeFab);
        this.fabClasses.set(Char.Portal, PortalFab);
        this.fabClasses.set(Char.Test, TestFab);

        // Kenney
        this.fabClasses.set(Char.CharHumanKenneyCriminalMale, KenneyCriminalMaleFab);
        this.fabClasses.set(Char.CharHumanKenneyCyborgFemale, KenneyCyborgFemaleFab);
        this.fabClasses.set(Char.CharHumanKenneyHumanFemale, KenneyHumanFemaleFab);
        this.fabClasses.set(Char.CharHumanKenneyHumanMale, KenneyHumanMaleFab);
        this.fabClasses.set(Char.CharHumanKenneySkaterFemale, KenneySkaterFemaleFab);
        this.fabClasses.set(Char.CharHumanKenneySkaterMale, KenneySkaterMaleFab);
        this.fabClasses.set(Char.CharHumanKenneySurvivorFemale, KenneySurvivorFemaleFab);
        this.fabClasses.set(Char.CharHumanKenneySurvivorMale, KenneySurvivorMaleFab);
        this.fabClasses.set(Char.CharMonKenneyZombieA, KenneyZombieAFab);
        this.fabClasses.set(Char.CharMonKenneyZombieB, KenneyZombieBFab);
        this.fabClasses.set(Char.CharMonKenneyZombieFemaleA, KenneyZombieFemaleAFab);
        this.fabClasses.set(Char.CharMonKenneyZombieFemaleB, KenneyZombieFemaleBFab);

        // Monster
        this.fabClasses.set(Char.CharMonZombie, ZombieFab);
        this.fabClasses.set(Char.CharMonMinataur, MinataurFab);
        this.fabClasses.set(Char.CharMonCrab, CrabFab);
        this.fabClasses.set(Char.CharMonBatPig, BatPigFab);
        this.fabClasses.set(Char.CharMonBird, BirdMonFab);
        this.fabClasses.set(Char.CharMonWereWolf, WereWolfFab);
        this.fabClasses.set(Char.CharMonGolem, GolemFab);
        this.fabClasses.set(Char.CharMonBigGolem, BigGolemFab);
        this.fabClasses.set(Char.CharMonSnake, SnakeFab);
        this.fabClasses.set(Char.CharHumanViking, VikingFab);
        this.fabClasses.set(Char.CharHumanBuilder, BuilderFab);
        this.fabClasses.set(Char.CharMonToadMage, ToadMageFab);
        this.fabClasses.set(Char.CharMonKittenMonk, KittenMonkFab);
        this.fabClasses.set(Char.CharMonSkeleton, SkeletonFab);
        this.fabClasses.set(Char.CharAniFoxish, FoxishFab);
        this.fabClasses.set(Char.CharMonPantherBlackWhite, PantherBlackWhiteFab);
        this.fabClasses.set(Char.CharMonPantherBlue, PantherBlueFab);
        this.fabClasses.set(Char.CharAniPantherRed, PantherRedFab);

        // KayKit
        this.fabClasses.set(Char.CharMonKayKitSkeletonMage, KayKitSkeletonMageFab);
        this.fabClasses.set(Char.CharMonKayKitSkeletonWarrior, KayKitSkeletonWarriorFab);
        this.fabClasses.set(Char.CharMonKayKitSkeletonRogue, KayKitSkeletonRogueFab);
        this.fabClasses.set(Char.CharMonKayKitSkeletonMinion, KayKitSkeletonMinionFab);

        this.fabClasses.set(Char.KayKitSkeletonArrow, KayKitSkeletonArrowFab);
        this.fabClasses.set(Char.KayKitSkeletonArrowBroken, KayKitSkeletonArrowBrokenFab);
        this.fabClasses.set(Char.KayKitSkeletonArrowBrokenHalf, KayKitSkeletonArrowBrokenHalfFab);
        this.fabClasses.set(Char.KayKitSkeletonArrowHalf, KayKitSkeletonArrowHalfFab);
        this.fabClasses.set(Char.KayKitSkeletonAxe, KayKitSkeletonAXeFab);
        this.fabClasses.set(Char.KayKitSkeletonBlade, KayKitSkeletonBladeFab);
        this.fabClasses.set(Char.KayKitSkeletonCrossbow, KayKitSkeletonCrossbowFab);
        this.fabClasses.set(Char.KayKitSkeletonQuiver, KayKitSkeletonQuiverFab);
        this.fabClasses.set(Char.KayKitSkeletonShieldLarge_A, KayKitSkeletonShieldLargeAFab);
        this.fabClasses.set(Char.KayKitSkeletonShieldLarge_B, KayKitSkeletonShieldLargeBFab);
        this.fabClasses.set(Char.KayKitSkeletonShieldSmall_A, KayKitSkeletonShieldSmallAFab);
        this.fabClasses.set(Char.KayKitSkeletonShieldSmall_B, KayKitSkeletonShieldSmallBFab);
        this.fabClasses.set(Char.KayKitSkeletonStaff, KayKitSkeletonStaffFab);

        this.fabClasses.set(Char.CharHumanKayKitAdvBarbarian, KayKitAdvBarbarianFab);
        this.fabClasses.set(Char.CharHumanKayKitAdvKnight, KayKitAdvKnightFab);
        this.fabClasses.set(Char.CharHumanKayKitAdvMage, KayKitAdvMageFab);
        this.fabClasses.set(Char.CharHumanKayKitAdvRogue, KayKitAdvRogueFab);
        this.fabClasses.set(Char.CharHumanKayKitAdvRogueHooded, KayKitAdvRogueHoodedFab);

        this.fabClasses.set(Char.KayKitAdvArrow, KayKitArrowFab);
        this.fabClasses.set(Char.KayKitAdvArrowBundle, KayKitArrowBundleFab);
        this.fabClasses.set(Char.KayKitAdvAxe1Handed, KayKitAxe1HandedFab);
        this.fabClasses.set(Char.KayKitAdvAxe2Handed, KayKitAxe2HandedFab);
        this.fabClasses.set(Char.KayKitAdvCrossbow1Handed, KayKitCrossbow1HandedFab);
        this.fabClasses.set(Char.KayKitAdvCrossbow2Handed, KayKitCrossbow2HandedFab);
        this.fabClasses.set(Char.KayKitAdvDagger, KayKitDaggerFab);
        this.fabClasses.set(Char.KayKitAdvMugEmpty, KayKitMugEmptyFab);
        this.fabClasses.set(Char.KayKitAdvMugFull, KayKitMugFullFab);
        this.fabClasses.set(Char.KayKitAdvQuiver, KayKitQuiverFab);
        this.fabClasses.set(Char.KayKitAdvShieldBadge, KayKitShieldBadgeFab);
        this.fabClasses.set(Char.KayKitAdvShieldBadgeColor, KayKitShieldBadgeColorFab);
        this.fabClasses.set(Char.KayKitAdvShieldRound, KayKitShieldRoundFab);
        this.fabClasses.set(Char.KayKitAdvShieldRoundBarbarian, KayKitShieldRoundBarbarianFab);
        this.fabClasses.set(Char.KayKitAdvShieldRoundColor, KayKitShieldRoundColorFab);
        this.fabClasses.set(Char.KayKitAdvShieldSpikes, KayKitShieldSpikesFab);
        this.fabClasses.set(Char.KayKitAdvShieldSpikesColor, KayKitShieldSpikesColorFab);
        this.fabClasses.set(Char.KayKitAdvShieldSquare, KayKitShieldSquareFab);
        this.fabClasses.set(Char.KayKitAdvShieldSquareColor, KayKitShieldSquareColorFab);
        this.fabClasses.set(Char.KayKitAdvSmokeBomb, KayKitSmokeBombFab);
        this.fabClasses.set(Char.KayKitAdvSpellbookClosed, KayKitSpellbookClosedFab);
        this.fabClasses.set(Char.KayKitAdvSpellbookOpen, KayKitSpellbookOpenFab);
        this.fabClasses.set(Char.KayKitAdvStaff, KayKitStaffFab);
        this.fabClasses.set(Char.KayKitAdvSword1Handed, KayKitSword1HandedFab);
        this.fabClasses.set(Char.KayKitAdvSword2Handed, KayKitSword2HandedFab);
        this.fabClasses.set(Char.KayKitAdvSword2HandedColor, KayKitSword2HandedColorFab);
        this.fabClasses.set(Char.KayKitAdvWand, KayKitWandFab);

        this.fabClasses.set(Char.OceanStarterSubMarine, OceanStarterSubmarineFab);
        this.fabClasses.set(Char.OceanStarterSmallCoral, OceanStarterSmallCoralFab);
        this.fabClasses.set(Char.OceanStarterSmallBoat, OceanStarterSmallBoatFab);
        this.fabClasses.set(Char.OceanStarterPirateShip, OceanStarterPirateShipFab);
        this.fabClasses.set(Char.OceanStarterLongPlant, OceanStarterLongPlantFab);
        this.fabClasses.set(Char.OceanStarterCrashedShip, OceanStarterCrashedShipFab);
        this.fabClasses.set(Char.OceanStarterChestOld, OceanStarterChestOldFab);
        this.fabClasses.set(Char.OceanStarterChest, OceanStarterChestFab);
        this.fabClasses.set(Char.OceanStarterAnemonie, OceanStarterAnemonieFab);

        this.fabClasses.set(Char.CharAniOceanDolphin, OceanDolphinFab);
        this.fabClasses.set(Char.CharAniOceanFish1, OceanFish1Fab);
        this.fabClasses.set(Char.CharAniOceanFish2, OceanFish2Fab);
        this.fabClasses.set(Char.CharAniOceanFish3, OceanFish3Fab);
        this.fabClasses.set(Char.CharAniOceanMantaRay, OceanMantaRayFab);
        this.fabClasses.set(Char.CharAniOceanShark, OceanSharkFab);
        this.fabClasses.set(Char.CharAniOceanWhale, OceanWhaleFab);

        this.fabClasses.set(Char.CharAniEasypackFrog, EasypackFrogFab);
        this.fabClasses.set(Char.CharAniEasypackRat, EasypackRatFab);
        this.fabClasses.set(Char.CharAniEasypackSnake, EasypackSnakeFab);
        this.fabClasses.set(Char.CharAniEasypackSnakeAngry, EasypackSnakeAngryFab);
        this.fabClasses.set(Char.CharAniEasypackSpider, EasypackSpiderFab);
        this.fabClasses.set(Char.CharAniEasypackWasp, EasypackWaspFab);
        this.fabClasses.set(Char.CharMonEasypackSlime, EasypackSlimeFab);


        this.fabClasses.set(Char.CharHumanUltimate, UltimateCharFab);
        this.fabClasses.set(Char.CharHumanUltimateGun, UltimateCharGunFab);
        this.fabClasses.set(Char.UltimateCubeBricks, UltimateCubeBricksFab);
        this.fabClasses.set(Char.UltimateCubeCrate, UltimateCubeCrateFab);
        this.fabClasses.set(Char.UltimateCubeDefault, UltimateCubeDefaultFab);
        this.fabClasses.set(Char.UltimateCubeDirtSingle, UltimateCubeDirtSingleFab);
        this.fabClasses.set(Char.UltimateCubeExclamation, UltimateCubeExclamationFab);
        this.fabClasses.set(Char.UltimateCubeGrassSingle, UltimateCubeGrassSingleFab);
        this.fabClasses.set(Char.UltimateCubeQuestion, UltimateCubeQuestionFab);
        this.fabClasses.set(Char.CharMonUltimateEnermyBee, UltimateEnermyBeeFab);
        this.fabClasses.set(Char.CharMonUltimateEnermyCrab, UltimateEnermyCrabFab);
        this.fabClasses.set(Char.CharMonUltimateEnermy, UltimateEnermyFab);
        this.fabClasses.set(Char.CharMonUltimateEnermySkull, UltimateEnermySkullFab);
        this.fabClasses.set(Char.UltimateLvAndMaArrow, UltimateLvAndMaArrowFab);
        this.fabClasses.set(Char.UltimateLvAndMaArrowSide, UltimateLvAndMaArrowSideFab);
        this.fabClasses.set(Char.UltimateLvAndMaArrowUp, UltimateLvAndMaArrowUpFab);
        this.fabClasses.set(Char.UltimateLvAndMaBomb, UltimateLvAndMaBombFab);
        this.fabClasses.set(Char.UltimateLvAndMaBouncer, UltimateLvAndMaBouncerFab);
        this.fabClasses.set(Char.UltimateLvAndMaBridgeModular, UltimateLvAndMaBridgeModularFab);
        this.fabClasses.set(Char.UltimateLvAndMaBridgeModularCenter, UltimateLvAndMaBridgeModularCenterFab);
        this.fabClasses.set(Char.UltimateLvAndMaBridgeSmall, UltimateLvAndMaBridgeSmallFab);
        this.fabClasses.set(Char.UltimateLvAndMaCannon, UltimateLvAndMaCannonFab);
        this.fabClasses.set(Char.UltimateLvAndMaCannonBall, UltimateLvAndMaCannonBallFab);
        this.fabClasses.set(Char.UltimateLvAndMaChest, UltimateLvAndMaChestFab);
        this.fabClasses.set(Char.UltimateLvAndMaDoor, UltimateLvAndMaDoorFab);
        this.fabClasses.set(Char.UltimateLvAndMaFence1, UltimateLvAndMaFence1Fab);
        this.fabClasses.set(Char.UltimateLvAndMaFenceCorner, UltimateLvAndMaFenceCornerFab);
        this.fabClasses.set(Char.UltimateLvAndMaFenceMiddle, UltimateLvAndMaFenceMiddleFab);
        this.fabClasses.set(Char.UltimateLvAndMaGoalFlag, UltimateLvAndMaGoalFlagFab);
        this.fabClasses.set(Char.UltimateLvAndMaHazardCylinder, UltimateLvAndMaHazardCylinderFab);
        this.fabClasses.set(Char.UltimateLvAndMaHazardSaw, UltimateLvAndMaHazardSawFab);
        this.fabClasses.set(Char.UltimateLvAndMaHazardSpikeTrap, UltimateLvAndMaHazardSpikeTrapFab);
        this.fabClasses.set(Char.UltimateLvAndMaLever, UltimateLvAndMaLeverFab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers0, UltimateLvAndMaNumber0Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers1, UltimateLvAndMaNumber1Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers2, UltimateLvAndMaNumber2Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers3, UltimateLvAndMaNumber3Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers4, UltimateLvAndMaNumber4Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers5, UltimateLvAndMaNumber5Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers6, UltimateLvAndMaNumber6Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers7, UltimateLvAndMaNumber7Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers8, UltimateLvAndMaNumber8Fab);
        this.fabClasses.set(Char.UltimateLvAndMaNumbers9, UltimateLvAndMaNumber9Fab);
        this.fabClasses.set(Char.UltimateLvAndMaPipe90, UltimateLvAndMaPipe90Fab);
        this.fabClasses.set(Char.UltimateLvAndMaPipeEnd, UltimateLvAndMaPipeEndFab);
        this.fabClasses.set(Char.UltimateLvAndMaPipeStraight, UltimateLvAndMaPipeStraightFab);
        this.fabClasses.set(Char.UltimateLvAndMaPipeT, UltimateLvAndMaPipeTFab);
        this.fabClasses.set(Char.UltimateLvAndMaPlantLarge, UltimateLvAndMaPlantLargeFab);
        this.fabClasses.set(Char.UltimateLvAndMaPlantSmall, UltimateLvAndMaPlantSmallFab);
        this.fabClasses.set(Char.UltimateLvAndMaSpikes, UltimateLvAndMaSpikesFab);
        this.fabClasses.set(Char.UltimateLvAndMaSpikyBall, UltimateLvAndMaSpikyBallFab);
        this.fabClasses.set(Char.UltimateLvAndMaStairs, UltimateLvAndMaStairsFab);
        this.fabClasses.set(Char.UltimateLvAndMaStairsModularEnd, UltimateLvAndMaStairsModularEndFab);
        this.fabClasses.set(Char.UltimateLvAndMaStairsModularMiddle, UltimateLvAndMaStairsModularMiddleFab);
        this.fabClasses.set(Char.UltimateLvAndMaStairsModularStart, UltimateLvAndMaStairsModularStartFab);
        this.fabClasses.set(Char.UltimateLvAndMaStairsSmall, UltimateLvAndMaStairsSmallFab);
        this.fabClasses.set(Char.UltimateLvAndMaTower, UltimateLvAndMaTowerFab);
        this.fabClasses.set(Char.UltimateModPlatform2DCubeDirt1x1Center, UltimateModPlatform2DCubeDirt1x1CenterFab);
        this.fabClasses.set(Char.UltimateModPlatform2DCubeDirt1x1End, UltimateModPlatform2DCubeDirt1x1EndFab);
        this.fabClasses.set(Char.UltimateModPlatform2DCubeGrass1x1Center, UltimateModPlatform2DCubeGrass1x1CenterFab);
        this.fabClasses.set(Char.UltimateModPlatform2DCubeGrass1x1End, UltimateModPlatform2DCubeGrass1x1EndFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeDirtCenterTall, UltimateModPlatform3DCubeDirtCenterTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeDirtCornerTall, UltimateModPlatform3DCubeDirtCornerTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeDirtSideTall, UltimateModPlatform3DCubeDirtSideTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeGrassBottomTall, UltimateModPlatform3DCubeGrassBottomTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeGrassCornerBottomTall, UltimateModPlatform3DCubeGrassCornerBottomTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeGrassCornerCenterTall, UltimateModPlatform3DCubeGrassCornerCenterTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeGrassCornerTall, UltimateModPlatform3DCubeGrassCornerTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeGrassSideBottomTall, UltimateModPlatform3DCubeGrassSideBottomTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeGrassSideCenterTall, UltimateModPlatform3DCubeGrassSideCenterTallFab);
        this.fabClasses.set(Char.UltimateModPlatform3DCubeGrassSideTall, UltimateModPlatform3DCubeGrassSideTallFab);
        this.fabClasses.set(Char.UltimateModPlatformSingleCubeDirt, UltimateModPlatformSingleCubeDirtFab);
        this.fabClasses.set(Char.UltimateModPlatformSingleCubeGrass, UltimateModPlatformSingleCubeGrassFab);
        this.fabClasses.set(Char.UltimateModPlatformSingleHeightDirtCenter, UltimateModPlatformSingleHeightDirtCenterFab);
        this.fabClasses.set(Char.UltimateModPlatformSingleHeightDirtCorner, UltimateModPlatformSingleHeightDirtCornerFab);
        this.fabClasses.set(Char.UltimateModPlatformSingleHeightDirtSide, UltimateModPlatformSingleHeightDirtSideFab);
        this.fabClasses.set(Char.UltimateModPlatformSingleHeightGrassCenter, UltimateModPlatformSingleHeightGrassCenterFab);
        this.fabClasses.set(Char.UltimateModPlatformSingleHeightGrassCorner, UltimateModPlatformSingleHeightGrassCornerFab);
        this.fabClasses.set(Char.UltimateModPlatformSingleHeightGrassSide, UltimateModPlatformSingleHeightGrassSideFab);
        this.fabClasses.set(Char.UltimateNatureBush, UltimateNatureBushFab);
        this.fabClasses.set(Char.UltimateNatureBushFruit, UltimateNatureBushFruitFab);
        this.fabClasses.set(Char.UltimateNatureCloud1, UltimateNatureCloud1Fab);
        this.fabClasses.set(Char.UltimateNatureCloud2, UltimateNatureCloud2Fab);
        this.fabClasses.set(Char.UltimateNatureCloud3, UltimateNatureCloud3Fab);
        this.fabClasses.set(Char.UltimateNatureFruit, UltimateNatureFruitFab);
        this.fabClasses.set(Char.UltimateNatureGrass1, UltimateNatureGrass1Fab);
        this.fabClasses.set(Char.UltimateNatureGrass2, UltimateNatureGrass2Fab);
        this.fabClasses.set(Char.UltimateNatureGrass3, UltimateNatureGrass3Fab);
        this.fabClasses.set(Char.UltimateNatureRock1, UltimateNatureRock1Fab);
        this.fabClasses.set(Char.UltimateNatureRock2, UltimateNatureRock2Fab);
        this.fabClasses.set(Char.UltimateNatureRockPlatformTall, UltimateNatureRockPlatformTallFab);
        this.fabClasses.set(Char.UltimateNatureRockPlatforms1, UltimateNatureRockPlatforms1Fab);
        this.fabClasses.set(Char.UltimateNatureRockPlatforms2, UltimateNatureRockPlatforms2Fab);
        this.fabClasses.set(Char.UltimateNatureRockPlatforms3, UltimateNatureRockPlatforms3Fab);
        this.fabClasses.set(Char.UltimateNatureRockPlatformsLarge, UltimateNatureRockPlatformsLargeFab);
        this.fabClasses.set(Char.UltimateNatureRockPlatformsMedium, UltimateNatureRockPlatformsMediumFab);
        this.fabClasses.set(Char.UltimateNatureTree, UltimateNatureTreeFab);
        this.fabClasses.set(Char.UltimateNatureTreeFruit, UltimateNatureTreeFruitFab);
        this.fabClasses.set(Char.UltimatePAPCoin, UltimatePAPCoinFab);
        this.fabClasses.set(Char.UltimatePAPGemBlue, UltimatePAPGemBlueFab);
        this.fabClasses.set(Char.UltimatePAPGemGreen, UltimatePAPGemGreenFab);
        this.fabClasses.set(Char.UltimatePAPGemPink, UltimatePAPGemPinkFab);
        this.fabClasses.set(Char.UltimatePAPHeart, UltimatePAPHeartFab);
        this.fabClasses.set(Char.UltimatePAPHeartHalf, UltimatePAPHeartHalfFab);
        this.fabClasses.set(Char.UltimatePAPHeartOutline, UltimatePAPHeartOutlineFab);
        this.fabClasses.set(Char.UltimatePAPKey, UltimatePAPKeyFab);
        this.fabClasses.set(Char.UltimatePAPStar, UltimatePAPStarFab);
        this.fabClasses.set(Char.UltimatePAPStarOutline, UltimatePAPStarOutlineFab);
        this.fabClasses.set(Char.UltimatePAPThunder, UltimatePAPThunderFab);

        // Pet
        this.fabClasses.set(Char.CharAniBilby, BilbyFab);
        this.fabClasses.set(Char.CharAniDog, DogFab);
        this.fabClasses.set(Char.CharAniCat, CatFab);
        this.fabClasses.set(Char.CharAniBee, BeeFab);
        this.fabClasses.set(Char.CharAniPetSnake, PetSnakeFab);

        // Farm Pet
        this.fabClasses.set(Char.CharAniFarmPetCow, FarmPetCowFab);
        this.fabClasses.set(Char.CharAniFarmPetHorse, FarmPetHorseFab);
        this.fabClasses.set(Char.CharAniFarmPetLlama, FarmPetLlamaFab);
        this.fabClasses.set(Char.CharAniFarmPetPig, FarmPetPigFab);
        this.fabClasses.set(Char.CharAniFarmPetPug, FarmPetPugFab);
        this.fabClasses.set(Char.CharAniFarmPetSheep, FarmPetSheepFab);
        this.fabClasses.set(Char.CharAniFarmPetZebra, FarmPetZebraFab);

        // Stup
        this.fabClasses.set(Char.Bat, BatFab);
        this.fabClasses.set(Char.Gun, GunFab);
        this.fabClasses.set(Char.Stone, StoneFab);
        this.fabClasses.set(Char.Bed, BedFab);
        this.fabClasses.set(Char.Bath, BathFab);
        this.fabClasses.set(Char.Bookshelf, BookShelfFab);
        this.fabClasses.set(Char.Closet, ClosetFab);
        this.fabClasses.set(Char.Desk, DeskFab);
        this.fabClasses.set(Char.Kitchen, KitchenFab);
        this.fabClasses.set(Char.KitTable, KitTableFab);
        this.fabClasses.set(Char.Oven, OvenFab);
        this.fabClasses.set(Char.Refrigerator, RefrigeratorFab);
        this.fabClasses.set(Char.Sink, SinkFab);
        this.fabClasses.set(Char.Table, TableFab);
        this.fabClasses.set(Char.Toilet, ToiletFab);
        this.fabClasses.set(Char.TV, TvFab);

        this.fabClasses.set(Char.FluffyTree, FluffyTreeFab);
        this.fabClasses.set(Char.AppleTree, AppleTreeFab);
        this.fabClasses.set(Char.Apple, AppleFab);
        this.fabClasses.set(Char.CoconutTree, CoconutTreeFab);
        this.fabClasses.set(Char.Coconut, CoconutFab);
        this.fabClasses.set(Char.DeadTree2, DeadTree2Fab);
        this.fabClasses.set(Char.Tomato0, Tomato0Fab);
        this.fabClasses.set(Char.Tomato1, Tomato1Fab);
        this.fabClasses.set(Char.Tomato2, Tomato2Fab);
        this.fabClasses.set(Char.Potato0, Potato0Fab);
        this.fabClasses.set(Char.Potato1, Potato1Fab);
        this.fabClasses.set(Char.Potato2, Potato2Fab);
        this.fabClasses.set(Char.Carrot0, Carrot0Fab);
        this.fabClasses.set(Char.Carrot1, Carrot1Fab);
        this.fabClasses.set(Char.Carrot2, Carrot2Fab);

        this.fabClasses.set(Char.Grass, GrassFab);

        this.fabClasses.set(Char.WateringCan, WarteringCanFab);
        this.fabClasses.set(Char.Hammer, HammerFab);

        this.fabClasses.set(Char.Empty, EmptyFab);


        // 추가 모델은 여기서 계속 등록
    }

    GetAssets(id: Char): IAsset {
        if (!this.fabInstances.has(id)) {
            const FabClass = this.fabClasses.get(id);
            if (!FabClass) {
                console.warn(`Fab class for ${id} not found. Using default MaleFab.`);
                return this.GetAssets(Char.CharHumanMale);
            }
            const instance = new FabClass(this);
            this.fabInstances.set(id, instance);
        }
        return this.fabInstances.get(id)!;
    }

    get Load(): GLTFLoader {
        return this.loader;
    }

    get LoadingManager(): THREE.LoadingManager {
        return this.loadingManager;
    }

    get FBXLoader(): FBXLoader {
        return this.fbxLoader;
    }
}
