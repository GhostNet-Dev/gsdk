import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class CrabFab extends AssetModel implements IAsset {
    Gltf?:GLTF

    get Id() {return Char.CrabMon}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/crab_monster_animated.glb", async (gltf: GLTF) => {
            this.Gltf = gltf
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
            console.log(gltf.animations)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "idle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "walk"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "attack"))
            this.clips.set(Ani.Dying, gltf.animations.find((clip) => clip.name == "death"))
            this.clips.set(Ani.MonHurt, gltf.animations.find((clip) => clip.name == "hurt"))
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
        this.size.x = Math.ceil(this.size.x)
        this.size.y = 3.5
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}