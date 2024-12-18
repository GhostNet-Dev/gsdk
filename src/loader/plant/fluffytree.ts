import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel, Char, IAsset, ModelType } from "../assetmodel";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export class FluffyTreeFab extends AssetModel implements IAsset {
    gltf?:GLTF

    get Id() {return Char.Grass}

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/plant/fluffytree.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            const scale = 1
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0, 0, 0)
        })
    }
    GetBodyMeshId() { return "mixamorigRightHand" }
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
        // Don't Use mesh

        if (this.size != undefined) return this.size
        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
}