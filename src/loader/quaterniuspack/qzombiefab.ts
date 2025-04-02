import { AssetModel } from "../assetmodel"
import * as THREE from "three";
import { Loader } from "../loader";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class QuaterniusZombiePack extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string) { 
        super(loader, ModelType.Gltf, path, async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            const scale = 1
            this.meshs.children[0].scale.set(scale, scale, scale)
        })
    }
    
    GetBodyMeshId() { return "mixamorigRightHand" }
    GetBox(mesh: THREE.Group) {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.box == undefined) {
            const s = this.GetSize(mesh)
            this.box = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), this.boxMat)
        }

        const p = this.GetBoxPos(mesh)
        this.box.position.set(p.x, p.y, p.z)
        return new THREE.Box3().setFromObject(this.box)
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        return this.size 
    }
}

export class QuaterniusZombieCharactersGermanshepherdFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersGermanshepherd}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_GermanShepherd.gltf") }
}

export class QuaterniusZombieCharactersLisFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersLis}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Lis.gltf") }
}

export class QuaterniusZombieCharactersLisSingleweaponFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersLisSingleweapon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Lis_SingleWeapon.gltf") }
}

export class QuaterniusZombieCharactersMattFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersMatt}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Matt.gltf") }
}

export class QuaterniusZombieCharactersMattSingleweaponFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersMattSingleweapon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Matt_SingleWeapon.gltf") }
}

export class QuaterniusZombieCharactersPugFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersPug}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Pug.gltf") }
}

export class QuaterniusZombieCharactersSamFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersSam}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Sam.gltf") }
}

export class QuaterniusZombieCharactersSamSingleweaponFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersSamSingleweapon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Sam_SingleWeapon.gltf") }
}

export class QuaterniusZombieCharactersShaunFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersShaun}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Shaun.gltf") }
}

export class QuaterniusZombieCharactersShaunSingleweaponFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieCharactersShaunSingleweapon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Shaun_SingleWeapon.gltf") }
}

export class QuaterniusZombieZombieArmFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieZombieArm}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Zombie_Arm.gltf") }
}

export class QuaterniusZombieZombieBasicFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieZombieBasic}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Zombie_Basic.gltf") }
}

export class QuaterniusZombieZombieChubbyFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieZombieChubby}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Zombie_Chubby.gltf") }
}

export class QuaterniusZombieZombieRibcageFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.QuaterniusZombieZombieRibcage}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Zombie_Ribcage.gltf") }
}


