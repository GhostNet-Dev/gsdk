import * as THREE from "three";
import { Loader } from "../loader";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { AssetModel } from "../assetmodel";
import { Char, ModelType } from "../assettypes";


export class TreeFab extends AssetModel {
    get Id() {return Char.Tree}
    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/custom_island/tree.glb", (gltf: GLTF) => {
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size
        const bbox = new THREE.Box3().setFromObject(mesh)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
    GetBoxPos(mesh: THREE.Group) {
        const v = mesh.position
        const s = this.GetSize(mesh)
        const ret = new THREE.Vector3(v.x, v.y + s.y / 2, v.z)
        return ret
    }
}

export class DeadTree2Fab extends AssetModel {
    get Id() {return Char.Tree}
    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/plant/dead_tree.glb", (gltf: GLTF) => {
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = 0.005
            this.meshs.scale.set(scale, scale, scale)
        })
    }
    
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size
        const bbox = new THREE.Box3().setFromObject(mesh)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
    GetBoxPos(mesh: THREE.Group) {
        const v = mesh.position
        const s = this.GetSize(mesh)
        const ret = new THREE.Vector3(v.x, v.y + s.y / 2, v.z)
        return ret
    }
}