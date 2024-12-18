import * as THREE from "three";
import { Loader } from "./loader";
import { Ani, AssetModel, Bind, Char, IAsset, ModelType } from "./assetmodel";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import GUI from "lil-gui";


export class WizardFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.Wizard}

    constructor(loader: Loader) { 
        super(loader, ModelType.Fbx, "assets/wizard/lowpolywizard.fbx", async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true

            const tloader = new THREE.TextureLoader()
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
                if (child instanceof THREE.Mesh)
                    tloader.load("assets/wizard/AtlasColorV2.png", (texture) => {
                        child.material.map = texture
                        child.material.needsupdate = true
                        child.material = new THREE.MeshToonMaterial({ map: child.material.map })
                    })
            })
            const scale = .0025
            this.meshs.scale.set(scale, scale, scale)
            await this.LoadAnimation("assets/wizard/Old Man Idle.fbx", Ani.Idle)
            /*
            await this.LoadAnimation("assets/wizard/Running.fbx", Ani.Run)
            await this.LoadAnimation("assets/wizard/Jumping Up.fbx", Ani.Jump)
            await this.LoadAnimation("assets/wizard/Punch Combo.fbx", Ani.Punch)
            await this.LoadAnimation("assets/wizard/Fight Idle.fbx", Ani.FightIdle)
            await this.LoadAnimation("assets/wizard/Belly Dance.fbx", Ani.Dance0)
           

            await this.LoadAnimation("assets/wizard/Shooting.fbx", Ani.Shooting)
            await this.LoadAnimation("assets/wizard/Standing 1H Magic Attack 01.fbx", Ani.MagicH1)
            await this.LoadAnimation("assets/wizard/Standing 2H Magic Attack 01.fbx", Ani.MagicH2)
            await this.LoadAnimation("assets/wizard/Sword And Shield Slash.fbx", Ani.Sword)
            await this.LoadAnimation("assets/wizard/Gunplay.fbx", Ani.Shooting)
            await this.LoadAnimation("assets/wizard/Dying.fbx", Ani.Dying)
            await this.LoadAnimation("assets/wizard/Bouncing Fight Idle.fbx", Ani.FightIdle)
 
            await this.LoadAnimation("assets/wizard/Plant A Plant.fbx", Ani.PlantAPlant)
            await this.LoadAnimation("assets/wizard/Pick Fruit.fbx", Ani.PickFruit)
            await this.LoadAnimation("assets/wizard/Pick Fruit Tree.fbx", Ani.PickFruitTree)
            await this.LoadAnimation("assets/wizard/Standing Melee Attack Downward.fbx", Ani.Hammering)
            await this.LoadAnimation("assets/wizard/Watering.fbx", Ani.Wartering)
            */
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

        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = 1
        this.size.z = 1
        this.size.y = 4
        console.log(this.meshs, this.size)
        return this.size 
    }
}