import * as THREE from "three";
import { Loader } from "../../loader";
import { AssetModel } from "../../assetmodel";
import { IAsset } from "../../iasset";
import { Bind, Char, ModelType } from "../../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class KayKitItems extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string) { 
        super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
        this.meshs = meshs
            this.InitMesh(meshs)
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

        meshs.traverse(child => {
            child.castShadow = true
            child.receiveShadow = true
        })
        const scale = 1
        meshs.scale.set(scale, scale, scale)
    }
}

/*
Skeleton_Arrow.fbx
Skeleton_Arrow_Broken.fbx
Skeleton_Arrow_Broken_Half.fbx
Skeleton_Arrow_Half.fbx
Skeleton_Axe.fbx
Skeleton_Blade.fbx
Skeleton_Crossbow.fbx
Skeleton_Quiver.fbx
Skeleton_Shield_Large_A.fbx
Skeleton_Shield_Large_B.fbx
Skeleton_Shield_Small_A.fbx
Skeleton_Shield_Small_B.fbx
Skeleton_Staff.fbx
*/
export class KayKitSkeletonArrowFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonArrow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Arrow.fbx") }
}
export class KayKitSkeletonArrowBrokenFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonArrowBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Arrow_Broken.fbx") }
}
export class KayKitSkeletonArrowBrokenHalfFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonArrowBrokenHalf}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Arrow_Broken_Half.fbx") }
}
export class KayKitSkeletonArrowHalfFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonArrow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Arrow_Half.fbx") }
}
export class KayKitSkeletonAXeFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonAxe}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Axe.fbx") }
}
export class KayKitSkeletonBladeFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonBlade}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Blade.fbx") }
}
export class KayKitSkeletonCrossbowFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonCrossbow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Crossbow.fbx") }
}
export class KayKitSkeletonQuiverFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonQuiver}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Quiver.fbx") }
}
export class KayKitSkeletonShieldLargeAFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonShieldLarge_A}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Shield_Large_A.fbx") }
}
export class KayKitSkeletonShieldLargeBFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonShieldLarge_B}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Shield_Large_B.fbx") }
}
export class KayKitSkeletonShieldSmallAFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonShieldSmall_A}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Shield_Small_A.fbx") }
}
export class KayKitSkeletonShieldSmallBFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonShieldSmall_B}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Shield_Small_B.fbx") }
}
export class KayKitSkeletonStaffFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitSkeletonStaff}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/Skeleton_Staff.fbx") }
}
