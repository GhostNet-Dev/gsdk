import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class BatPigFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CharMonBatPig}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/bat_pig.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = 0.01
            this.meshs.children[0].scale.set(scale, scale, scale)
            this.mixer = new THREE.AnimationMixer(gltf.scene)
            console.log(gltf.animations)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "Armature|Idle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "Armature|Walk"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "Armature|Desh"))
            this.clips.set(Ani.MonBiting, gltf.animations.find((clip) => clip.name == "Armature|Shoot"))
            this.clips.set(Ani.MonScream, gltf.animations.find((clip) => clip.name == "Pig Enemy|Desh"))
            this.meshs.children[0].position.y = 1
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        /*
        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        */
        this.size = new THREE.Vector3(4, 3, 2)
        return this.size 
    }
}