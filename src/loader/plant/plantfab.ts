import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class AppleTreeFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.AppleTree}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/plant/low-ploy_tree.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            const scale = 1
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0, 0, 0)
            this.meshs.rotateY(-Math.PI / 2)
        })
    }
    
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size
        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}
export class CoconutTreeFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.CoconutTree}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/plant/coconut_tree.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            const scale = 1.2
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
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}