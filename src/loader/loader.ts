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
        this.fabClasses.set(Char.Male, MaleFab);
        this.fabClasses.set(Char.Female, FemaleFab);
        this.fabClasses.set(Char.Hellboy, HellBoyFab);
        this.fabClasses.set(Char.CuteGirl, CuteGirlFab);
        this.fabClasses.set(Char.OfficeGirl, OfficeGirlFab);
        this.fabClasses.set(Char.Wizard, WizardFab);
        this.fabClasses.set(Char.TwoB, TwoBFab);
        this.fabClasses.set(Char.Arrow, ArrowFab);

        this.fabClasses.set(Char.Mushroom1, MushroomFab);
        this.fabClasses.set(Char.Mushroom2, MushroomFab);
        this.fabClasses.set(Char.Tree, TreeFab);
        this.fabClasses.set(Char.DeadTree, DeadtreeFab);
        this.fabClasses.set(Char.Portal, PortalFab);
        this.fabClasses.set(Char.Test, TestFab);

        // Monster
        this.fabClasses.set(Char.Zombie, ZombieFab);
        this.fabClasses.set(Char.Minataur, MinataurFab);
        this.fabClasses.set(Char.CrabMon, CrabFab);
        this.fabClasses.set(Char.BatPig, BatPigFab);
        this.fabClasses.set(Char.BirdMon, BirdMonFab);
        this.fabClasses.set(Char.WereWolf, WereWolfFab);
        this.fabClasses.set(Char.Golem, GolemFab);
        this.fabClasses.set(Char.BigGolem, BigGolemFab);
        this.fabClasses.set(Char.Snake, SnakeFab);
        this.fabClasses.set(Char.Viking, VikingFab);
        this.fabClasses.set(Char.Builder, BuilderFab);
        this.fabClasses.set(Char.ToadMage, ToadMageFab);
        this.fabClasses.set(Char.KittenMonk, KittenMonkFab);
        this.fabClasses.set(Char.Skeleton, SkeletonFab);

        // KayKit
        this.fabClasses.set(Char.KayKitSkeletonMage, KayKitSkeletonMageFab);
        this.fabClasses.set(Char.KayKitSkeletonWarrior, KayKitSkeletonWarriorFab);
        this.fabClasses.set(Char.KayKitSkeletonRogue, KayKitSkeletonRogueFab);
        this.fabClasses.set(Char.KayKitSkeletonMinion, KayKitSkeletonMinionFab);

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

        this.fabClasses.set(Char.KayKitAdvBarbarian, KayKitAdvBarbarianFab);
        this.fabClasses.set(Char.KayKitAdvKnight, KayKitAdvKnightFab);
        this.fabClasses.set(Char.KayKitAdvMage, KayKitAdvMageFab);
        this.fabClasses.set(Char.KayKitAdvRogue, KayKitAdvRogueFab);
        this.fabClasses.set(Char.KayKitAdvRogueHooded, KayKitAdvRogueHoodedFab);

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

        // Pet
        this.fabClasses.set(Char.Bilby, BilbyFab);
        this.fabClasses.set(Char.Dog, DogFab);
        this.fabClasses.set(Char.Cat, CatFab);
        this.fabClasses.set(Char.Bee, BeeFab);
        this.fabClasses.set(Char.PetSnake, PetSnakeFab);

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
                return this.GetAssets(Char.Male);
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
