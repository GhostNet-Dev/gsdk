import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class Potato0Fab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.Potato0}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/plant/potato_0.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            const scale = 2
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0, 0, 0)
            this.meshs.rotation.set(0, 0, 0)
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size
        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x) * 2
        this.size.y = 3
        this.size.z = Math.ceil(this.size.z) * 2
        return this.size 
    }
}
export class Potato1Fab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.Potato1}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/plant/potato_1.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            const scale = 2
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0, 0, 0)
            this.meshs.rotation.set(0, 0, 0)
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size
        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.y = 3
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}
export class Potato2Fab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.Potato2}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/plant/potato_2.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            const scale = 2
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0, 0, 0)
            this.meshs.rotation.set(0, 0, 0)
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size
        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.y = 3
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}