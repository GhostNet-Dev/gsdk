import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


class CharactersPack extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, texture: string) { 
        super(loader, ModelType.Fbx, "assets/kenney/characters/characterMedium.fbx", async (meshs: THREE.Group) => {
            this.meshs = meshs
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true

            const tloader = new THREE.TextureLoader()
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
                if (child instanceof THREE.Mesh)
                    tloader.load(texture, (texture) => {
                        child.material.map = texture
                        child.material.needsupdate = true
                        child.material = new THREE.MeshToonMaterial({ map: child.material.map })
                    })
            })
            this.meshs.scale.multiplyScalar(0.01)
            await this.LoadAnimation("assets/kenney/characters/idle.fbx", Ani.Idle)
            await this.LoadAnimation("assets/kenney/characters/jump.fbx", Ani.Jump)
            await this.LoadAnimation("assets/kenney/characters/Running.fbx", Ani.Run)
            await this.LoadAnimation("assets/kenney/characters/Dying.fbx", Ani.Dying)
            // const scale = 1
            // this.meshs.children[0].scale.set(scale, scale, scale)
        })
    }
}
export class KenneyCriminalMaleFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharHumanKenneyCriminalMale}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/criminalMaleA.png") }
}
export class KenneyCyborgFemaleFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharHumanKenneyCyborgFemale}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/cyborgFemaleA.png") }
}
export class KenneyHumanFemaleFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharHumanKenneyHumanFemale}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/humanFemaleA.png") }
}
export class KenneyHumanMaleFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharHumanKenneyHumanMale}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/humanMaleA.png") }
}
export class KenneySkaterFemaleFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharHumanKenneySkaterFemale}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/skaterFemaleA.png") }
}
export class KenneySkaterMaleFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharHumanKenneySkaterMale}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/skaterMaleA.png") }
}
export class KenneySurvivorFemaleFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharHumanKenneySurvivorFemale}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/survivorFemaleA.png") }
}
export class KenneySurvivorMaleFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharHumanKenneySurvivorMale}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/survivorMaleB.png") }
}
export class KenneyZombieAFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharMonKenneyZombieA}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/zombieA.png") }
}
export class KenneyZombieBFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharMonKenneyZombieB}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/zombieC.png") }
}
export class KenneyZombieFemaleAFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharMonKenneyZombieFemaleA}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/zombieFemaleA.png") }
}
export class KenneyZombieFemaleBFab extends CharactersPack implements IAsset {
    get Id() {return Char.CharMonKenneyZombieFemaleB}
    constructor(loader: Loader) { super(loader, "assets/kenney/characters/zombieMaleA.png") }
}