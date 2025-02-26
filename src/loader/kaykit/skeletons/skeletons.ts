import * as THREE from "three";
import { Loader } from "../../loader";
import { AssetModel } from "../../assetmodel";
import { IAsset } from "../../iasset";
import { Ani, Char, ModelType } from "../../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class KayKitSkeletons extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string) { 
        super(loader, ModelType.Gltf, path, async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = 1
            this.meshs.children[0].scale.set(scale, scale, scale)
            console.log(this.meshs)
            console.log(gltf.animations)

            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "Idle"))
            this.clips.set(Ani.Run, gltf.animations.find((clip) => clip.name == "Running_A"))
            this.clips.set(Ani.Jump, gltf.animations.find((clip) => clip.name == "Jump_Full_Long"))
            this.clips.set(Ani.Punch, gltf.animations.find((clip) => clip.name == "1H_Melee_Attack_Chop"))
            this.clips.set(Ani.FightIdle, gltf.animations.find((clip) => clip.name == "Idle_Combat"))
            this.clips.set(Ani.Dying, gltf.animations.find((clip) => clip.name == "Death_A"))
            this.clips.set(Ani.Sword, gltf.animations.find((clip) => clip.name == "1H_Melee_Attack_Chop"))
            this.clips.set(Ani.Shooting, gltf.animations.find((clip) => clip.name == "1H_Ranged_Shoot"))
            this.clips.set(Ani.MagicH1, gltf.animations.find((clip) => clip.name == "Spellcast_Shoot"))
            this.clips.set(Ani.MagicH2, gltf.animations.find((clip) => clip.name == "Spellcast_Long"))
            this.clips.set(Ani.Spellcasting, gltf.animations.find((clip) => clip.name == "spellcasting"))
            this.clips.set(Ani.Hit, gltf.animations.find((clip) => clip.name == "Hit_A"))
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

        //const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        //this.size = bbox.getSize(new THREE.Vector3)
        this.size = new THREE.Vector3(2, 4, 2)
        return this.size 
    }
}
export class KayKitSkeletonMageFab extends KayKitSkeletons implements IAsset {
    get Id() {return Char.CharMonKayKitSkeletonMage}
    constructor(loader: Loader) { super(loader, "assets/kaykit/skeletons/Skeleton_Mage.glb") }
}
export class KayKitSkeletonWarriorFab extends KayKitSkeletons implements IAsset {
    get Id() {return Char.CharMonKayKitSkeletonWarrior}
    constructor(loader: Loader) { super(loader, "assets/kaykit/skeletons/Skeleton_Warrior.glb") }
}
export class KayKitSkeletonRogueFab extends KayKitSkeletons implements IAsset {
    get Id() {return Char.CharMonKayKitSkeletonRogue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/skeletons/Skeleton_Rogue.glb") }
}
export class KayKitSkeletonMinionFab extends KayKitSkeletons implements IAsset {
    get Id() {return Char.CharMonKayKitSkeletonMinion}
    constructor(loader: Loader) { super(loader, "assets/kaykit/skeletons/Skeleton_Minion.glb") }
}