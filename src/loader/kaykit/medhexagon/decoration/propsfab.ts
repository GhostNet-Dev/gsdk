import * as THREE from "three";
import { AssetModel } from "@Glibs/loader/assetmodel";
import { Loader } from "@Glibs/loader/loader";
import { Bind, Char, ModelType } from "@Glibs/types/assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { IAsset } from "@Glibs/interface/iasset";

class KaykitMedHexagonDecorationPropsPackFab extends AssetModel {
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

export class KaykitMedHexagonDecorationPropsPackBarrelFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackBarrel}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/barrel.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackBucketArrowsFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackBucketArrows}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/bucket_arrows.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackBucketEmptyFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackBucketEmpty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/bucket_empty.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackBucketWaterFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackBucketWater}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/bucket_water.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateABigFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateABig}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_A_big.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateASmallFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateASmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_A_small.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateBBigFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateBBig}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_B_big.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateBSmallFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateBSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_B_small.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateLongAFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateLongA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_long_A.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateLongBFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateLongB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_long_B.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateLongCFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateLongC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_long_C.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateLongEmptyFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateLongEmpty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_long_empty.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackCrateOpenFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackCrateOpen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/crate_open.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackFlagBlueFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackFlagBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/flag_blue.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackFlagGreenFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackFlagGreen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/flag_green.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackFlagRedFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackFlagRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/flag_red.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackFlagYellowFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackFlagYellow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/flag_yellow.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackLadderFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackLadder}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/ladder.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackPalletFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackPallet}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/pallet.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackResourceLumberFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackResourceLumber}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/resource_lumber.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackResourceStoneFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackResourceStone}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/resource_stone.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackSackFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackSack}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/sack.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackTargetFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackTarget}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/target.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackTentFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackTent}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/tent.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackWeaponrackFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackWeaponrack}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/weaponrack.fbx") }
}

export class KaykitMedHexagonDecorationPropsPackWheelbarrowFab extends KaykitMedHexagonDecorationPropsPackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationPropsPackWheelbarrow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/props/wheelbarrow.fbx") }
}
