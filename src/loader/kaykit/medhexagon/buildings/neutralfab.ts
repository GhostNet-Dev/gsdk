import * as THREE from "three";
import { AssetModel } from "@Glibs/loader/assetmodel";
import { Loader } from "@Glibs/loader/loader";
import { Bind, Char, ModelType } from "@Glibs/types/assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { IAsset } from "@Glibs/interface/iasset";

class KaykitMedHexagonBuildingsNeutralPackFab extends AssetModel {
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

export class KaykitMedHexagonBuildingsNeutralPackBuildingBridgeAFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingBridgeA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_bridge_A.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackBuildingBridgeBFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingBridgeB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_bridge_B.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackBuildingDestroyedFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingDestroyed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_destroyed.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackBuildingDirtFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingDirt}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_dirt.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackBuildingGrainFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingGrain}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_grain.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackBuildingScaffoldingFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingScaffolding}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_scaffolding.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackBuildingStageAFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingStageA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_stage_A.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackBuildingStageBFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingStageB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_stage_B.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackBuildingStageCFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackBuildingStageC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/building_stage_C.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackFenceStoneStraightFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackFenceStoneStraight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/fence_stone_straight.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackFenceStoneStraightGateFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackFenceStoneStraightGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/fence_stone_straight_gate.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackFenceWoodStraightFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackFenceWoodStraight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/fence_wood_straight.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackFenceWoodStraightGateFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackFenceWoodStraightGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/fence_wood_straight_gate.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackProjectileCatapultFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackProjectileCatapult}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/projectile_catapult.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackWallCornerAGateFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackWallCornerAGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/wall_corner_A_gate.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackWallCornerAInsideFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackWallCornerAInside}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/wall_corner_A_inside.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackWallCornerAOutsideFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackWallCornerAOutside}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/wall_corner_A_outside.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackWallCornerBInsideFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackWallCornerBInside}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/wall_corner_B_inside.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackWallCornerBOutsideFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackWallCornerBOutside}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/wall_corner_B_outside.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackWallStraightFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackWallStraight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/wall_straight.fbx") }
}

export class KaykitMedHexagonBuildingsNeutralPackWallStraightGateFab extends KaykitMedHexagonBuildingsNeutralPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingsNeutralPackWallStraightGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/neutral/wall_straight_gate.fbx") }
}