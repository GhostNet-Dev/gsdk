import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { gui } from "@Glibs/helper/helper";

class GunFbxFab extends AssetModel {
    gltf?:GLTF
    muzzlePointObject = new THREE.Object3D(); // 총구 위치를 나타낼 Object3D
    constructor(loader: Loader, path: string, customFn = () => { }) { 
        super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.meshs.castShadow = true

            customFn?.()
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
        // Don't Use mesh

        if (this.size != undefined) return this.size
        const bbox = new THREE.Box3().setFromObject(this.meshs)
        this.size = bbox.getSize(new THREE.Vector3)
        this.size.x = Math.ceil(this.size.x)
        this.size.z = Math.ceil(this.size.z)
        return this.size 
    }
    GetBodyMeshId() { return "mixamorigRightHand" }
}

export class PistolFab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsPistol }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/guns/pistol.fbx", () => {
            if (!this.meshs) return

            const scale = 0.025
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0, 0.1, 0)
            this.meshs.rotation.set(3.5, -0.1, -1.6)

            this.muzzlePointObject.name = "muzzlePoint"
            this.muzzlePointObject.position.set(20, 8, 0)
            this.meshs.add(this.muzzlePointObject)

            // const debugGeometry = new THREE.SphereGeometry(1, 8, 8); // 아주 작은 구
            // const debugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // 녹색 와이어프레임
            // const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            // debugMesh.position.set(20, 8, 0)
            // const fp = gui.addFolder("tools")

            // this.CreateVectorGui(fp, debugMesh.position, "Pos", 0.1)
            // this.CreateVectorGui(fp, debugMesh.rotation, "Rot", 0.1)
            // this.CreateVectorGui(fp, debugMesh.scale, "Scale", 0.01)
            // this.meshs.add(debugMesh)
        })
    }
}
export class M4A1Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsM4A1 }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/guns/m4a1.fbx", () => {
            if (!this.meshs) return

            const scale = 0.025
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0, 0.1, 0)
            this.meshs.rotation.set(3.5, -0.1, -1.6)

            this.muzzlePointObject.name = "muzzlePoint"
            this.muzzlePointObject.position.set(68, 8.5, 0)
            this.meshs.add(this.muzzlePointObject)
        })
    }
}