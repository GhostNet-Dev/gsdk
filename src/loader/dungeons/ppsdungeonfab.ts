import * as THREE from "three";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { AssetModel } from "../assetmodel";
import { Loader } from "../loader";
import { Bind, Char, ModelType } from "@Glibs/types/assettypes";
import { IAsset } from "@Glibs/interface/iasset";

class PPsDungeonPackFab extends AssetModel {
    gltf?: GLTF
    constructor(loader: Loader, path: string) {
        super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.InitMesh(meshs)
        })
    }
    InitMesh(meshs: THREE.Group) {
        console.log("InitMesh")
        meshs.castShadow = true
        meshs.receiveShadow = true
        meshs.rotateX(-Math.PI / 2)
    }
}
export class PPsDungeonPackBarrelFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackBarrel }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Barrel.fbx") }
}

export class PPsDungeonPackBookshelvesEmptyFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackBookshelvesEmpty }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/BookShelves_Empty.fbx") }
}

export class PPsDungeonPackCandle01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackCandle01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Candle_01.fbx") }
}

export class PPsDungeonPackCandleBundle01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackCandleBundle01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Candle_Bundle_01.fbx") }
}

export class PPsDungeonPackCandleFireFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackCandleFire }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Candle_Fire.fbx") }
}

export class PPsDungeonPackChestFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackChest }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Chest.fbx") }
}

export class PPsDungeonPackChestBodyFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackChestBody }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Chest_Body.fbx") }
}

export class PPsDungeonPackChestLargeFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackChestLarge }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Chest_Large.fbx") }
}

export class PPsDungeonPackChestLargeBodyFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackChestLargeBody }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Chest_Large_Body.fbx") }
}

export class PPsDungeonPackChestLargeLidFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackChestLargeLid }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Chest_Large_Lid.fbx") }
}

export class PPsDungeonPackChestLidFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackChestLid }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Chest_Lid.fbx") }
}

export class PPsDungeonPackCoinFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackCoin }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Coin.fbx") }
}

export class PPsDungeonPackColumnSmallFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackColumnSmall }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Column_Small.fbx") }
}

export class PPsDungeonPackColumnTallFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackColumnTall }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Column_Tall.fbx") }
}

export class PPsDungeonPackCouldronFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackCouldron }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Couldron.fbx") }
}

export class PPsDungeonPackCrateFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackCrate }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Crate.fbx") }
}

export class PPsDungeonPackCrateLargeFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackCrateLarge }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Crate_Large.fbx") }
}

export class PPsDungeonPackEdgeStairs01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackEdgeStairs01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Edge_Stairs_01.fbx") }
}

export class PPsDungeonPackEdgeStairs02Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackEdgeStairs02 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Edge_Stairs_02.fbx") }
}

export class PPsDungeonPackEdgeStairsTini01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackEdgeStairsTini01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Edge_Stairs_Tini_01.fbx") }
}

export class PPsDungeonPackEdgeStairsTini02Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackEdgeStairsTini02 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Edge_Stairs_Tini_02.fbx") }
}

export class PPsDungeonPackElevationCircleFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackElevationCircle }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Elevation_Circle.fbx") }
}

export class PPsDungeonPackFloorLargeFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackFloorLarge }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Floor_Large.fbx") }
}

export class PPsDungeonPackFloorAFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackFloorA }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Floor_a.fbx") }
}

export class PPsDungeonPackInkFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackInk }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Ink.fbx") }
}

export class PPsDungeonPackKeySilverFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackKeySilver }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Key_Silver.fbx") }
}

export class PPsDungeonPackLanternFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackLantern }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Lantern.fbx") }
}

export class PPsDungeonPackPillarLargeFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackPillarLarge }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Pillar_Large.fbx") }
}

export class PPsDungeonPackPillarSmallFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackPillarSmall }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Pillar_Small.fbx") }
}

export class PPsDungeonPackPotionA01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackPotionA01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Potion_a_01.fbx") }
}

export class PPsDungeonPackPotionB01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackPotionB01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Potion_b_01.fbx") }
}

export class PPsDungeonPackPotionC01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackPotionC01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Potion_c_01.fbx") }
}

export class PPsDungeonPackQuillFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackQuill }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Quill.fbx") }
}

export class PPsDungeonPackRailingColumn01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackRailingColumn01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Railing_Column_01.fbx") }
}

export class PPsDungeonPackRailingColumnIncline01Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackRailingColumnIncline01 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Railing_Column_Incline_01.fbx") }
}

export class PPsDungeonPackRailingSmallFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackRailingSmall }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Railing_Small.fbx") }
}

export class PPsDungeonPackRailingStairsFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackRailingStairs }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Railing_Stairs.fbx") }
}

export class PPsDungeonPackShieldFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackShield }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Shield.fbx") }
}

export class PPsDungeonPackShield1Fab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackShield1 }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Shield1.fbx") }
}

export class PPsDungeonPackStairsFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackStairs }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Stairs.fbx") }
}

export class PPsDungeonPackStairsCornerInFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackStairsCornerIn }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Stairs_Corner_In.fbx") }
}

export class PPsDungeonPackStairsCornerOutFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackStairsCornerOut }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Stairs_Corner_Out.fbx") }
}

export class PPsDungeonPackStoneBenchFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackStoneBench }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Stone_Bench.fbx") }
}

export class PPsDungeonPackStoneTableRoundFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackStoneTableRound }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Stone_Table_Round.fbx") }
}

export class PPsDungeonPackSwordArmingFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackSwordArming }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Sword_Arming.fbx") }
}

export class PPsDungeonPackThroneFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackThrone }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Throne.fbx") }
}

export class PPsDungeonPackWallFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackWall }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Wall.fbx") }
}

export class PPsDungeonPackWallEntranceFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackWallEntrance }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Wall_Entrance.fbx") }
}

export class PPsDungeonPackWallIsocelesraFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackWallIsocelesra }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Wall_IsocelesRA.fbx") }
}

export class PPsDungeonPackWallLargeFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackWallLarge }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Wall_Large.fbx") }
}

export class PPsDungeonPackWoodenChairFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackWoodenChair }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Wooden_Chair.fbx") }
}

export class PPsDungeonPackWoodenDoorFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackWoodenDoor }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Wooden_Door.fbx") }
}

export class PPsDungeonPackWoodenStoolFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackWoodenStool }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Wooden_Stool.fbx") }
}

export class PPsDungeonPackWoodenTableFab extends PPsDungeonPackFab implements IAsset {
    get Id() { return Char.PPsDungeonPackWoodenTable }
    constructor(loader: Loader) { super(loader, "assets/dungeonpack/pps_dungeon/fbx_Files/Wooden_Table.fbx") }
}