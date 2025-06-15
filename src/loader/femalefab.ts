import * as THREE from "three";
import { Loader } from "./loader";
import { AssetModel } from "./assetmodel";
import { IAsset } from "./iasset";
import { Ani, Bind, Char, ModelType } from "./assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { gui } from "@Glibs/helper/helper";

export class FemaleFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CharHumanFemale}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/female/female2.gltf", async (gltf: GLTF) => {
        //super(loader, ModelType.Gltf, "assets/animals/Cow.gltf", async (gltf: GLTF) => {
        //super(loader, ModelType.Gltf, "assets/boy/child.gltf", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse((child: any) => {
                child.castShadow = true
                child.receiveShadow = false
                if (child.isMesh) {
                    child.material = new THREE.MeshToonMaterial({ map: child.material.map })
                }
            })
            this.mixer = new THREE.AnimationMixer(gltf.scene)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "Idle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "Running"))
            this.clips.set(Ani.Jump, gltf.animations.find((clip) => clip.name == "JumpingUp"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "PunchCombo"))
            this.clips.set(Ani.FightIdle, gltf.animations.find((clip) => clip.name == "BouncingFightIdle"))
            this.clips.set(Ani.Dying, gltf.animations.find((clip) => clip.name == "Dying"))
            this.clips.set(Ani.Sword, gltf.animations.find((clip) => clip.name == "Sword"))
            this.clips.set(Ani.Shooting, gltf.animations.find((clip) => clip.name == "Gunplay"))
            this.clips.set(Ani.MagicH1, gltf.animations.find((clip) => clip.name == "1HMagic"))
            this.clips.set(Ani.MagicH2, gltf.animations.find((clip) => clip.name == "2HMagic_1"))

            this.clips.set(Ani.PickFruit, gltf.animations.find((clip) => clip.name == "PickFruit"))
            this.clips.set(Ani.PickFruitTree, gltf.animations.find((clip) => clip.name == "PickFruit_tree"))
            this.clips.set(Ani.PlantAPlant, gltf.animations.find((clip) => clip.name == "PlantAPlant"))
            this.clips.set(Ani.Hammering, gltf.animations.find((clip) => clip.name == "StandingMeleeAttackDownward"))
            this.clips.set(Ani.Wartering, gltf.animations.find((clip) => clip.name == "Watering"))

            this.meshs.children[0].children[0].position.y = 0

            /*
            const right = this.meshs.getObjectByName("mixamorigRightHand")
            //const right = this.meshs
            const bat = await this.loader.FBXLoader.loadAsync("assets/weapon/guns/m4a1.fbx")
            const meshs = bat

            const scale = 0.025
            meshs.scale.set(scale, scale, scale)
            meshs.position.set(0.0, 0.1, 0)
            meshs.rotation.set(3.5, -0.1, -1.6)
            const fp = gui.addFolder("tools")
            fp.close()

            this.CreateVectorGui(fp, meshs.position, "Pos", 0.1)
            this.CreateVectorGui(fp, meshs.rotation, "Rot", 0.1)
            this.CreateVectorGui(fp, meshs.scale, "Scale", 0.01)
            right?.add(meshs)
            */
        })
    }
    
    GetBodyMeshId(bind: Bind) { 
        switch(bind) {
            case Bind.Hands_R: return "mixamorigRightHand";
            case Bind.Hands_L: return "mixamorigLeftHand";
        }
    }
    GetBox(mesh: THREE.Group) {
        if (this.meshs == undefined) this.meshs = mesh
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
        this.size.z = Math.ceil(this.size.z)
        this.size.x /= 3
        this.size.z /= 3
        console.log(this.meshs, this.size)
        return this.size 
    }
}