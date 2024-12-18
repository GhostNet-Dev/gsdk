import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js"
import { DeadtreeFab } from "./plant/deadtreefab";
import { Char, IAsset } from "./assetmodel";
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

export class Loader {
    private fbxLoader = new FBXLoader()
    private loadingManager = new THREE.LoadingManager()
    private loader = new GLTFLoader(this.loadingManager)

    private male = new MaleFab(this)
    private female = new FemaleFab(this)
    private hellboy = new HellBoyFab(this)
    private cutegirl = new CuteGirlFab(this)
    private officegirl = new OfficeGirlFab(this)
    private wizard = new WizardFab(this)
    private twoB = new TwoBFab(this)
    private arrow = new ArrowFab(this)

    private mushroom1 = new MushroomFab(this, 1)
    private mushroom2 = new MushroomFab(this, 2)
    private tree = new TreeFab(this)
    private deadtree = new DeadtreeFab(this)
    private portal = new PortalFab(this)
    private test = new TestFab(this)

    // Monster //
    private zombie = new ZombieFab(this)
    private minatuar = new MinataurFab(this)
    private crab = new CrabFab(this)
    private batpig = new BatPigFab(this)
    private birdmon = new BirdMonFab(this)
    private werewolf = new WereWolfFab(this)
    private golem = new GolemFab(this)
    private biggolem = new BigGolemFab(this)
    private snake = new SnakeFab(this)
    private viking = new VikingFab(this)
    private builder = new BuilderFab(this)
    private toadmage = new ToadMageFab(this)
    private kittenmonk = new KittenMonkFab(this)
    private skeleton = new SkeletonFab(this)

    // Pet //
    private bilby = new BilbyFab(this)
    private dog = new DogFab(this)
    private bee = new BeeFab(this)
    private petSnake = new PetSnakeFab(this)

    // stup //
    private bat = new BatFab(this)
    private gun = new GunFab(this)
    private stone = new StoneFab(this)
    private bed = new BedFab(this)
    private bath = new BathFab(this)
    private bookshelf = new BookShelfFab(this)
    private closet = new ClosetFab(this)
    private desk = new DeskFab(this)
    private kitchen = new KitchenFab(this)
    private kitTable = new KitTableFab(this)
    private oven = new OvenFab(this)
    private refrigerator = new RefrigeratorFab(this)
    private sink = new SinkFab(this)
    private table = new TableFab(this)
    private toilet = new ToiletFab(this)
    private tv = new TvFab(this)


    private fluffyTree = new FluffyTreeFab(this)
    private appleTree = new AppleTreeFab(this)
    private apple = new AppleFab(this)
    private coconutTree = new CoconutTreeFab(this)
    private coconut = new CoconutFab(this)
    private deadTree2 = new DeadTree2Fab(this)
    private tomato0 = new Tomato0Fab(this)
    private tomato1 = new Tomato1Fab(this)
    private tomato2 = new Tomato2Fab(this)
    private potato0 = new Potato0Fab(this)
    private potato1 = new Potato1Fab(this)
    private potato2 = new Potato2Fab(this)
    private carrot0 = new Carrot0Fab(this)
    private carrot1 = new Carrot1Fab(this)
    private carrot2 = new Carrot2Fab(this)

    private grass = new GrassFab(this)

    private wartercan = new WarteringCanFab(this)
    private hammer = new HammerFab(this)

    private empty = new EmptyFab(this)

    get MaleAsset(): IAsset { return this.male }
    get FemaleAsset(): IAsset { return this.female }
    get CuteGirlAsset(): IAsset { return this.cutegirl }
    get OfficeGirlAsset(): IAsset { return this.officegirl }
    get WizardAsset(): IAsset { return this.wizard }
    get TwoBAsset(): IAsset { return this.twoB }
    get ArrowAsset(): IAsset { return this.arrow }

    get HellboyAsset(): IAsset { return this.hellboy }
    //get FemaleAsset(): IAsset { return this.test }
    get Mushroom1Asset(): IAsset { return this.mushroom1 }
    get Mushroom2Asset(): IAsset { return this.mushroom2 }
    get TreeAsset(): IAsset { return this.tree }
    get DeadTreeAsset(): IAsset { return this.deadtree }
    get DeadTree2Asset(): IAsset { return this.deadTree2 }
    get PortalAsset(): IAsset { return this.portal }

    get ZombieAsset(): IAsset { return this.zombie }
    get MinatuarAsset(): IAsset { return this.minatuar }
    get CrabAsset(): IAsset { return this.crab }
    get BatPigAsset(): IAsset { return this.batpig }
    get BirdMonAsset(): IAsset { return this.birdmon }
    get WereWolfAsset(): IAsset { return this.werewolf }

    get BilbyAsset(): IAsset { return this.bilby }
    get DogAsset(): IAsset { return this.dog }
    get BeeAsset(): IAsset { return this.bee }
    get PetSnakeAsset(): IAsset { return this.petSnake }

    get GunAsset(): IAsset { return this.gun }
    get BatAsset(): IAsset { return this.bat }
    get BedAsset(): IAsset { return this.bed }
    get BathAsset(): IAsset { return this.bath }
    get BookShelfAsset(): IAsset { return this.bookshelf }
    get ClosetAsset(): IAsset { return this.closet }
    get DeskAsset(): IAsset { return this.desk }
    get KitchenAsset(): IAsset { return this.kitchen }
    get KitTableAsset(): IAsset { return this.kitTable }
    get OvenAsset(): IAsset { return this.oven }
    get RefrigeratorAsset(): IAsset { return this.refrigerator }
    get SinkAsset(): IAsset { return this.sink }
    get TableAsset(): IAsset { return this.table }
    get ToiletAsset(): IAsset { return this.toilet }
    get TvAsset(): IAsset { return this.tv }

    get WarteringCanAsset(): IAsset { return this.wartercan }
    get HammerAsset(): IAsset { return this.hammer }

    get FluffyTreeAsset(): IAsset { return this.fluffyTree }
    get AppleTreeAsset(): IAsset { return this.appleTree }
    get AppleAsset(): IAsset { return this.apple }
    get CoconutTreeAsset(): IAsset { return this.coconutTree }
    get CoconutAsset(): IAsset { return this.coconut }
    get Tomato0Asset(): IAsset { return this.tomato0 }
    get Tomato1Asset(): IAsset { return this.tomato1 }
    get Tomato2Asset(): IAsset { return this.tomato2 }
    get Potato0Asset(): IAsset { return this.potato0 }
    get Potato1Asset(): IAsset { return this.potato1 }
    get Potato2Asset(): IAsset { return this.potato2 }
    get Carrot0Asset(): IAsset { return this.carrot0 }
    get Carrot1Asset(): IAsset { return this.carrot1 }
    get Carrot2Asset(): IAsset { return this.carrot2 }

    get GrassAsset(): IAsset { return this.grass }

    get EmptyAsset(): IAsset { return this.empty }


    get Load(): GLTFLoader { return this.loader }
    get LoadingManager(): THREE.LoadingManager { return this.loadingManager }
    get FBXLoader(): FBXLoader { return this.fbxLoader}

    get StoneAsset(): IAsset { return this.stone }

    assets = new Map<Char, IAsset>()

    constructor() {
        THREE.Cache.enabled = true

        this.assets.set(Char.Male, this.male)
        this.assets.set(Char.Female, this.female)
        this.assets.set(Char.Hellboy, this.hellboy)
        this.assets.set(Char.CuteGirl, this.cutegirl)
        this.assets.set(Char.OfficeGirl, this.officegirl)
        this.assets.set(Char.Wizard, this.wizard)
        this.assets.set(Char.TwoB, this.twoB)
        this.assets.set(Char.Arrow, this.arrow)
        //this.assets.set(Char.Female, this.test)
        this.assets.set(Char.Tree, this.tree)
        this.assets.set(Char.DeadTree, this.deadtree)
        this.assets.set(Char.Mushroom1, this.mushroom1)
        this.assets.set(Char.Mushroom2, this.mushroom2)
        this.assets.set(Char.Portal, this.portal)
        this.assets.set(Char.Test, this.test)

        this.assets.set(Char.Zombie, this.zombie)
        this.assets.set(Char.Minataur, this.minatuar)
        this.assets.set(Char.CrabMon, this.crab)
        this.assets.set(Char.BatPig, this.batpig)
        this.assets.set(Char.BirdMon, this.birdmon)
        this.assets.set(Char.WereWolf, this.werewolf)
        this.assets.set(Char.Golem, this.golem)
        this.assets.set(Char.BigGolem, this.biggolem)
        this.assets.set(Char.Snake, this.snake)
        this.assets.set(Char.Viking, this.viking)
        this.assets.set(Char.Builder, this.builder)
        this.assets.set(Char.ToadMage, this.toadmage)
        this.assets.set(Char.KittenMonk, this.kittenmonk)
        this.assets.set(Char.Skeleton, this.skeleton)

        this.assets.set(Char.Bilby, this.bilby)
        this.assets.set(Char.Dog, this.dog)
        this.assets.set(Char.Bee, this.bee)
        this.assets.set(Char.PetSnake, this.petSnake)

        this.assets.set(Char.Bat, this.bat)
        this.assets.set(Char.Gun, this.gun)
        this.assets.set(Char.WarteringCan, this.wartercan)
        this.assets.set(Char.Hammer, this.hammer)

        this.assets.set(Char.FluffyTree, this.fluffyTree)
        this.assets.set(Char.AppleTree, this.appleTree)
        this.assets.set(Char.Apple, this.apple)
        this.assets.set(Char.CoconutTree, this.coconutTree)
        this.assets.set(Char.Coconut, this.coconut)
        this.assets.set(Char.DeadTree2, this.deadTree2)
        this.assets.set(Char.Tomato0, this.tomato0)
        this.assets.set(Char.Tomato1, this.tomato1)
        this.assets.set(Char.Tomato2, this.tomato2)
        this.assets.set(Char.Potato0, this.potato0)
        this.assets.set(Char.Potato1, this.potato1)
        this.assets.set(Char.Potato2, this.potato2)
        this.assets.set(Char.Carrot0, this.carrot0)
        this.assets.set(Char.Carrot1, this.carrot1)
        this.assets.set(Char.Carrot2, this.carrot2)

        this.assets.set(Char.Grass, this.grass)

        this.assets.set(Char.Stone, this.stone)
        this.assets.set(Char.Bed, this.bed)
        this.assets.set(Char.Bath, this.bath)
        this.assets.set(Char.Bookshelf, this.bookshelf)
        this.assets.set(Char.Closet, this.closet)
        this.assets.set(Char.Desk, this.desk)
        this.assets.set(Char.Kitchen, this.kitchen)
        this.assets.set(Char.KitTable, this.kitTable)
        this.assets.set(Char.Oven, this.oven)
        this.assets.set(Char.Refrigerator, this.refrigerator)
        this.assets.set(Char.Sink, this.sink)
        this.assets.set(Char.Table, this.table)
        this.assets.set(Char.Toilet, this.toilet)
        this.assets.set(Char.TV, this.tv)

        this.assets.set(Char.Empty, this.empty)
        /*
        const progressBar = document.querySelector('#progress-bar') as HTMLProgressElement
        this.LoadingManager.onProgress = (_url, loaded, total) => {
            progressBar.value = (loaded / total) * 100
        }
        */
        /*
        const progressBarContainer = document.querySelector('#progress-bar-container') as HTMLDivElement
        this.LoadingManager.onStart = () => {
            const progressBarContainer = document.querySelector('#progress-bar-container') as HTMLDivElement
            progressBarContainer.style.display = "flex"
        }
        this.LoadingManager.onLoad = () => {
            progressBarContainer.style.display = 'none'
        }
        */
    }

    GetAssets(id: Char): IAsset{
        const ret = this.assets.get(id)
        if (ret == undefined) 
            return this.MaleAsset
        return ret
    }
}