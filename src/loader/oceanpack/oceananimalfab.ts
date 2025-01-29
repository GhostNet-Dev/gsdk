import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


class OceanAnimalPack extends AssetModel {
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
export class OceanDolphinFab extends OceanAnimalPack implements IAsset {
    get Id() {return Char.OceanDolphin}
    constructor(loader: Loader) { super(loader, "assets/oceans/animalpack/Dolphin.fbx") }
}


export class OceanFish1Fab extends OceanAnimalPack implements IAsset {
    get Id() {return Char.OceanFish1}
    constructor(loader: Loader) { super(loader, "assets/oceans/animalpack/Fish1.fbx") }
}


export class OceanFish2Fab extends OceanAnimalPack implements IAsset {
    get Id() {return Char.OceanFish2}
    constructor(loader: Loader) { super(loader, "assets/oceans/animalpack/Fish2.fbx") }
}


export class OceanFish3Fab extends OceanAnimalPack implements IAsset {
    get Id() {return Char.OceanFish3}
    constructor(loader: Loader) { super(loader, "assets/oceans/animalpack/Fish3.fbx") }
}


export class OceanMantaRayFab extends OceanAnimalPack implements IAsset {
    get Id() {return Char.OceanMantaRay}
    constructor(loader: Loader) { super(loader, "assets/oceans/animalpack/Mantaray.fbx") }
}


export class OceanSharkFab extends OceanAnimalPack implements IAsset {
    get Id() {return Char.OceanShark}
    constructor(loader: Loader) { super(loader, "assets/oceans/animalpack/Shark.fbx") }
}


export class OceanWhaleFab extends OceanAnimalPack implements IAsset {
    get Id() {return Char.OceanWhale}
    constructor(loader: Loader) { super(loader, "assets/oceans/animalpack/Whale.fbx") }
}
