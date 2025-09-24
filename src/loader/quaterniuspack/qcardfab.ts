import { AssetModel } from "../assetmodel"
import * as THREE from "three";
import { Loader } from "../loader";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class QuaterniusCardPack extends AssetModel {
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
            const size = this.GetSize(this.meshs)
            this.meshs.children.forEach((c) => c.position.y += size.y / 2)
            this.meshs.children.forEach((c) => c.position.z += size.z / 2)
        })
    }
}

export class QuaterniusCard0CardBackFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard0CardBack}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/0_Card_Back.gltf") }
}

export class QuaterniusCard0CardContainerFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard0CardContainer}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/0_Card_Container.gltf") }
}

export class QuaterniusCard0CardFrontFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard0CardFront}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/0_Card_Front.gltf") }
}

export class QuaterniusCard0CardMaskFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard0CardMask}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/0_Card_Mask.gltf") }
}

export class QuaterniusCard10BeehiveFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard10Beehive}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/10_Beehive.gltf") }
}

export class QuaterniusCard11PolinizationFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard11Polinization}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/11_Polinization.gltf") }
}

export class QuaterniusCard12MimicFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard12Mimic}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/12_Mimic.gltf") }
}

export class QuaterniusCard13SeamonsterFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard13Seamonster}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/13_SeaMonster.gltf") }
}

export class QuaterniusCard14CoinFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard14Coin}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/14_Coin.gltf") }
}

export class QuaterniusCard15CultFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard15Cult}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/15_Cult.gltf") }
}

export class QuaterniusCard16BelltowersFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard16Belltowers}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/16_Belltowers.gltf") }
}

export class QuaterniusCard17RebirthFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard17Rebirth}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/17_Rebirth.gltf") }
}

export class QuaterniusCard18WaterdragonFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard18Waterdragon}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/18_WaterDragon.gltf") }
}

export class QuaterniusCard19OceantreasureFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard19Oceantreasure}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/19_OceanTreasure.gltf") }
}

export class QuaterniusCard1FireballFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard1Fireball}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/1_Fireball.gltf") }
}

export class QuaterniusCard20ElementFireFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard20ElementFire}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/20_Element_Fire.gltf") }
}

export class QuaterniusCard21ElementLightningFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard21ElementLightning}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/21_Element_Lightning.gltf") }
}

export class QuaterniusCard22ElementAirFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard22ElementAir}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/22_Element_Air.gltf") }
}

export class QuaterniusCard23ElementWaterFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard23ElementWater}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/23_Element_Water.gltf") }
}

export class QuaterniusCard24ElementDarkFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard24ElementDark}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/24_Element_Dark.gltf") }
}

export class QuaterniusCard25ElementEarthFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard25ElementEarth}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/25_Element_Earth.gltf") }
}

export class QuaterniusCard26BloodringFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard26Bloodring}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/26_BloodRing.gltf") }
}

export class QuaterniusCard27BookFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard27Book}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/27_Book.gltf") }
}

export class QuaterniusCard28RolldiceFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard28Rolldice}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/28_RollDice.gltf") }
}

export class QuaterniusCard29BlockFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard29Block}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/29_Block.gltf") }
}

export class QuaterniusCard2TrenchcoatmushroomsFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard2Trenchcoatmushrooms}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/2_TrenchcoatMushrooms.gltf") }
}

export class QuaterniusCard30WizardFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard30Wizard}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/30_Wizard.gltf") }
}

export class QuaterniusCard3MonkFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard3Monk}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/3_Monk.gltf") }
}

export class QuaterniusCard4MarketFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard4Market}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/4_Market.gltf") }
}

export class QuaterniusCard5StealFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard5Steal}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/5_Steal.gltf") }
}

export class QuaterniusCard6KingFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard6King}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/6_King.gltf") }
}

export class QuaterniusCard7StinktrapFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard7Stinktrap}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/7_StinkTrap.gltf") }
}

export class QuaterniusCard8LightningwizardFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard8Lightningwizard}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/8_LightningWizard.gltf") }
}

export class QuaterniusCard9HypnosisFab extends QuaterniusCardPack implements IAsset {
    get Id() {return Char.QuaterniusCard9Hypnosis}
    constructor(loader: Loader) { super(loader, "assets/quaterniuspack/3d_card/glTF/9_Hypnosis.gltf") }
}

