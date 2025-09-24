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
export class UltimateEnermyFab extends UltimatePack implements IAsset {
    get Id() {return Char.CharMonUltimateEnermy}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Enermies/Enermy.gltf") }
}

export class UltimateEnermyBeeFab extends UltimatePack implements IAsset {
    get Id() {return Char.CharMonUltimateEnermyBee}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Enermies/Bee.gltf") }
}
export class UltimateEnermyCrabFab extends UltimatePack implements IAsset {
    get Id() {return Char.CharMonUltimateEnermyCrab}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Enermies/Crab.gltf") }
}
export class UltimateEnermySkullFab extends UltimatePack implements IAsset {
    get Id() {return Char.CharMonUltimateEnermySkull}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Enermies/Skull.gltf") }
}