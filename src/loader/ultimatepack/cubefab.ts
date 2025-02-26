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
            this.meshs.children[0].position.y += 1
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

        this.size = new THREE.Vector3(2, 2, 2)
        return this.size 
    }
}
export class UltimateCubeBricksFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateCubeBricks}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Cubes/Cube_Bricks.gltf") }
}
export class UltimateCubeCrateFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateCubeCrate}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Cubes/Cube_Crate.gltf") }
}
export class UltimateCubeDefaultFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateCubeDefault}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Cubes/Cube_Default.gltf") }
}
export class UltimateCubeDirtSingleFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateCubeDirtSingle}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Cubes/Cube_Dirt_Single.gltf") }
}
export class UltimateCubeExclamationFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateCubeExclamation}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Cubes/Cube_Exclamation.gltf") }
}
export class UltimateCubeGrassSingleFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateCubeGrassSingle}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Cubes/Cube_Grass_Single.gltf") }
}
export class UltimateCubeQuestionFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateCubeQuestion}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Cubes/Cube_Question.gltf") }
}
export class UltimateCubeSpikeFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateCubeSpike}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/Cubes/Cube_Spikes.gltf") }
}
