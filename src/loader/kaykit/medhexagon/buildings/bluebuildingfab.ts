import * as THREE from "three";
import { AssetModel } from "@Glibs/loader/assetmodel";
import { Loader } from "@Glibs/loader/loader";
import { Bind, Char, ModelType } from "@Glibs/types/assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { IAsset } from "@Glibs/interface/iasset";

class KaykitMedHexagonBuildingBulePackFab extends AssetModel {
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

export class KaykitMedHexagonBuildingBulePackBuildingArcheryrangeBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingArcheryrangeBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_archeryrange_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingBarracksBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingBarracksBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_barracks_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingBlacksmithBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingBlacksmithBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_blacksmith_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingCastleBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingCastleBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_castle_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingChurchBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingChurchBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_church_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingHomeABlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingHomeABlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_home_A_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingHomeBBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingHomeBBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_home_B_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingLumbermillBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingLumbermillBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_lumbermill_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingMarketBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingMarketBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_market_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingMineBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingMineBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_mine_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingTavernBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingTavernBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_tavern_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingTowerABlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingTowerABlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_tower_A_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingTowerBBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingTowerBBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_tower_B_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingTowerBaseBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingTowerBaseBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_tower_base_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingTowerCatapultBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingTowerCatapultBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_tower_catapult_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingWatermillBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingWatermillBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_watermill_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingWellBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingWellBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_well_blue.fbx") }
}

export class KaykitMedHexagonBuildingBulePackBuildingWindmillBlueFab extends KaykitMedHexagonBuildingBulePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingBulePackBuildingWindmillBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/blue/building_windmill_blue.fbx") }
}
