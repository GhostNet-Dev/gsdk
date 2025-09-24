import * as THREE from "three";
import { Loader } from "./loader";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { AssetModel } from "./assetmodel";
import { Ani, Char, ModelType } from "./assettypes";
import { IAsset } from "./iasset";

export class ArrowFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.Arrow}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/etc/directional_arrow.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true

            const scale = .3
            this.meshs.scale.set(scale, scale, scale)
            console.log(gltf.animations)
            this.clips.set(Ani.Idle, gltf.animations.find((clip) => clip.name == "CINEMA_4D_Main"))
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