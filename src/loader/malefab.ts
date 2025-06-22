import * as THREE from "three";
import { Loader } from "./loader";
import { AssetModel } from "./assetmodel";
import { IAsset } from "./iasset";
import { Ani, Bind, Char, ModelType } from "./assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import GUI from "lil-gui";


export class MaleFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CharHumanMale}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/male/male.gltf", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse((child: any) => {
                child.castShadow = true
                child.receiveShadow = false
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({ 
                        map: child.material.map,
                    })
                }
            })


            //this.meshs.scale.set(1, 1, 1)
            this.meshs.children[0].position.y = 0

            this.clips.set(Ani.Idle, gltf.animations[0])
            this.clips.set(Ani.Run, gltf.animations[1])
            this.clips.set(Ani.Jump, gltf.animations[2])
            this.clips.set(Ani.Punch, gltf.animations[3])
            this.clips.set(Ani.FightIdle, gltf.animations[4])
            this.clips.set(Ani.Dance0, gltf.animations[5])
           

            await this.LoadAnimation("assets/male/Shooting.fbx", Ani.Shooting)
            await this.LoadAnimation("assets/male/Standing 1H Magic Attack 01.fbx", Ani.MagicH1)
            await this.LoadAnimation("assets/male/Standing 2H Magic Attack 01.fbx", Ani.MagicH2)
            await this.LoadAnimation("assets/male/Standing 2H Magic Attack 01_.fbx", Ani.MagicH2)
            await this.LoadAnimation("assets/male/Sword And Shield Slash.fbx", Ani.Sword)
            await this.LoadAnimation("assets/male/Shooting.fbx", Ani.Shooting)
            await this.LoadAnimation("assets/male/Gunplay.fbx", Ani.Gunplay)
            await this.LoadAnimation("assets/male/Dying Backwards.fbx", Ani.Dying)
            await this.LoadAnimation("assets/male/Bouncing Fight Idle.fbx", Ani.FightIdle)
 
            await this.LoadAnimation("assets/female/PlantAPlant.fbx", Ani.PlantAPlant)
            await this.LoadAnimation("assets/female/PickFruit.fbx", Ani.PickFruit)
            await this.LoadAnimation("assets/female/PickFruit_tree.fbx", Ani.PickFruitTree)
            await this.LoadAnimation("assets/female/StandingMeleeAttackDownward.fbx", Ani.Hammering)
            await this.LoadAnimation("assets/female/Watering.fbx", Ani.Wartering)
        })
    }
    CreateVectorGui(f: GUI, v: THREE.Vector3 | THREE.Euler, name: string, step: number) {
        f.add(v, "x", -100, 100, step).listen().name(name + "X")
        f.add(v, "y", -100, 100, step).listen().name(name + "Y")
        f.add(v, "z", -100, 100, step).listen().name(name + "Z")
    }

    GetBodyMeshId(bind: Bind) {
        switch(bind) {
            case Bind.Hands_R: return "mixamorigRightHand";
            case Bind.Hands_L: return "mixamorigLeftHand";
        }
    }
    GetBox(mesh: THREE.Group) {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use this.meshs
        if (this.box == undefined) {
            const s = this.GetSize(mesh)
            this.box = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), this.boxMat)
        }

        const p = this.GetBoxPos(mesh)
        this.box.position.copy(p)
        this.box.rotation.copy(mesh.rotation)
        return new THREE.Box3().setFromObject(this.box)
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        this.size.y *= 4
        console.log(this.meshs, this.size)
        return this.size 
    }
}