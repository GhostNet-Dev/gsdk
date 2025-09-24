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
    casingPointObject = new THREE.Object3D();

    constructor(loader: Loader, path: string, customFn = () => { }) { 
        super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.meshs.castShadow = true

            const scale = 0.025
            this.meshs.scale.set(scale, scale, scale)
            this.meshs.position.set(0, 0.1, 0)
            this.meshs.rotation.set(3.5, -0.1, -1.6)

            this.muzzlePointObject.name = "muzzlePoint"
            this.muzzlePointObject.position.set(68, 8.5, 0)

            this.casingPointObject.name = "casingEjectionPoint"
            customFn?.()


            // const axesHelper = new THREE.AxesHelper(20); // 축의 길이 (조절 가능)
            // this.casingPointObject.add(axesHelper);
            // const fp = gui.addFolder("tools")

            // let debugMesh = this.casingPointObject
            // this.CreateVectorGui(fp, debugMesh.position, "Pos", 0.1)
            // this.CreateVectorGui(fp, debugMesh.rotation, "Rot", 0.1)
            // this.CreateVectorGui(fp, debugMesh.scale, "Scale", 0.01)

            // const axesHelper2 = new THREE.AxesHelper(20); // 축의 길이 (조절 가능)
            // this.muzzlePointObject.add(axesHelper2);

            // debugMesh = this.muzzlePointObject
            // this.CreateVectorGui(fp, debugMesh.position, "_Pos", 0.1)
            // this.CreateVectorGui(fp, debugMesh.rotation, "_Rot", 0.1)
            // this.CreateVectorGui(fp, debugMesh.scale, "_Scale", 0.01)
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
    m16series(meshs: THREE.Group) {
        meshs.scale.set(g_scale, g_scale, g_scale) 
        meshs.position.set(0, 0.71, 0.2)
        meshs.rotation.set(2.95, 1.77, 2)
    }
}

export class PistolFab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsPistol }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/guns/fbx/pistol.fbx", () => {
            if (!this.meshs) return

            // const scale = 0.025
            // this.meshs.scale.set(scale, scale, scale)
            // this.meshs.position.set(0, 0.1, 0)
            // this.meshs.rotation.set(3.5, -0.1, -1.6)

            this.muzzlePointObject.position.set(20, 8, 0)
            this.meshs.add(this.muzzlePointObject)

            this.casingPointObject.position.set(7, 10, 1)
            this.casingPointObject.rotation.set(-1, 0, 0)
            this.meshs.add(this.casingPointObject)
        })
    }
}
export class M4A1Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsM4A1 }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/guns/fbx/m4a1.fbx", () => {
            if (!this.meshs) return

            // const scale = 0.025
            // this.meshs.scale.set(scale, scale, scale)
            // this.meshs.position.set(0, 0.1, 0)
            // this.meshs.rotation.set(3.5, -0.1, -1.6)

            this.muzzlePointObject.position.set(68, 8.5, 0)
            this.meshs.add(this.muzzlePointObject)
            
            this.casingPointObject.position.set(7, 10, 1)
            this.casingPointObject.rotation.set(-1, 0, 0)
            this.meshs.add(this.casingPointObject)
        })
    }
}
const g_scale = 0.002
export class ItemGunsBulletlite01Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsBulletlite01 }
    constructor(loader: Loader) { super(loader, "assets/weapon/guns/fbx/BulletLite_01.fbx", () => { if (this.meshs) this.meshs.scale.set(g_scale, g_scale, g_scale) }) }
}

export class ItemGunsBulletlite02Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsBulletlite02 }
    constructor(loader: Loader) { super(loader, "assets/weapon/guns/fbx/BulletLite_02.fbx", () => { if (this.meshs) this.meshs.scale.set(g_scale, g_scale, g_scale) }) }
}

export class ItemGunsM16Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsM16 }
    constructor(loader: Loader) { super(loader, "assets/weapon/guns/fbx/M16.fbx", () => { 
        if (!this.meshs) return 

        this.m16series(this.meshs)
        this.muzzlePointObject.position.set(-730, 0, 65)
        this.meshs.add(this.muzzlePointObject)

        this.casingPointObject.position.set(200, 50, 60)
        this.casingPointObject.rotation.set(-1, 0, 0)
        this.meshs.add(this.casingPointObject)
    })}
}

export class ItemGunsM1911Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsM1911 }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/guns/fbx/M1911.fbx", () => {
            if (this.meshs) this.m16series(this.meshs)
        })
    }
}

export class ItemGunsM1911tacticalFab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsM1911tactical }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/guns/fbx/M1911Tactical.fbx", () => {
            if (this.meshs) this.m16series(this.meshs)
        })
    }
}

export class ItemGunsM4a1Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsM4a1 }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/guns/fbx/M4A1_.fbx", () => {
            if (this.meshs) this.m16series(this.meshs)
        })
    }
}

export class ItemGunsMp5Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsMp5 }
    constructor(loader: Loader) { super(loader, "assets/weapon/guns/fbx/MP5.fbx", () => { if (this.meshs) this.meshs.scale.set(g_scale, g_scale, g_scale) }) }
}

export class ItemGunsMp7Fab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsMp7 }
    constructor(loader: Loader) { super(loader, "assets/weapon/guns/fbx/MP7.fbx", () => { if (this.meshs) this.meshs.scale.set(g_scale, g_scale, g_scale) }) }
}

export class ItemGunsScarFab extends GunFbxFab implements IAsset {
    get Id() { return Char.ItemsGunsScar }
    constructor(loader: Loader) {
        super(loader, "assets/weapon/guns/fbx/SCAR.fbx", () => {
            if (this.meshs) {
                this.m16series(this.meshs)
                this.meshs.rotation.z = -1
            }
        })
    }
}
