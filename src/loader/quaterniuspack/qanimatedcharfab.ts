import { AssetModel } from "../assetmodel"
import * as THREE from "three";
import { Loader } from "../loader";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "@Glibs/types/assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class QuaterniusAniCharPack extends AssetModel {
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
export class QuaterniusAniCharBasecharacterFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharBasecharacter}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/BaseCharacter.gltf") }
}

export class QuaterniusAniCharBluesoldierFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharBluesoldierFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/BlueSoldier_Female.gltf") }
}

export class QuaterniusAniCharBluesoldierMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharBluesoldierMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/BlueSoldier_Male.gltf") }
}

export class QuaterniusAniCharCasual2FemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCasual2Female}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Casual2_Female.gltf") }
}

export class QuaterniusAniCharCasual2MaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCasual2Male}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Casual2_Male.gltf") }
}

export class QuaterniusAniCharCasual3FemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCasual3Female}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Casual3_Female.gltf") }
}

export class QuaterniusAniCharCasual3MaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCasual3Male}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Casual3_Male.gltf") }
}

export class QuaterniusAniCharCasualBaldFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCasualBald}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Casual_Bald.gltf") }
}

export class QuaterniusAniCharCasualFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCasualFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Casual_Female.gltf") }
}

export class QuaterniusAniCharCasualMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCasualMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Casual_Male.gltf") }
}

export class QuaterniusAniCharChefFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharChefFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Chef_Female.gltf") }
}

export class QuaterniusAniCharChefHatFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharChefHat}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Chef_Hat.gltf") }
}

export class QuaterniusAniCharChefMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharChefMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Chef_Male.gltf") }
}

export class QuaterniusAniCharCowFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCow}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Cow.gltf") }
}

export class QuaterniusAniCharCowboyFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCowboyFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Cowboy_Female.gltf") }
}

export class QuaterniusAniCharCowboyHairFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCowboyHair}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Cowboy_Hair.gltf") }
}

export class QuaterniusAniCharCowboyMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharCowboyMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Cowboy_Male.gltf") }
}

export class QuaterniusAniCharDoctorFemaleOldFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharDoctorFemaleOld}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Doctor_Female_Old.gltf") }
}

export class QuaterniusAniCharDoctorFemaleYoungFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharDoctorFemaleYoung}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Doctor_Female_Young.gltf") }
}

export class QuaterniusAniCharDoctorMaleOldFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharDoctorMaleOld}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Doctor_Male_Old.gltf") }
}

export class QuaterniusAniCharDoctorMaleYoungFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharDoctorMaleYoung}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Doctor_Male_Young.gltf") }
}

export class QuaterniusAniCharElfFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharElf}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Elf.gltf") }
}

export class QuaterniusAniCharGoblinFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharGoblinFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Goblin_Female.gltf") }
}

export class QuaterniusAniCharGoblinMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharGoblinMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Goblin_Male.gltf") }
}

export class QuaterniusAniCharKimonoFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharKimonoFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Kimono_Female.gltf") }
}

export class QuaterniusAniCharKimonoMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharKimonoMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Kimono_Male.gltf") }
}

export class QuaterniusAniCharKnightGoldenFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharKnightGoldenFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Knight_Golden_Female.gltf") }
}

export class QuaterniusAniCharKnightGoldenMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharKnightGoldenMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Knight_Golden_Male.gltf") }
}

export class QuaterniusAniCharKnightMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharKnightMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Knight_Male.gltf") }
}

export class QuaterniusAniCharNinjaFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharNinjaFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Ninja_Female.gltf") }
}

export class QuaterniusAniCharNinjaMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharNinjaMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Ninja_Male.gltf") }
}

export class QuaterniusAniCharNinjaMaleHairFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharNinjaMaleHair}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Ninja_Male_Hair.gltf") }
}

export class QuaterniusAniCharNinjaSandFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharNinjaSand}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Ninja_Sand.gltf") }
}

export class QuaterniusAniCharNinjaSandFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharNinjaSandFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Ninja_Sand_Female.gltf") }
}

export class QuaterniusAniCharOldclassyFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharOldclassyFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/OldClassy_Female.gltf") }
}

export class QuaterniusAniCharOldclassyMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharOldclassyMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/OldClassy_Male.gltf") }
}

export class QuaterniusAniCharPirateFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharPirateFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Pirate_Female.gltf") }
}

export class QuaterniusAniCharPirateMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharPirateMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Pirate_Male.gltf") }
}

export class QuaterniusAniCharPugFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharPug}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Pug.gltf") }
}

export class QuaterniusAniCharSoldierFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharSoldierFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Soldier_Female.gltf") }
}

export class QuaterniusAniCharSoldierMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharSoldierMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Soldier_Male.gltf") }
}

export class QuaterniusAniCharSuitFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharSuitFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Suit_Female.gltf") }
}

export class QuaterniusAniCharSuitMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharSuitMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Suit_Male.gltf") }
}

export class QuaterniusAniCharVikinghelmetFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharVikinghelmet}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/VikingHelmet.gltf") }
}

export class QuaterniusAniCharVikingFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharVikingFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Viking_Female.gltf") }
}

export class QuaterniusAniCharVikingMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharVikingMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Viking_Male.gltf") }
}

export class QuaterniusAniCharWitchFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharWitch}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Witch.gltf") }
}

export class QuaterniusAniCharWizardFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharWizard}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Wizard.gltf") }
}

export class QuaterniusAniCharWorkerFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharWorkerFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Worker_Female.gltf") }
}

export class QuaterniusAniCharWorkerMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharWorkerMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Worker_Male.gltf") }
}

export class QuaterniusAniCharZombieFemaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharZombieFemale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Zombie_Female.gltf") }
}

export class QuaterniusAniCharZombieMaleFab extends QuaterniusAniCharPack implements IAsset {
    get Id() {return Char.QuaterniusAniCharZombieMale}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/ultimate_animated_char/glTF/Zombie_Male.gltf") }
}