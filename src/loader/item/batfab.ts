import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class BatFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.ItemsBat}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/weapon/bat.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true

            const scale = 0.3
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0.1, 0.2, -0.1)
            this.meshs.rotation.set(3, -0.5, -1.8)
        })
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        // Don't Use mesh

        if (this.size != undefined) return this.size
        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}