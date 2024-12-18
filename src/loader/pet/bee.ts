import * as THREE from "three";
import { Loader } from "../loader";
import { Ani, AssetModel, Char, IAsset, ModelType } from "../assetmodel";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class BeeFab extends AssetModel implements IAsset {
    Gltf?:GLTF

    get Id() {return Char.Dog}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/animals/smiley_bee.glb", async (gltf: GLTF) => {
            this.Gltf = gltf
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
            const scale = 0.1
            this.info = { scale: scale }
            this.meshs.children[0].scale.set(scale, scale, scale)
            this.meshs.children[0].position.x = 1.68
            this.meshs.children[0].position.y = this.info.calY = 5
            this.meshs.children[0].rotateZ(Math.PI)
            this.mixer = new THREE.AnimationMixer(gltf.scene)
            console.log(gltf.animations)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "Scene"))
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
        this.size.x = Math.ceil(this.size.x)
        this.size.y = 3//Math.ceil(this.size.z)
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}