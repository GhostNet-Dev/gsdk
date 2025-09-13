import * as THREE from "three";
import { Loader } from "../../loader";
import { AssetModel } from "../../assetmodel";
import { IAsset } from "../../iasset";
import { Bind, Char, ModelType } from "../../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class KayKitHalloweenFbxFab extends AssetModel {
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
        meshs.children[0].scale.set(scale, scale, scale)
    }
}

export class KayKitHalloweenArchFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenArch}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/arch.fbx") }
}

export class KayKitHalloweenArchGateFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenArchGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/arch_gate.fbx") }
}

export class KayKitHalloweenBenchFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenBench}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/bench.fbx") }
}

export class KayKitHalloweenBenchDecoratedFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenBenchDecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/bench_decorated.fbx") }
}

export class KayKitHalloweenBoneAFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenBoneA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/bone_A.fbx") }
}

export class KayKitHalloweenBoneBFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenBoneB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/bone_B.fbx") }
}

export class KayKitHalloweenBoneCFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenBoneC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/bone_C.fbx") }
}

export class KayKitHalloweenCandleFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenCandle}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/candle.fbx") }
}

export class KayKitHalloweenCandleMeltedFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenCandleMelted}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/candle_melted.fbx") }
}

export class KayKitHalloweenCandleThinFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenCandleThin}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/candle_thin.fbx") }
}

export class KayKitHalloweenCandleTripleFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenCandleTriple}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/candle_triple.fbx") }
}

export class KayKitHalloweenCoffinFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenCoffin}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/coffin.fbx") }
}

export class KayKitHalloweenCoffinDecoratedFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenCoffinDecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/coffin_decorated.fbx") }
}

export class KayKitHalloweenCryptFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenCrypt}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/crypt.fbx") }
}

export class KayKitHalloweenFenceFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFence}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/fence.fbx") }
}

export class KayKitHalloweenFenceBrokenFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFenceBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/fence_broken.fbx") }
}

export class KayKitHalloweenFenceGateFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFenceGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/fence_gate.fbx") }
}

export class KayKitHalloweenFencePillarFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFencePillar}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/fence_pillar.fbx") }
}

export class KayKitHalloweenFencePillarBrokenFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFencePillarBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/fence_pillar_broken.fbx") }
}

export class KayKitHalloweenFenceSeperateFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFenceSeperate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/fence_seperate.fbx") }
}

export class KayKitHalloweenFenceSeperateBrokenFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFenceSeperateBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/fence_seperate_broken.fbx") }
}

export class KayKitHalloweenFloorDirtFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFloorDirt}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/floor_dirt.fbx") }
}

export class KayKitHalloweenFloorDirtGraveFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFloorDirtGrave}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/floor_dirt_grave.fbx") }
}

export class KayKitHalloweenFloorDirtSmallFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenFloorDirtSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/floor_dirt_small.fbx") }
}

export class KayKitHalloweenGraveAFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenGraveA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/grave_A.fbx") }
}

export class KayKitHalloweenGraveADestroyedFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenGraveADestroyed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/grave_A_destroyed.fbx") }
}

export class KayKitHalloweenGraveBFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenGraveB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/grave_B.fbx") }
}

export class KayKitHalloweenGravemarkerAFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenGravemarkerA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/gravemarker_A.fbx") }
}

export class KayKitHalloweenGravemarkerBFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenGravemarkerB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/gravemarker_B.fbx") }
}

export class KayKitHalloweenGravestoneFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenGravestone}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/gravestone.fbx") }
}

export class KayKitHalloweenLanternHangingFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenLanternHanging}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/lantern_hanging.fbx") }
}

export class KayKitHalloweenLanternStandingFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenLanternStanding}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/lantern_standing.fbx") }
}

export class KayKitHalloweenPathAFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPathA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/path_A.fbx") }
}

export class KayKitHalloweenPathBFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPathB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/path_B.fbx") }
}

export class KayKitHalloweenPathCFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPathC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/path_C.fbx") }
}

export class KayKitHalloweenPathDFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPathD}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/path_D.fbx") }
}

export class KayKitHalloweenPillarFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPillar}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/pillar.fbx") }
}

export class KayKitHalloweenPlaqueFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPlaque}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/plaque.fbx") }
}

export class KayKitHalloweenPlaqueCandlesFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPlaqueCandles}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/plaque_candles.fbx") }
}

export class KayKitHalloweenPostFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPost}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/post.fbx") }
}

export class KayKitHalloweenPostLanternFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPostLantern}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/post_lantern.fbx") }
}

export class KayKitHalloweenPostSkullFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPostSkull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/post_skull.fbx") }
}

export class KayKitHalloweenPumpkinOrangeFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPumpkinOrange}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/pumpkin_orange.fbx") }
}

export class KayKitHalloweenPumpkinOrangeJackolanternFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPumpkinOrangeJackolantern}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/pumpkin_orange_jackolantern.fbx") }
}

export class KayKitHalloweenPumpkinOrangeSmallFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPumpkinOrangeSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/pumpkin_orange_small.fbx") }
}

export class KayKitHalloweenPumpkinYellowFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPumpkinYellow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/pumpkin_yellow.fbx") }
}

export class KayKitHalloweenPumpkinYellowJackolanternFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPumpkinYellowJackolantern}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/pumpkin_yellow_jackolantern.fbx") }
}

export class KayKitHalloweenPumpkinYellowSmallFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenPumpkinYellowSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/pumpkin_yellow_small.fbx") }
}

export class KayKitHalloweenRibcageFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenRibcage}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/ribcage.fbx") }
}

export class KayKitHalloweenShrineFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenShrine}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/shrine.fbx") }
}

export class KayKitHalloweenShrineCandlesFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenShrineCandles}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/shrine_candles.fbx") }
}

export class KayKitHalloweenSkullFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenSkull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/skull.fbx") }
}

export class KayKitHalloweenSkullCandleFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenSkullCandle}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/skull_candle.fbx") }
}

export class KayKitHalloweenTreeDeadLargeFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreeDeadLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_dead_large.fbx") }
}

export class KayKitHalloweenTreeDeadLargeDecoratedFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreeDeadLargeDecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_dead_large_decorated.fbx") }
}

export class KayKitHalloweenTreeDeadMediumFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreeDeadMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_dead_medium.fbx") }
}

export class KayKitHalloweenTreeDeadSmallFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreeDeadSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_dead_small.fbx") }
}

export class KayKitHalloweenTreePineOrangeLargeFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreePineOrangeLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_pine_orange_large.fbx") }
}

export class KayKitHalloweenTreePineOrangeMediumFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreePineOrangeMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_pine_orange_medium.fbx") }
}

export class KayKitHalloweenTreePineOrangeSmallFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreePineOrangeSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_pine_orange_small.fbx") }
}

export class KayKitHalloweenTreePineYellowLargeFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreePineYellowLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_pine_yellow_large.fbx") }
}

export class KayKitHalloweenTreePineYellowMediumFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreePineYellowMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_pine_yellow_medium.fbx") }
}

export class KayKitHalloweenTreePineYellowSmallFab extends KayKitHalloweenFbxFab implements IAsset {
    get Id() {return Char.KayKitHalloweenTreePineYellowSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/halloween/fbx/tree_pine_yellow_small.fbx") }
}