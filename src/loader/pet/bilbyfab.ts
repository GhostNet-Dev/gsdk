import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class BilbyFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CharAniBilby}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/bilby_animated.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = 2
            this.meshs.scale.set(scale, scale, scale)
            this.mixer = new THREE.AnimationMixer(gltf.scene)
            console.log(gltf.animations)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "Bilby_idleSit"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "Bilby_run"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "Bilby_atk1_bite"))
            this.clips.set(Ani.MonBiting, gltf.animations.find((clip) => clip.name == "Bilby_atk2_tail"))
            this.clips.set(Ani.Jump, gltf.animations.find((clip) => clip.name == "Bilby_jump"))
            this.clips.set(Ani.MonScream, gltf.animations.find((clip) => clip.name == "Bilby_smell"))
        })
    }
    
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.y = 1//Math.ceil(this.size.z)
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}