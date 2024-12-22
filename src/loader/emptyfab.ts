import * as THREE from "three";
import { Loader } from "./loader";
import { AssetModel } from "./assetmodel";
import { IAsset } from "./iasset";
import { Char, ModelType } from "./assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


export class EmptyFab extends AssetModel implements IAsset {
    id = Char.Empty

    get Id() {return this.id}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/custom_island/empty.glb", (gltf: GLTF) => {
            this.meshs = gltf.scene
        })
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
        if (this.size) return this.size
        const bbox = new THREE.Box3().setFromObject(mesh)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x - 2)
        this.size.y = Math.ceil(this.size.y - 3)
        this.size.z = Math.ceil(this.size.z - 1)
        return this.size 
    }

    GetBodyMeshId() { return "mixamorigRightHand" }
}