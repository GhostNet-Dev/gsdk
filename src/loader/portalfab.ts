import * as THREE from "three";
import { Loader } from "./loader";
import { AssetModel } from "./assetmodel";
import { IAsset } from "./iasset";
import { Char, ModelType } from "./assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


export class PortalFab extends AssetModel implements IAsset {
    get Id() {return Char.Portal}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/custom_island/sand_portal.glb", (gltf: GLTF) => {
            this.meshs = gltf.scene
            this.meshs.scale.set(2.5, 2.5, 2.5)
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            this.meshs.children[0].position.y += .8
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size
        const bbox = new THREE.Box3().setFromObject(mesh)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        console.log(this.meshs, this.size)
        return this.size 
    }
}