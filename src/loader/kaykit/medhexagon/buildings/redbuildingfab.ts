import * as THREE from "three";
import { AssetModel } from "@Glibs/loader/assetmodel";
import { Loader } from "@Glibs/loader/loader";
import { Bind, Char, ModelType } from "@Glibs/types/assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { IAsset } from "@Glibs/interface/iasset";

class KaykitMedHexagonBuildingRedPackFab extends AssetModel {
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

export class KaykitMedHexagonBuildingRedPackBuildingArcheryrangeRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingArcheryrangeRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_archeryrange_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingBarracksRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingBarracksRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_barracks_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingBlacksmithRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingBlacksmithRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_blacksmith_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingCastleRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingCastleRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_castle_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingChurchRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingChurchRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_church_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingHomeARedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingHomeARed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_home_A_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingHomeBRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingHomeBRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_home_B_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingLumbermillRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingLumbermillRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_lumbermill_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingMarketRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingMarketRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_market_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingMineRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingMineRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_mine_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingTavernRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingTavernRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_tavern_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingTowerARedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingTowerARed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_tower_A_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingTowerBRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingTowerBRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_tower_B_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingTowerBaseRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingTowerBaseRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_tower_base_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingTowerCatapultRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingTowerCatapultRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_tower_catapult_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingWatermillRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingWatermillRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_watermill_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingWellRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingWellRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_well_red.fbx") }
}

export class KaykitMedHexagonBuildingRedPackBuildingWindmillRedFab extends KaykitMedHexagonBuildingRedPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonBuildingRedPackBuildingWindmillRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/buildings/red/building_windmill_red.fbx") }
}