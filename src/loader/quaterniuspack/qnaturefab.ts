import { AssetModel } from "../assetmodel"
import * as THREE from "three";
import { Loader } from "../loader";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class QuaterniusNaturePack extends AssetModel {
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
    
    GetBodyMeshId() { return "mixamorigRightHand" }
    GetBox(mesh: THREE.Group) {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.box == undefined) {
            const s = this.GetSize(mesh)
            this.box = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), this.boxMat)
        }

        const p = this.GetBoxPos(mesh)
        this.box.position.set(p.x, p.y, p.z)
        return new THREE.Box3().setFromObject(this.box)
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        return this.size 
    }
}
export class QuaterniusNatureBushCommonFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureBushCommon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Bush_Common.gltf") }
}

export class QuaterniusNatureBushCommonFlowersFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureBushCommonFlowers}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Bush_Common_Flowers.gltf") }
}

export class QuaterniusNatureClover1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureClover1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Clover_1.gltf") }
}

export class QuaterniusNatureClover2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureClover2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Clover_2.gltf") }
}

export class QuaterniusNatureCommontree1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureCommontree1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/CommonTree_1.gltf") }
}

export class QuaterniusNatureCommontree2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureCommontree2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/CommonTree_2.gltf") }
}

export class QuaterniusNatureCommontree3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureCommontree3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/CommonTree_3.gltf") }
}

export class QuaterniusNatureCommontree4Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureCommontree4}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/CommonTree_4.gltf") }
}

export class QuaterniusNatureCommontree5Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureCommontree5}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/CommonTree_5.gltf") }
}

export class QuaterniusNatureDeadtree1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureDeadtree1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/DeadTree_1.gltf") }
}

export class QuaterniusNatureDeadtree2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureDeadtree2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/DeadTree_2.gltf") }
}

export class QuaterniusNatureDeadtree3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureDeadtree3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/DeadTree_3.gltf") }
}

export class QuaterniusNatureDeadtree4Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureDeadtree4}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/DeadTree_4.gltf") }
}

export class QuaterniusNatureDeadtree5Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureDeadtree5}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/DeadTree_5.gltf") }
}

export class QuaterniusNatureFern1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureFern1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Fern_1.gltf") }
}

export class QuaterniusNatureFlower3GroupFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureFlower3Group}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Flower_3_Group.gltf") }
}

export class QuaterniusNatureFlower3SingleFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureFlower3Single}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Flower_3_Single.gltf") }
}

export class QuaterniusNatureFlower4GroupFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureFlower4Group}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Flower_4_Group.gltf") }
}

export class QuaterniusNatureFlower4SingleFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureFlower4Single}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Flower_4_Single.gltf") }
}

export class QuaterniusNatureGrassCommonShortFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureGrassCommonShort}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Grass_Common_Short.gltf") }
}

export class QuaterniusNatureGrassCommonTallFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureGrassCommonTall}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Grass_Common_Tall.gltf") }
}

export class QuaterniusNatureGrassWispyShortFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureGrassWispyShort}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Grass_Wispy_Short.gltf") }
}

export class QuaterniusNatureGrassWispyTallFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureGrassWispyTall}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Grass_Wispy_Tall.gltf") }
}

export class QuaterniusNatureMushroomCommonFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureMushroomCommon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Mushroom_Common.gltf") }
}

export class QuaterniusNatureMushroomLaetiporusFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureMushroomLaetiporus}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Mushroom_Laetiporus.gltf") }
}

export class QuaterniusNaturePebbleRound1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleRound1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Round_1.gltf") }
}

export class QuaterniusNaturePebbleRound2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleRound2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Round_2.gltf") }
}

export class QuaterniusNaturePebbleRound3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleRound3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Round_3.gltf") }
}

export class QuaterniusNaturePebbleRound4Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleRound4}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Round_4.gltf") }
}

export class QuaterniusNaturePebbleRound5Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleRound5}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Round_5.gltf") }
}

export class QuaterniusNaturePebbleSquare1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleSquare1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Square_1.gltf") }
}

export class QuaterniusNaturePebbleSquare2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleSquare2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Square_2.gltf") }
}

export class QuaterniusNaturePebbleSquare3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleSquare3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Square_3.gltf") }
}

export class QuaterniusNaturePebbleSquare4Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleSquare4}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Square_4.gltf") }
}

export class QuaterniusNaturePebbleSquare5Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleSquare5}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Square_5.gltf") }
}

export class QuaterniusNaturePebbleSquare6Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePebbleSquare6}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pebble_Square_6.gltf") }
}

export class QuaterniusNaturePetal1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePetal1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Petal_1.gltf") }
}

export class QuaterniusNaturePetal2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePetal2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Petal_2.gltf") }
}

export class QuaterniusNaturePetal3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePetal3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Petal_3.gltf") }
}

export class QuaterniusNaturePetal4Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePetal4}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Petal_4.gltf") }
}

export class QuaterniusNaturePetal5Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePetal5}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Petal_5.gltf") }
}

export class QuaterniusNaturePine1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePine1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pine_1.gltf") }
}

export class QuaterniusNaturePine2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePine2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pine_2.gltf") }
}

export class QuaterniusNaturePine3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePine3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pine_3.gltf") }
}

export class QuaterniusNaturePine4Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePine4}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pine_4.gltf") }
}

export class QuaterniusNaturePine5Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePine5}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Pine_5.gltf") }
}

export class QuaterniusNaturePlant1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePlant1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Plant_1.gltf") }
}

export class QuaterniusNaturePlant1BigFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePlant1Big}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Plant_1_Big.gltf") }
}

export class QuaterniusNaturePlant7Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePlant7}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Plant_7.gltf") }
}

export class QuaterniusNaturePlant7BigFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNaturePlant7Big}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Plant_7_Big.gltf") }
}

export class QuaterniusNatureRockpathRoundSmall1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathRoundSmall1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Round_Small_1.gltf") }
}

export class QuaterniusNatureRockpathRoundSmall2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathRoundSmall2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Round_Small_2.gltf") }
}

export class QuaterniusNatureRockpathRoundSmall3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathRoundSmall3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Round_Small_3.gltf") }
}

export class QuaterniusNatureRockpathRoundThinFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathRoundThin}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Round_Thin.gltf") }
}

export class QuaterniusNatureRockpathRoundWideFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathRoundWide}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Round_Wide.gltf") }
}

export class QuaterniusNatureRockpathSquareSmall1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathSquareSmall1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Square_Small_1.gltf") }
}

export class QuaterniusNatureRockpathSquareSmall2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathSquareSmall2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Square_Small_2.gltf") }
}

export class QuaterniusNatureRockpathSquareSmall3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathSquareSmall3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Square_Small_3.gltf") }
}

export class QuaterniusNatureRockpathSquareThinFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathSquareThin}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Square_Thin.gltf") }
}

export class QuaterniusNatureRockpathSquareWideFab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockpathSquareWide}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/RockPath_Square_Wide.gltf") }
}

export class QuaterniusNatureRockMedium1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockMedium1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Rock_Medium_1.gltf") }
}

export class QuaterniusNatureRockMedium2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockMedium2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Rock_Medium_2.gltf") }
}

export class QuaterniusNatureRockMedium3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureRockMedium3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/Rock_Medium_3.gltf") }
}

export class QuaterniusNatureTwistedtree1Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureTwistedtree1}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/TwistedTree_1.gltf") }
}

export class QuaterniusNatureTwistedtree2Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureTwistedtree2}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/TwistedTree_2.gltf") }
}

export class QuaterniusNatureTwistedtree3Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureTwistedtree3}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/TwistedTree_3.gltf") }
}

export class QuaterniusNatureTwistedtree4Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureTwistedtree4}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/TwistedTree_4.gltf") }
}

export class QuaterniusNatureTwistedtree5Fab extends QuaterniusNaturePack implements IAsset {
    get Id() {return Char.QuaterniusNatureTwistedtree5}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/stylized_nature_megakit/glTF/TwistedTree_5.gltf") }
}