import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class ToiletFab extends AssetModel implements IAsset {
    id = Char.Toilet

    get Id() {return this.id}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/furniture/toilet.glb", (gltf: GLTF) => {
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
        this.size.x = Math.ceil(this.size.x)
        this.size.y = Math.ceil(this.size.y)
        this.size.z = Math.ceil(this.size.z)
        console.log(this.meshs, this.size)
        return this.size 
    }
}
export class SinkFab extends AssetModel implements IAsset {
    id = Char.Sink

    get Id() {return this.id}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/furniture/sink.glb", (gltf: GLTF) => {
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
        this.size.x = Math.ceil(this.size.x)
        this.size.y = Math.ceil(this.size.y)
        this.size.z = Math.ceil(this.size.z)
        console.log(this.meshs, this.size)
        return this.size 
    }
}
export class BathFab extends AssetModel implements IAsset {
    id = Char.Bath

    get Id() {return this.id}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/furniture/bath.glb", (gltf: GLTF) => {
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
            this.meshs.children[0].scale.set(1, scale, 1)
        })
    }
    
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size
        const bbox = new THREE.Box3().setFromObject(mesh)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.y = Math.ceil(this.size.y)
        this.size.z = Math.ceil(this.size.z)
        console.log(this.meshs, this.size)
        return this.size 
    }
}