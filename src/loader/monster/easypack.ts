import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class EasyMonsterPack extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string) { 
        super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.InitMesh(meshs)
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

        // const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        // this.size = bbox.getSize(new THREE.Vector3)
         this.size = new THREE.Vector3(2, 4, 2)
        return this.size 
    }
    InitMesh(meshs: THREE.Group) {
        meshs.castShadow = true
        meshs.receiveShadow = true

        meshs.traverse(child => {
            child.castShadow = true
            child.receiveShadow = true
        })
        const scale = .01 * 0.5
        meshs.scale.set(scale, scale, scale)
    }
}
/*
Frog.fbx
Rat.fbx
Snake.fbx
Snake_angry.fbx
Spider.fbx
Wasp.fbx
*/
export class EasypackFrogFab extends EasyMonsterPack implements IAsset {
    get Id() {return Char.CharAniEasypackFrog}
    constructor(loader: Loader) { super(loader, "assets/monster/easypack/Frog.fbx") }
}
export class EasypackRatFab extends EasyMonsterPack implements IAsset {
    get Id() {return Char.CharAniEasypackRat}
    constructor(loader: Loader) { super(loader, "assets/monster/easypack/Rat.fbx") }
}
export class EasypackSnakeFab extends EasyMonsterPack implements IAsset {
    get Id() {return Char.CharAniEasypackSnake}
    constructor(loader: Loader) { super(loader, "assets/monster/easypack/Snake.fbx") }
}
export class EasypackSnakeAngryFab extends EasyMonsterPack implements IAsset {
    get Id() {return Char.CharAniEasypackSnakeAngry}
    constructor(loader: Loader) { super(loader, "assets/monster/easypack/Snake_angry.fbx") }
}
export class EasypackSpiderFab extends EasyMonsterPack implements IAsset {
    get Id() {return Char.CharAniEasypackSpider}
    constructor(loader: Loader) { super(loader, "assets/monster/easypack/Spider.fbx") }
}
export class EasypackWaspFab extends EasyMonsterPack implements IAsset {
    get Id() {return Char.CharAniEasypackWasp}
    constructor(loader: Loader) { super(loader, "assets/monster/easypack/Wasp.fbx") }
}
export class EasypackSlimeFab extends EasyMonsterPack implements IAsset {
    get Id() {return Char.CharMonEasypackSlime}
    constructor(loader: Loader) { super(loader, "assets/monster/easypack/Slime.fbx") }
}