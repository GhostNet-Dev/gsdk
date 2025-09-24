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
}

export class QuaterniusZombieCharactersGermanshepherdFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharAniQuaterniusZombieCharactersGermanshepherd}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_GermanShepherd.gltf") }
}

export class QuaterniusZombieCharactersLisFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharHumanQuaterniusZombieCharactersLis}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Lis.gltf") }
}

export class QuaterniusZombieCharactersLisSingleweaponFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharHumanQuaterniusZombieCharactersLisSingleweapon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Lis_SingleWeapon.gltf") }
}

export class QuaterniusZombieCharactersMattFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharHumanQuaterniusZombieCharactersMatt}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Matt.gltf") }
}

export class QuaterniusZombieCharactersMattSingleweaponFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharHumanQuaterniusZombieCharactersMattSingleweapon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Matt_SingleWeapon.gltf") }
}

export class QuaterniusZombieCharactersPugFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharAniQuaterniusZombieCharactersPug}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Pug.gltf") }
}

export class QuaterniusZombieCharactersSamFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharHumanQuaterniusZombieCharactersSam}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Sam.gltf") }
}

export class QuaterniusZombieCharactersSamSingleweaponFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharHumanQuaterniusZombieCharactersSamSingleweapon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Sam_SingleWeapon.gltf") }
}

export class QuaterniusZombieCharactersShaunFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharHumanQuaterniusZombieCharactersShaun}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Shaun.gltf") }
}

export class QuaterniusZombieCharactersShaunSingleweaponFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharHumanQuaterniusZombieCharactersShaunSingleweapon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Characters_Shaun_SingleWeapon.gltf") }
}

export class QuaterniusZombieZombieArmFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharMonQuaterniusZombieZombieArm}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Zombie_Arm.gltf") }
}

export class QuaterniusZombieZombieBasicFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharMonQuaterniusZombieZombieBasic}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Zombie_Basic.gltf") }
}

export class QuaterniusZombieZombieChubbyFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharMonQuaterniusZombieZombieChubby}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Zombie_Chubby.gltf") }
}

export class QuaterniusZombieZombieRibcageFab extends QuaterniusZombiePack implements IAsset {
    get Id() {return Char.CharMonQuaterniusZombieZombieRibcage}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/zombie/characters/glTF/Zombie_Ribcage.gltf") }
}


