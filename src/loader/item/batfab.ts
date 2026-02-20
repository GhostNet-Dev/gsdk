import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { gui } from "@Glibs/helper/helper";

export class BatFab extends AssetModel implements IAsset {
    gltf?:GLTF
    get Id() {return Char.ItemsBat}
    localTipAOffset = new THREE.Object3D()
    localTipBOffset = new THREE.Object3D()

    constructor(loader: Loader) { 
        super(loader, ModelType.Gltf, "assets/weapon/bat.glb", async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.localTipAOffset.name = "localTipAOffset"
            this.localTipBOffset.name = "localTipBOffset"

            const scale = 0.3
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0.1, 0.2, -0.1)
            this.meshs.rotation.set(3, -0.5, -1.8)

            // const axesHelper = new THREE.AxesHelper(20); // 축의 길이 (조절 가능)
            // this.localTipAOffset.add(axesHelper);
            // let fp = gui.addFolder("tools")

            // let debugMesh = this.localTipAOffset
            // this.CreateVectorGui(fp, debugMesh.position, "Pos", 0.1)
            // this.CreateVectorGui(fp, debugMesh.rotation, "Rot", 0.1)
            // this.CreateVectorGui(fp, debugMesh.scale, "Scale", 0.01)

            // const axesHelper2 = new THREE.AxesHelper(20); // 축의 길이 (조절 가능)
            // this.localTipBOffset.add(axesHelper2);

            // debugMesh = this.localTipBOffset
            // this.CreateVectorGui(fp, debugMesh.position, "PosB", 0.1)
            // this.CreateVectorGui(fp, debugMesh.rotation, "RotB", 0.1)
            // this.CreateVectorGui(fp, debugMesh.scale, "ScaleB", 0.01)

            this.meshs.add(this.localTipAOffset)
            this.meshs.add(this.localTipBOffset)
            this.localTipAOffset.position.set(0, 0, 0)
            this.localTipBOffset.position.set(0, 7, 0)
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