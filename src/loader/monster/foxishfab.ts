import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class FoxishFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CharAniFoxish}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/fox-ish_arctic_animated.glb", async (gltf: GLTF) => {
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
            console.log(gltf.animations)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "idle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "walk"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "attack"))
            this.clips.set(Ani.Dying, gltf.animations.find((clip) => clip.name == "death"))
            this.clips.set(Ani.MonHurt, gltf.animations.find((clip) => clip.name == "hurt"))
        })
    }
}