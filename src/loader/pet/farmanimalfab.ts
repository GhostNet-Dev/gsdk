import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


class FarmAnimalPack extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string) { 
        super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            this.meshs.scale.multiplyScalar(0.01)
            // const scale = 1
            // this.meshs.children[0].scale.set(scale, scale, scale)
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
        this.box.position.copy(p)
        return new THREE.Box3().setFromObject(this.box)
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        return this.size 
    }
}
export class FarmPetCowFab extends FarmAnimalPack implements IAsset {
    get Id() {return Char.CharAniFarmPetCow}
    constructor(loader: Loader) { super(loader, "assets/farmanimals/Cow.fbx") }
}
export class FarmPetHorseFab extends FarmAnimalPack implements IAsset {
    get Id() {return Char.CharAniFarmPetHorse}
    constructor(loader: Loader) { super(loader, "assets/farmanimals/Horse.fbx") }
}
export class FarmPetLlamaFab extends FarmAnimalPack implements IAsset {
    get Id() {return Char.CharAniFarmPetLlama}
    constructor(loader: Loader) { super(loader, "assets/farmanimals/Llama.fbx") }
}
export class FarmPetPigFab extends FarmAnimalPack implements IAsset {
    get Id() {return Char.CharAniFarmPetPig}
    constructor(loader: Loader) { super(loader, "assets/farmanimals/Pig.fbx") }
}
export class FarmPetPugFab extends FarmAnimalPack implements IAsset {
    get Id() {return Char.CharAniFarmPetPug}
    constructor(loader: Loader) { super(loader, "assets/farmanimals/Pug.fbx") }
}
export class FarmPetSheepFab extends FarmAnimalPack implements IAsset {
    get Id() {return Char.CharAniFarmPetSheep}
    constructor(loader: Loader) { super(loader, "assets/farmanimals/Sheep.fbx") }
}
export class FarmPetZebraFab extends FarmAnimalPack implements IAsset {
    get Id() {return Char.CharAniFarmPetZebra}
    constructor(loader: Loader) { super(loader, "assets/farmanimals/Zebra.fbx") }
}
