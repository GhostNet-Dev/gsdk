import * as THREE from "three";
import { Loader } from "../loader";
import { Ani, AssetModel, Char, IAsset, ModelType } from "../assetmodel";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class GolemFab extends AssetModel implements IAsset {
    Gltf?:GLTF

    get Id() {return Char.Golem}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/golem.glb", async (gltf: GLTF) => {
            this.Gltf = gltf
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
        this.size.x = Math.ceil(this.size.x) * 3
        this.size.y = Math.ceil(this.size.y) * 5
        this.size.z = Math.ceil(this.size.z) * 2
        return this.size 
    }
}

export class BigGolemFab extends AssetModel implements IAsset {
    Gltf?:GLTF
    scale = 0.02

    get Id() {return Char.BigGolem}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/big_golem.glb", async (gltf: GLTF) => {
            this.Gltf = gltf
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
        this.size.x = Math.ceil(this.size.x) / 6
        this.size.y = Math.ceil(this.size.y) / 2.5
        this.size.z = Math.ceil(this.size.z) / 6
        return this.size 
    }
}