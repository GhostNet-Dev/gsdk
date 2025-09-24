import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class GolemFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CharMonGolem}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/golem.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = true
            })
            const scale = 0.4
            this.meshs.children[0].scale.set(scale, scale, scale)
            this.mixer = new THREE.AnimationMixer(gltf.scene)
            console.log(this.meshs)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "root|Idle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "root|Walk"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "root|Attack"))
            this.clips.set(Ani.Dying, gltf.animations.find((clip) => clip.name == "root|Death_2"))
            this.clips.set(Ani.MonHurt, gltf.animations.find((clip) => clip.name == "root|Damage"))
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x) * 3
        this.size.y = Math.ceil(this.size.y) * 5
        this.size.z = Math.ceil(this.size.z) * 2
        return this.size 
    }
}

export class BigGolemFab extends AssetModel implements IAsset {
    gltf?:GLTF
    scale = 0.02

    get Id() {return Char.CharMonBigGolem}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/big_golem.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            console.log(this.meshs)
            this.meshs.children[0].scale.set(this.scale, this.scale, this.scale)
            this.meshs.children[0].position.y = 3.7
            this.mixer = new THREE.AnimationMixer(gltf.scene)
            console.log(gltf.animations)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "metarig|0_Idle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "metarig|1_Walk"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "metarig|3_Attack"))
            this.clips.set(Ani.Dying, gltf.animations.find((clip) => clip.name == "metarig|5_Die"))

            this.GetSize(this.meshs)
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x) / 6
        this.size.y = Math.ceil(this.size.y) / 2.5
        this.size.z = Math.ceil(this.size.z) / 6
        return this.size 
    }
}