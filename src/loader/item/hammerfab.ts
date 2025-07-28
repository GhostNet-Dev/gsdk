import * as THREE from "three";
import { AssetModel } from "../assetmodel";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Loader } from "../loader";
import { Char, ModelType } from "../assettypes";
import { Bind } from "@Glibs/types/assettypes";
import { IAsset } from "@Glibs/interface/iasset";
import { gui } from "@Glibs/helper/helper";

class HammerFbxFab extends AssetModel {
    gltf?:GLTF
    localTipAOffset = new THREE.Object3D()
    localTipBOffset = new THREE.Object3D()
    constructor(loader: Loader, path: string, customFn = () => { }) { 
        super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.localTipAOffset.name = "localTipAOffset"
            this.localTipBOffset.name = "localTipBOffset"
            this.InitMesh(meshs)
            customFn?.()

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
        })
    }
    GetBodyMeshId(bind: Bind) {
        switch(bind) {
            case Bind.Hands_R: return "mixamorigRightHand";
            case Bind.Hands_L: return "mixamorigLeftHand";
        }
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
        console.log(this.meshs, this.size)
        return this.size 
    }
    InitMesh(meshs: THREE.Group) {
        meshs.castShadow = true
        meshs.receiveShadow = true

        const tloader = new THREE.TextureLoader()
        meshs.traverse(child => {
            child.castShadow = true
            child.receiveShadow = true
            if (child instanceof THREE.Mesh)
                tloader.load("assets/weapon/swords/texture/Texture_MAp_sword.png", (texture) => {
                    child.material.map = texture
                    child.material.needsupdate = true
                    child.material = new THREE.MeshToonMaterial({ map: child.material.map })
                })
        })
        const scale = 0.03
        meshs.scale.set(scale, scale, scale)
        meshs.position.set(-0.5, 0.1, 0.1)
        meshs.rotation.set(3.5, -0.1, -1.6)
    }
}

export class ItemHammerHammer1Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer1}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_1.fbx") }
}

export class ItemHammerHammer10Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer10}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_10.fbx") }
}

export class ItemHammerHammer11Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer11}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_11.fbx") }
}

export class ItemHammerHammer12Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer12}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_12.fbx") }
}

export class ItemHammerHammer13Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer13}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_13.fbx") }
}

export class ItemHammerHammer14Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer14}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_14.fbx") }
}

export class ItemHammerHammer15Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer15}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_15.fbx") }
}

export class ItemHammerHammer16Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer16}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_16.fbx") }
}

export class ItemHammerHammer17Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer17}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_17.fbx") }
}

export class ItemHammerHammer18Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer18}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_18.fbx") }
}

export class ItemHammerHammer19Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer19}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_19.fbx") }
}

export class ItemHammerHammer2Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer2}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_2.fbx") }
}

export class ItemHammerHammer20Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer20}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_20.fbx") }
}

export class ItemHammerHammer21Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer21}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_21.fbx") }
}

export class ItemHammerHammer22Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer22}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_22.fbx") }
}

export class ItemHammerHammer23Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer23}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_23.fbx") }
}

export class ItemHammerHammer24Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer24}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_24.fbx") }
}

export class ItemHammerHammer3Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer3}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_3.fbx") }
}

export class ItemHammerHammer4Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer4}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_4.fbx") }
}

export class ItemHammerHammer5Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer5}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_5.fbx") }
}

export class ItemHammerHammer6Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer6}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_6.fbx") }
}

export class ItemHammerHammer7Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer7}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_7.fbx") }
}

export class ItemHammerHammer8Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer8}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_8.fbx") }
}

export class ItemHammerHammer9Fab extends HammerFbxFab implements IAsset {
    get Id() {return Char.ItemHammerHammer9}
    constructor(loader: Loader) { super(loader, "assets/weapon/hammers/fbx/hammer_9.fbx") }
}
