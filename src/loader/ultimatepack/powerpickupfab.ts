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
            this.meshs.children[0].position.y += this.GetSize(this.meshs).y / 2
        })
    }
}
export class UltimatePAPCoinFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPCoin}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Coin.gltf") }
}
export class UltimatePAPGemBlueFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPGemBlue}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Gem_Blue.gltf") }
}
export class UltimatePAPGemGreenFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPGemGreen}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Gem_Green.gltf") }
}
export class UltimatePAPGemPinkFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPGemPink}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Gem_Pink.gltf") }
}
export class UltimatePAPHeartFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPHeart}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Heart.gltf") }
}
export class UltimatePAPHeartHalfFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPHeartHalf}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Heart_Half.gltf") }
}
export class UltimatePAPHeartOutlineFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPHeartOutline}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Heart_Outline.gltf") }
}
export class UltimatePAPKeyFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPKey}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Key.gltf") }
}
export class UltimatePAPStarFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPStar}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Star.gltf") }
}
export class UltimatePAPStarOutlineFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPStarOutline}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Star_Outline.gltf") }
}
export class UltimatePAPThunderFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimatePAPThunder}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/PowerupsAndPickups/Thunder.gltf") }
}
