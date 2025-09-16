import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class ZombieFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CharMonZombie}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/monster/zombie.gltf", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.name = "zombie"
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse((child: any) => {
                child.castShadow = true
                child.receiveShadow = false
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({ map: child.material.map })
                }
            })
            const scale = 0.024
            this.meshs.children[0].scale.set(scale, scale, scale)
            this.meshs.children[0].position.set(0, 0, 0)
            this.mixer = new THREE.AnimationMixer(gltf.scene)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "ZombieIdle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "Walking"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "ZombieAttack"))
            this.clips.set(Ani.MonBiting, gltf.animations.find((clip) => clip.name == "ZombieBiting"))
            this.clips.set(Ani.Dying, gltf.animations.find((clip) => clip.name == "ZombieDying"))
            this.clips.set(Ani.MonScream, gltf.animations.find((clip) => clip.name == "ZombieScream"))

            await this.LoadAnimation("assets/monster/Zombie_Neck_Bite.fbx", Ani.MonBiteNeck)
            await this.LoadAnimation("assets/monster/Zombie_Agonizing.fbx", Ani.MonAgonizing)
            await this.LoadAnimation("assets/monster/Running_Crawl.fbx", Ani.MonRunningCrawl)
            
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
        /*
        const effector = this.meshs.getObjectByName("effector")
        if(effector != undefined) this.meshs.remove(effector)
        const bbox = new THREE.Box3().setFromObject(this.meshs)
        if(effector != undefined) this.meshs.add(effector)
        */

        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.y *= 1.1
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}