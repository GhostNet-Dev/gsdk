import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


class UltimatePack extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string, customFn = () => { }) { 
        super(loader, ModelType.Gltf, path, async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            customFn?.()
            // const scale = 1
            // this.meshs.children[0].scale.set(scale, scale, scale)
        })
    }
}
export class UltimateLvAndMaArrowFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaArrow}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Arrow.gltf") }
}
export class UltimateLvAndMaArrowSideFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaArrowSide}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Arrow_Side.gltf") }
}
export class UltimateLvAndMaArrowUpFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaArrowUp}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Arrow_Up.gltf") }
}
export class UltimateLvAndMaBombFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaBomb}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Bomb.gltf", () => { if (this.meshs) this.meshs.children[0].position.y += .5 }) }
}
export class UltimateLvAndMaBouncerFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaBouncer}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Bouncer.gltf") }
}
export class UltimateLvAndMaBridgeModularFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaBridgeModular}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Bridge_Modular.gltf") }
}
export class UltimateLvAndMaBridgeModularCenterFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaBridgeModularCenter}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Bridge_Modular_Center.gltf") }
}
export class UltimateLvAndMaBridgeSmallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaBridgeSmall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Bridge_Small.gltf") }
}
export class UltimateLvAndMaCannonFab extends UltimatePack implements IAsset {
    get Id() { return Char.UltimateLvAndMaCannon }
    constructor(loader: Loader) {
        super(loader, "assets/ultimatepack/LevelandMechanics/Cannon.gltf", () => {
            if (this.meshs) {
                this.meshs.children[0].position.y += 1
                this.meshs.children[1].position.y += 1
            }
        })
    }
}
export class UltimateLvAndMaCannonBallFab extends UltimatePack implements IAsset {
    get Id() { return Char.UltimateLvAndMaCannonBall }
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Cannonball.gltf", () => { if (this.meshs) this.meshs.children[0].position.y += .5 }) }
}
export class UltimateLvAndMaChestFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaChest}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Chest.gltf") }
}
export class UltimateLvAndMaDoorFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaDoor}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Door.gltf") }
}
export class UltimateLvAndMaFence1Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaFence1}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Fence_1.gltf", () => { if (this.meshs) this.meshs.position.x = .5 }) }
}
export class UltimateLvAndMaFenceCornerFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaFenceCorner}
    constructor(loader: Loader) {
        super(loader, "assets/ultimatepack/LevelandMechanics/Fence_Corner.gltf", () => {
            if (this.meshs) {
                this.meshs.children[0].position.x = -.5
                this.meshs.children[0].position.z = .5
            }
        })
    }
}
export class UltimateLvAndMaFenceMiddleFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaFenceMiddle}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Fence_Middle.gltf") }
}
export class UltimateLvAndMaGoalFlagFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaGoalFlag}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Goal_Flag.gltf") }
}
export class UltimateLvAndMaHazardCylinderFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaHazardCylinder}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Hazard_Cylinder.gltf") }
}
export class UltimateLvAndMaHazardSawFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaHazardSaw}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Hazard_Saw.gltf", () => { 
        if (this.meshs) {
            this.meshs.children[0].position.y += 1
        }
    })
    }
}
export class UltimateLvAndMaHazardSpikeTrapFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaHazardSpikeTrap}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Hazard_SpikeTrap.gltf") }
}
export class UltimateLvAndMaLeverFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaLever}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Lever.gltf") }
}
export class UltimateLvAndMaNumber0Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers0}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_0.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber1Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers1}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_1.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber2Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers2}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_2.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber3Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers3}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_3.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber4Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers4}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_4.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber5Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers5}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_5.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber6Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers6}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_6.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber7Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers7}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_7.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber8Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers8}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_8.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaNumber9Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaNumbers9}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Numbers_9.gltf", () => { if (this.meshs) this.meshs.children[0].position.y = .5 }) }
}
export class UltimateLvAndMaPipe90Fab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaPipe90}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Pipe_90.gltf", () => { if (this.meshs) this.meshs.children[0].position.y += 1 })}
}
export class UltimateLvAndMaPipeEndFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaPipeEnd}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Pipe_End.gltf", () => { if (this.meshs) this.meshs.children[0].position.y += 1 }) }
}
export class UltimateLvAndMaPipeStraightFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaPipeStraight}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Pipe_Straight.gltf", () => { if (this.meshs) this.meshs.children[0].position.y += 1 }) }
}
export class UltimateLvAndMaPipeTFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaPipeT}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Pipe_T.gltf", () => { if (this.meshs) this.meshs.children[0].position.y += 1 }) }
}
export class UltimateLvAndMaPlantLargeFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaPlantLarge}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Plant_Large.gltf") }
}
export class UltimateLvAndMaPlantSmallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaPlantSmall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Plant_Small.gltf") }
}
export class UltimateLvAndMaSpikesFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaSpikes}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Spikes.gltf") }
}
export class UltimateLvAndMaSpikyBallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaSpikyBall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/SpikyBall.gltf") }
}
export class UltimateLvAndMaStairsFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaStairs}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Stairs.gltf") }
}
export class UltimateLvAndMaStairsModularEndFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaStairsModularEnd}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Stairs_Modular_End.gltf") }
}
export class UltimateLvAndMaStairsModularMiddleFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaStairsModularMiddle}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Stairs_Modular_Middle.gltf") }
}
export class UltimateLvAndMaStairsModularStartFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaStairsModularStart}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Stairs_Modular_Start.gltf") }
}
export class UltimateLvAndMaStairsSmallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaStairsSmall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Stairs_Small.gltf") }
}
export class UltimateLvAndMaTowerFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateLvAndMaTower}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/LevelandMechanics/Tower.gltf") }
}
