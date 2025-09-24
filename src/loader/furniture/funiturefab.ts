import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class ClosetFab extends AssetModel implements IAsset {
    id = Char.Closet

    get Id() {return this.id}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/furniture/closet.glb", (gltf: GLTF) => {
            this.meshs = new THREE.Group()
            this.meshs.add(gltf.scene)
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = .8
            this.meshs.children[0].rotateY(Math.PI)
            this.meshs.children[0].scale.set(scale - .1, scale - .1, scale)
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size
        const bbox = new THREE.Box3().setFromObject(mesh)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.y = Math.ceil(this.size.y) - .5
        this.size.z = Math.ceil(this.size.z) - 1
        console.log(this.meshs, this.size)
        return this.size 
    }
}
export class DeskFab extends AssetModel implements IAsset {
    id = Char.Desk

    get Id() {return this.id}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/furniture/desk.glb", (gltf: GLTF) => {
            this.meshs = new THREE.Group()
            this.meshs.add(gltf.scene)
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = .8
            this.meshs.children[0].rotateY(Math.PI)
            this.meshs.children[0].scale.set(scale, scale, scale)
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size
        const bbox = new THREE.Box3().setFromObject(mesh)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x) - 1.5
        this.size.y = Math.ceil(this.size.y)
        this.size.z = Math.ceil(this.size.z)
        console.log(this.meshs, this.size)
        return this.size 
    }
}
export class BedFab extends AssetModel implements IAsset {
    id = Char.Bed

    get Id() {return this.id}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/furniture/bed.glb", (gltf: GLTF) => {
            this.meshs = new THREE.Group()
            this.meshs.add(gltf.scene)
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = .8
            this.meshs.children[0].rotateY(Math.PI)
            this.meshs.children[0].scale.set(0.96, scale, scale)
            //this.meshs.children[0].position.z += 0.34
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size
        const bbox = new THREE.Box3().setFromObject(mesh)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = 4//Math.ceil(this.size.x) - 1.5
        this.size.y = Math.ceil(this.size.y)
        this.size.z = Math.ceil(this.size.z)
        console.log(this.meshs, this.size)
        return this.size 
    }
}