import * as THREE from "three";
import { AssetModel } from "../assetmodel";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { Loader } from "../loader";
import { Char, ModelType } from "../assettypes";
import { Bind } from "@Glibs/types/assettypes";
import { IAsset } from "@Glibs/interface/iasset";

class Sword extends AssetModel {
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

export class ItemSwordSword1Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword1}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_1.fbx") }
}

export class ItemSwordSword10Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword10}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_10.fbx") }
}

export class ItemSwordSword11Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword11}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_11.fbx") }
}

export class ItemSwordSword12Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword12}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_12.fbx") }
}

export class ItemSwordSword13Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword13}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_13.fbx") }
}

export class ItemSwordSword15Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword15}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_15.fbx") }
}

export class ItemSwordSword16Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword16}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_16.fbx") }
}

export class ItemSwordSword17Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword17}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_17.fbx") }
}

export class ItemSwordSword18Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword18}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_18.fbx") }
}

export class ItemSwordSword19Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword19}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_19.fbx") }
}

export class ItemSwordSword2Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword2}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_2.fbx") }
}

export class ItemSwordSword20Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword20}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_20.fbx") }
}

export class ItemSwordSword21Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword21}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_21.fbx") }
}

export class ItemSwordSword22Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword22}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_22.fbx") }
}

export class ItemSwordSword23Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword23}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_23.fbx") }
}

export class ItemSwordSword24Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword24}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_24.fbx") }
}

export class ItemSwordSword3Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword3}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_3.fbx") }
}

export class ItemSwordSword4Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword4}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_4.fbx") }
}

export class ItemSwordSword5Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword5}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_5.fbx") }
}

export class ItemSwordSword6Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword6}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_6.fbx") }
}

export class ItemSwordSword7Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword7}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_7.fbx") }
}

export class ItemSwordSword8Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword8}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_8.fbx") }
}

export class ItemSwordSword9Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword9}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/_sword_9.fbx") }
}

export class ItemSwordSword14Fab extends Sword implements IAsset {
    get Id() {return Char.ItemsSwordSword14}
    constructor(loader: Loader) { super(loader, "assets/weapon/swords/fbx/sword_14.fbx") }
}