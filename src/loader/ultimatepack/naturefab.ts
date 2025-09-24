import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


class UltimatePack extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string) { 
        super(loader, ModelType.Gltf, path, async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = 1
            this.meshs.children[0].scale.set(scale, scale, scale)
        })
    }
}
export class UltimateNatureBushFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureBush}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Bush.gltf") }
}
export class UltimateNatureBushFruitFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureBushFruit}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Bush_Fruit.gltf") }
}
export class UltimateNatureCloud1Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureCloud1}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Cloud_1.gltf") }
}
export class UltimateNatureCloud2Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureCloud2}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Cloud_2.gltf") }
}
export class UltimateNatureCloud3Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureCloud3}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Cloud_3.gltf") }
}
export class UltimateNatureFruitFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureFruit}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Fruit.gltf") }
}
export class UltimateNatureGrass1Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureGrass1}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Grass_1.gltf") }
}
export class UltimateNatureGrass2Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureGrass2}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Grass_2.gltf") }
}
export class UltimateNatureGrass3Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureGrass3}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Grass_3.gltf") }
}
export class UltimateNatureRock1Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureRock1}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Rock_1.gltf") }
}
export class UltimateNatureRock2Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureRock2}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Rock_2.gltf") }
}
export class UltimateNatureRockPlatforms1Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureRockPlatforms1}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/RockPlatforms_1.gltf") }
}
export class UltimateNatureRockPlatforms2Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureRockPlatforms2}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/RockPlatforms_2.gltf") }
}
export class UltimateNatureRockPlatforms3Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureRockPlatforms3}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/RockPlatforms_3.gltf") }
}
export class UltimateNatureRockPlatformsLargeFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureRockPlatformsLarge}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/RockPlatforms_Large.gltf") }
}
export class UltimateNatureRockPlatformsMediumFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureRockPlatformsMedium}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/RockPlatforms_Medium.gltf") }
}
export class UltimateNatureRockPlatformTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureRockPlatformTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/RockPlatform_Tall.gltf") }
}
export class UltimateNatureTreeFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureTree}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Tree.gltf") }
}
export class UltimateNatureTreeFruitFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateNatureTreeFruit}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Nature/Tree_Fruit.gltf") }
}
