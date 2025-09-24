import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { gui } from "@Glibs/helper/helper";

class GunFab extends AssetModel {
    gltf?:GLTF
    muzzlePointObject = new THREE.Object3D(); // 총구 위치를 나타낼 Object3D
    constructor(loader: Loader, path: string, customFn = () => { }) { 
        super(loader, ModelType.Gltf, path, async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true

            customFn?.()
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

export class OldGunFab extends GunFab implements IAsset {
    get Id() { return Char.ItemsGun }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/gun.glb", () => {
            if (!this.meshs) return

            const scale = 0.05
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0.2, 0.8, 0.2)
            this.meshs.rotation.set(3.5, -0.1, -1.6)

            this.muzzlePointObject.name = "muzzlePoint"
            this.muzzlePointObject.position.set(13, 0.5, 0)
            this.meshs.add(this.muzzlePointObject)

            // const debugGeometry = new THREE.SphereGeometry(1, 8, 8); // 아주 작은 구
            // const debugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // 녹색 와이어프레임
            // const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            // debugMesh.position.set(13, 0.5, 0)
            // const fp = gui.addFolder("tools")

            // this.CreateVectorGui(fp, debugMesh.position, "Pos", 0.1)
            // this.CreateVectorGui(fp, debugMesh.rotation, "Rot", 0.1)
            // this.CreateVectorGui(fp, debugMesh.scale, "Scale", 0.01)
            // this.meshs.add(debugMesh)
        })
    }
}
