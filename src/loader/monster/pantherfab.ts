import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


class Pantherpack extends AssetModel {
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
            this.meshs.scale.set(scale, scale, scale)

            this.mixer = new THREE.AnimationMixer(gltf.scene)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "idle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "run"))
            this.clips.set(Ani.Jump, gltf.animations.find((clip) => clip.name == "jump regular"))
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

        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        return this.size 
    }
}
/*
panther_black_and_white_animated.glb
panther_blue_animated.glb
panther_red_animated.glb
*/

export class PantherBlackWhiteFab extends Pantherpack implements IAsset {
    get Id() {return Char.PantherBlackWhite}
    constructor(loader: Loader) { super(loader, "assets/monster/panther_black_and_white_animated.glb") }
}
export class PantherBlueFab extends Pantherpack implements IAsset {
    get Id() {return Char.PantherBlue}
    constructor(loader: Loader) { super(loader, "assets/monster/panther_blue_animated.glb") }
}
export class PantherRedFab extends Pantherpack implements IAsset {
    get Id() {return Char.PantherRed}
    constructor(loader: Loader) { super(loader, "assets/monster/panther_red_animated.glb") }
}
