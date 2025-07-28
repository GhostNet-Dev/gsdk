import * as THREE from "three";
import { Loader } from "../../loader";
import { AssetModel } from "../../assetmodel";
import { IAsset } from "../../iasset";
import { Bind, Char, ModelType } from "../../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class KayKitResourceFbxFab extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string) { 
        super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
        this.meshs = meshs
            this.InitMesh(meshs)
        })
    }
    GetBodyMeshId(bind: Bind) {
        switch(bind) {
            case Bind.Hands_R: return "mixamorigRightHand";
            case Bind.Hands_L: return "mixamorigLeftHand";
        }
    }
    GetBox(mesh: THREE.Group) {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use this.meshs
        if (this.box == undefined) {
            const s = this.GetSize(mesh)
            this.box = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), this.boxMat)
        }

        const p = this.GetBoxPos(mesh)
        this.box.position.copy(p)
        this.box.rotation.copy(mesh.rotation)
        return new THREE.Box3().setFromObject(this.box)
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        console.log(this.meshs, this.size)
        return this.size 
    }
    InitMesh(meshs: THREE.Group) {
        meshs.castShadow = true
        meshs.receiveShadow = true

        meshs.traverse(child => {
            child.castShadow = true
            child.receiveShadow = true
        })
        const scale = 1
        meshs.scale.set(scale, scale, scale)
    }
}

export class KayKitResourceCopperBarFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperBar}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Bar.fbx") }
}

export class KayKitResourceCopperBarsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperBars}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Bars.fbx") }
}

export class KayKitResourceCopperBarsStackLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperBarsStackLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Bars_Stack_Large.fbx") }
}

export class KayKitResourceCopperBarsStackMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperBarsStackMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Bars_Stack_Medium.fbx") }
}

export class KayKitResourceCopperBarsStackSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperBarsStackSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Bars_Stack_Small.fbx") }
}

export class KayKitResourceCopperNuggetLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperNuggetLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Nugget_Large.fbx") }
}

export class KayKitResourceCopperNuggetMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperNuggetMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Nugget_Medium.fbx") }
}

export class KayKitResourceCopperNuggetSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperNuggetSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Nugget_Small.fbx") }
}

export class KayKitResourceCopperNuggetsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceCopperNuggets}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Copper_Nuggets.fbx") }
}

export class KayKitResourceFuelABarrelFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelABarrel}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_A_Barrel.fbx") }
}

export class KayKitResourceFuelABarrelDirtyFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelABarrelDirty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_A_Barrel_Dirty.fbx") }
}

export class KayKitResourceFuelABarrelsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelABarrels}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_A_Barrels.fbx") }
}

export class KayKitResourceFuelAJerrycanFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelAJerrycan}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_A_Jerrycan.fbx") }
}

export class KayKitResourceFuelBBarrelFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelBBarrel}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_B_Barrel.fbx") }
}

export class KayKitResourceFuelBBarrelDirtyFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelBBarrelDirty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_B_Barrel_Dirty.fbx") }
}

export class KayKitResourceFuelBBarrelsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelBBarrels}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_B_Barrels.fbx") }
}

export class KayKitResourceFuelBJerrycanFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelBJerrycan}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_B_Jerrycan.fbx") }
}

export class KayKitResourceFuelCBarrelFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelCBarrel}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_C_Barrel.fbx") }
}

export class KayKitResourceFuelCBarrelDirtyFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelCBarrelDirty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_C_Barrel_Dirty.fbx") }
}

export class KayKitResourceFuelCBarrelsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelCBarrels}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_C_Barrels.fbx") }
}

export class KayKitResourceFuelCJerrycanFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceFuelCJerrycan}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Fuel_C_Jerrycan.fbx") }
}

export class KayKitResourceGoldBarFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldBar}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Bar.fbx") }
}

export class KayKitResourceGoldBarsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldBars}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Bars.fbx") }
}

export class KayKitResourceGoldBarsStackLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldBarsStackLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Bars_Stack_Large.fbx") }
}

export class KayKitResourceGoldBarsStackMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldBarsStackMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Bars_Stack_Medium.fbx") }
}

export class KayKitResourceGoldBarsStackSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldBarsStackSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Bars_Stack_Small.fbx") }
}

export class KayKitResourceGoldNuggetLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldNuggetLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Nugget_Large.fbx") }
}

export class KayKitResourceGoldNuggetMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldNuggetMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Nugget_Medium.fbx") }
}

export class KayKitResourceGoldNuggetSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldNuggetSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Nugget_Small.fbx") }
}

export class KayKitResourceGoldNuggetsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceGoldNuggets}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Gold_Nuggets.fbx") }
}

export class KayKitResourceIronBarFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronBar}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Bar.fbx") }
}

export class KayKitResourceIronBarsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronBars}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Bars.fbx") }
}

export class KayKitResourceIronBarsStackLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronBarsStackLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Bars_Stack_Large.fbx") }
}

export class KayKitResourceIronBarsStackMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronBarsStackMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Bars_Stack_Medium.fbx") }
}

export class KayKitResourceIronBarsStackSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronBarsStackSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Bars_Stack_Small.fbx") }
}

export class KayKitResourceIronNuggetLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronNuggetLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Nugget_Large.fbx") }
}

export class KayKitResourceIronNuggetMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronNuggetMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Nugget_Medium.fbx") }
}

export class KayKitResourceIronNuggetSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronNuggetSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Nugget_Small.fbx") }
}

export class KayKitResourceIronNuggetsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceIronNuggets}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Iron_Nuggets.fbx") }
}

export class KayKitResourcePalletWoodFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourcePalletWood}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Pallet_Wood.fbx") }
}

export class KayKitResourcePalletWoodCoveredAFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourcePalletWoodCoveredA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Pallet_Wood_Covered_A.fbx") }
}

export class KayKitResourcePalletWoodCoveredBFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourcePalletWoodCoveredB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Pallet_Wood_Covered_B.fbx") }
}

export class KayKitResourcePartsCogFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourcePartsCog}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Parts_Cog.fbx") }
}

export class KayKitResourcePartsPileLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourcePartsPileLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Parts_Pile_Large.fbx") }
}

export class KayKitResourcePartsPileMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourcePartsPileMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Parts_Pile_Medium.fbx") }
}

export class KayKitResourcePartsPileSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourcePartsPileSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Parts_Pile_Small.fbx") }
}

export class KayKitResourceSilverBarFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverBar}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Bar.fbx") }
}

export class KayKitResourceSilverBarsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverBars}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Bars.fbx") }
}

export class KayKitResourceSilverBarsStackLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverBarsStackLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Bars_Stack_Large.fbx") }
}

export class KayKitResourceSilverBarsStackMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverBarsStackMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Bars_Stack_Medium.fbx") }
}

export class KayKitResourceSilverBarsStackSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverBarsStackSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Bars_Stack_Small.fbx") }
}

export class KayKitResourceSilverNuggetLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverNuggetLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Nugget_Large.fbx") }
}

export class KayKitResourceSilverNuggetMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverNuggetMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Nugget_Medium.fbx") }
}

export class KayKitResourceSilverNuggetSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverNuggetSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Nugget_Small.fbx") }
}

export class KayKitResourceSilverNuggetsFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceSilverNuggets}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Silver_Nuggets.fbx") }
}

export class KayKitResourceStoneBrickFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceStoneBrick}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Stone_Brick.fbx") }
}

export class KayKitResourceStoneBricksStackLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceStoneBricksStackLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Stone_Bricks_Stack_Large.fbx") }
}

export class KayKitResourceStoneBricksStackMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceStoneBricksStackMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Stone_Bricks_Stack_Medium.fbx") }
}

export class KayKitResourceStoneBricksStackSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceStoneBricksStackSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Stone_Bricks_Stack_Small.fbx") }
}

export class KayKitResourceStoneChunksLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceStoneChunksLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Stone_Chunks_Large.fbx") }
}

export class KayKitResourceStoneChunksSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceStoneChunksSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Stone_Chunks_Small.fbx") }
}

export class KayKitResourceTextilesAFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceTextilesA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Textiles_A.fbx") }
}

export class KayKitResourceTextilesBFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceTextilesB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Textiles_B.fbx") }
}

export class KayKitResourceTextilesCFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceTextilesC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Textiles_C.fbx") }
}

export class KayKitResourceTextilesStackLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceTextilesStackLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Textiles_Stack_Large.fbx") }
}

export class KayKitResourceTextilesStackLargeColoredFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceTextilesStackLargeColored}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Textiles_Stack_Large_Colored.fbx") }
}

export class KayKitResourceTextilesStackSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceTextilesStackSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Textiles_Stack_Small.fbx") }
}

export class KayKitResourceWoodLogAFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodLogA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Log_A.fbx") }
}

export class KayKitResourceWoodLogBFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodLogB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Log_B.fbx") }
}

export class KayKitResourceWoodLogStackFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodLogStack}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Log_Stack.fbx") }
}

export class KayKitResourceWoodPlankAFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodPlankA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Plank_A.fbx") }
}

export class KayKitResourceWoodPlankBFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodPlankB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Plank_B.fbx") }
}

export class KayKitResourceWoodPlankCFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodPlankC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Plank_C.fbx") }
}

export class KayKitResourceWoodPlanksStackLargeFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodPlanksStackLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Planks_Stack_Large.fbx") }
}

export class KayKitResourceWoodPlanksStackMediumFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodPlanksStackMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Planks_Stack_Medium.fbx") }
}

export class KayKitResourceWoodPlanksStackSmallFab extends KayKitResourceFbxFab implements IAsset {
    get Id() {return Char.KayKitResourceWoodPlanksStackSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/resources/fbx/Wood_Planks_Stack_Small.fbx") }
}