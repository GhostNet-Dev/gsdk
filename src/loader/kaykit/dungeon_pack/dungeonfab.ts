import * as THREE from "three";
import { Loader } from "../../loader";
import { AssetModel } from "../../assetmodel";
import { IAsset } from "../../iasset";
import { Bind, Char, ModelType } from "../../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";



class KayKitDungeonPack extends AssetModel{
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
        meshs.scale.set(scale, scale, scale)
    }
}
export class KayKitDungeonArrowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonArrow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/arrow.fbx") }
}

export class KayKitDungeonArtifactFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonArtifact}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/artifact.fbx") }
}

export class KayKitDungeonAxedoubleCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonAxedoubleCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axeDouble_common.fbx") }
}

export class KayKitDungeonAxedoubleRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonAxedoubleRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axeDouble_rare.fbx") }
}

export class KayKitDungeonAxedoubleUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonAxedoubleUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axeDouble_uncommon.fbx") }
}

export class KayKitDungeonAxeCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonAxeCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axe_common.fbx") }
}

export class KayKitDungeonAxeRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonAxeRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axe_rare.fbx") }
}

export class KayKitDungeonAxeUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonAxeUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axe_uncommon.fbx") }
}

export class KayKitDungeonBannerFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBanner}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/banner.fbx") }
}

export class KayKitDungeonBarrelFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBarrel}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/barrel.fbx") }
}

export class KayKitDungeonBarreldarkFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBarreldark}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/barrelDark.fbx") }
}

export class KayKitDungeonBenchFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBench}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bench.fbx") }
}

export class KayKitDungeonBookaFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBooka}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookA.fbx") }
}

export class KayKitDungeonBookbFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookb}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookB.fbx") }
}

export class KayKitDungeonBookcFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookc}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookC.fbx") }
}

export class KayKitDungeonBookdFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookd}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookD.fbx") }
}

export class KayKitDungeonBookeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBooke}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookE.fbx") }
}

export class KayKitDungeonBookfFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookf}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookF.fbx") }
}

export class KayKitDungeonBookopenaFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookopena}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookOpenA.fbx") }
}

export class KayKitDungeonBookopenbFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookopenb}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookOpenB.fbx") }
}

export class KayKitDungeonBookcaseFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookcase}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcase.fbx") }
}

export class KayKitDungeonBookcasefilledFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookcasefilled}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseFilled.fbx") }
}

export class KayKitDungeonBookcasefilledBrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookcasefilledBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseFilled_broken.fbx") }
}

export class KayKitDungeonBookcasewideFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookcasewide}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseWide.fbx") }
}

export class KayKitDungeonBookcasewidefilledFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookcasewidefilled}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseWideFilled.fbx") }
}

export class KayKitDungeonBookcasewidefilledBrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookcasewidefilledBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseWideFilled_broken.fbx") }
}

export class KayKitDungeonBookcasewideBrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookcasewideBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseWide_broken.fbx") }
}

export class KayKitDungeonBookcaseBrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBookcaseBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcase_broken.fbx") }
}

export class KayKitDungeonBricksFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBricks}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bricks.fbx") }
}

export class KayKitDungeonBucketFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonBucket}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bucket.fbx") }
}

export class KayKitDungeonChairFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChair}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chair.fbx") }
}

export class KayKitDungeonChesttopCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChesttopCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_common.fbx") }
}

export class KayKitDungeonChesttopCommonEmptyFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChesttopCommonEmpty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_common_empty.fbx") }
}

export class KayKitDungeonChesttopRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChesttopRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_rare.fbx") }
}

export class KayKitDungeonChesttopRareMimicFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChesttopRareMimic}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_rare_mimic.fbx") }
}

export class KayKitDungeonChesttopUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChesttopUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_uncommon.fbx") }
}

export class KayKitDungeonChesttopUncommonMimicFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChesttopUncommonMimic}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_uncommon_mimic.fbx") }
}

export class KayKitDungeonChestCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChestCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_common.fbx") }
}

export class KayKitDungeonChestCommonEmptyFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChestCommonEmpty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_common_empty.fbx") }
}

export class KayKitDungeonChestRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChestRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_rare.fbx") }
}

export class KayKitDungeonChestRareMimicFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChestRareMimic}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_rare_mimic.fbx") }
}

export class KayKitDungeonChestUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChestUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_uncommon.fbx") }
}

export class KayKitDungeonChestUncommonMimicFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonChestUncommonMimic}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_uncommon_mimic.fbx") }
}

export class KayKitDungeonCoinFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCoin}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/coin.fbx") }
}

export class KayKitDungeonCoinslargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCoinslarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/coinsLarge.fbx") }
}

export class KayKitDungeonCoinsmediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCoinsmedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/coinsMedium.fbx") }
}

export class KayKitDungeonCoinssmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCoinssmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/coinsSmall.fbx") }
}

export class KayKitDungeonCrateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCrate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crate.fbx") }
}

export class KayKitDungeonCratedarkFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCratedark}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crateDark.fbx") }
}

export class KayKitDungeonCrateplatformLargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCrateplatformLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/cratePlatform_large.fbx") }
}

export class KayKitDungeonCrateplatformMediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCrateplatformMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/cratePlatform_medium.fbx") }
}

export class KayKitDungeonCrateplatformSmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCrateplatformSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/cratePlatform_small.fbx") }
}

export class KayKitDungeonCrossbowCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCrossbowCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crossbow_common.fbx") }
}

export class KayKitDungeonCrossbowRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCrossbowRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crossbow_rare.fbx") }
}

export class KayKitDungeonCrossbowUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonCrossbowUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crossbow_uncommon.fbx") }
}

export class KayKitDungeonDaggerCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonDaggerCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/dagger_common.fbx") }
}

export class KayKitDungeonDaggerRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonDaggerRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/dagger_rare.fbx") }
}

export class KayKitDungeonDaggerUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonDaggerUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/dagger_uncommon.fbx") }
}

export class KayKitDungeonDoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonDoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/door.fbx") }
}

export class KayKitDungeonDoorGateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonDoorGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/door_gate.fbx") }
}

export class KayKitDungeonFloordecorationShatteredbricksFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonFloordecorationShatteredbricks}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_shatteredBricks.fbx") }
}

export class KayKitDungeonFloordecorationTileslargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonFloordecorationTileslarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_tilesLarge.fbx") }
}

export class KayKitDungeonFloordecorationTilessmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonFloordecorationTilessmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_tilesSmall.fbx") }
}

export class KayKitDungeonFloordecorationWoodFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonFloordecorationWood}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_wood.fbx") }
}

export class KayKitDungeonFloordecorationWoodleftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonFloordecorationWoodleft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_woodLeft.fbx") }
}

export class KayKitDungeonFloordecorationWoodrightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonFloordecorationWoodright}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_woodRight.fbx") }
}

export class KayKitDungeonHammerCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonHammerCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/hammer_common.fbx") }
}

export class KayKitDungeonHammerRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonHammerRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/hammer_rare.fbx") }
}

export class KayKitDungeonHammerUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonHammerUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/hammer_uncommon.fbx") }
}

export class KayKitDungeonLootsackaFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonLootsacka}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/lootSackA.fbx") }
}

export class KayKitDungeonLootsackbFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonLootsackb}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/lootSackB.fbx") }
}

export class KayKitDungeonMugFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonMug}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/mug.fbx") }
}

export class KayKitDungeonPillarFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPillar}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/pillar.fbx") }
}

export class KayKitDungeonPillarBrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPillarBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/pillar_broken.fbx") }
}

export class KayKitDungeonPlateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPlate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/plate.fbx") }
}

export class KayKitDungeonPlatefullFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPlatefull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/plateFull.fbx") }
}

export class KayKitDungeonPlatehalfFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPlatehalf}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/plateHalf.fbx") }
}

export class KayKitDungeonPotaFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPota}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potA.fbx") }
}

export class KayKitDungeonPotaDecoratedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotaDecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potA_decorated.fbx") }
}

export class KayKitDungeonPotbFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotb}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potB.fbx") }
}

export class KayKitDungeonPotbDecoratedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotbDecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potB_decorated.fbx") }
}

export class KayKitDungeonPotcFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotc}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potC.fbx") }
}

export class KayKitDungeonPotcDecoratedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotcDecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potC_decorated.fbx") }
}

export class KayKitDungeonPotionlargeBlueFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionlargeBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionLarge_blue.fbx") }
}

export class KayKitDungeonPotionlargeGreenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionlargeGreen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionLarge_green.fbx") }
}

export class KayKitDungeonPotionlargeRedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionlargeRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionLarge_red.fbx") }
}

export class KayKitDungeonPotionmediumBlueFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionmediumBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionMedium_blue.fbx") }
}

export class KayKitDungeonPotionmediumGreenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionmediumGreen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionMedium_green.fbx") }
}

export class KayKitDungeonPotionmediumRedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionmediumRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionMedium_red.fbx") }
}

export class KayKitDungeonPotionsmallBlueFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionsmallBlue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionSmall_blue.fbx") }
}

export class KayKitDungeonPotionsmallGreenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionsmallGreen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionSmall_green.fbx") }
}

export class KayKitDungeonPotionsmallRedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPotionsmallRed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionSmall_red.fbx") }
}

export class KayKitDungeonPotsFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonPots}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/pots.fbx") }
}

export class KayKitDungeonQuiverEmptyFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonQuiverEmpty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/quiver_empty.fbx") }
}

export class KayKitDungeonQuiverFullFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonQuiverFull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/quiver_full.fbx") }
}

export class KayKitDungeonQuiverHalfFullFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonQuiverHalfFull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/quiver_half_full.fbx") }
}

export class KayKitDungeonScaffoldHighFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldHigh}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high.fbx") }
}

export class KayKitDungeonScaffoldHighCornerbothFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldHighCornerboth}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high_cornerBoth.fbx") }
}

export class KayKitDungeonScaffoldHighCornerleftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldHighCornerleft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high_cornerLeft.fbx") }
}

export class KayKitDungeonScaffoldHighCornerrightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldHighCornerright}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high_cornerRight.fbx") }
}

export class KayKitDungeonScaffoldHighRailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldHighRailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high_railing.fbx") }
}

export class KayKitDungeonScaffoldLowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldLow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low.fbx") }
}

export class KayKitDungeonScaffoldLowCornerbothFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldLowCornerboth}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low_cornerBoth.fbx") }
}

export class KayKitDungeonScaffoldLowCornerleftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldLowCornerleft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low_cornerLeft.fbx") }
}

export class KayKitDungeonScaffoldLowCornerrightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldLowCornerright}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low_cornerRight.fbx") }
}

export class KayKitDungeonScaffoldLowRailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldLowRailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low_railing.fbx") }
}

export class KayKitDungeonScaffoldMediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium.fbx") }
}

export class KayKitDungeonScaffoldMediumCornerbothFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldMediumCornerboth}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium_cornerBoth.fbx") }
}

export class KayKitDungeonScaffoldMediumCornerleftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldMediumCornerleft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium_cornerLeft.fbx") }
}

export class KayKitDungeonScaffoldMediumCornerrightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldMediumCornerright}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium_cornerRight.fbx") }
}

export class KayKitDungeonScaffoldMediumRailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldMediumRailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium_railing.fbx") }
}

export class KayKitDungeonScaffoldSmallHighFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallHigh}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high.fbx") }
}

export class KayKitDungeonScaffoldSmallHighCornerleftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallHighCornerleft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_cornerLeft.fbx") }
}

export class KayKitDungeonScaffoldSmallHighCornerrightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallHighCornerright}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_cornerRight.fbx") }
}

export class KayKitDungeonScaffoldSmallHighLongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallHighLong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_long.fbx") }
}

export class KayKitDungeonScaffoldSmallHighRailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallHighRailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_railing.fbx") }
}

export class KayKitDungeonScaffoldSmallHighRailingLongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallHighRailingLong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_railing_long.fbx") }
}

export class KayKitDungeonScaffoldSmallLowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallLow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low.fbx") }
}

export class KayKitDungeonScaffoldSmallLowCornerleftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallLowCornerleft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_cornerLeft.fbx") }
}

export class KayKitDungeonScaffoldSmallLowCornerrightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallLowCornerright}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_cornerRight.fbx") }
}

export class KayKitDungeonScaffoldSmallLowLongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallLowLong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_long.fbx") }
}

export class KayKitDungeonScaffoldSmallLowRailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallLowRailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_railing.fbx") }
}

export class KayKitDungeonScaffoldSmallLowRailingLongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallLowRailingLong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_railing_long.fbx") }
}

export class KayKitDungeonScaffoldSmallMediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium.fbx") }
}

export class KayKitDungeonScaffoldSmallMediumCornerleftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallMediumCornerleft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_cornerLeft.fbx") }
}

export class KayKitDungeonScaffoldSmallMediumCornerrightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallMediumCornerright}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_cornerRight.fbx") }
}

export class KayKitDungeonScaffoldSmallMediumLongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallMediumLong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_long.fbx") }
}

export class KayKitDungeonScaffoldSmallMediumRailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallMediumRailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_railing.fbx") }
}

export class KayKitDungeonScaffoldSmallMediumRailingLongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldSmallMediumRailingLong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_railing_long.fbx") }
}

export class KayKitDungeonScaffoldStairsFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonScaffoldStairs}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_stairs.fbx") }
}

export class KayKitDungeonShieldCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonShieldCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/shield_common.fbx") }
}

export class KayKitDungeonShieldRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonShieldRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/shield_rare.fbx") }
}

export class KayKitDungeonShieldUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonShieldUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/shield_uncommon.fbx") }
}

export class KayKitDungeonSpellbookFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonSpellbook}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/spellBook.fbx") }
}

export class KayKitDungeonStaffCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonStaffCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/staff_common.fbx") }
}

export class KayKitDungeonStaffRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonStaffRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/staff_rare.fbx") }
}

export class KayKitDungeonStaffUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonStaffUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/staff_uncommon.fbx") }
}

export class KayKitDungeonStairsFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonStairs}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/stairs.fbx") }
}

export class KayKitDungeonStairsWideFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonStairsWide}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/stairs_wide.fbx") }
}

export class KayKitDungeonStoolFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonStool}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/stool.fbx") }
}

export class KayKitDungeonSwordCommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonSwordCommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/sword_common.fbx") }
}

export class KayKitDungeonSwordRareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonSwordRare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/sword_rare.fbx") }
}

export class KayKitDungeonSwordUncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonSwordUncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/sword_uncommon.fbx") }
}

export class KayKitDungeonTablelargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTablelarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tableLarge.fbx") }
}

export class KayKitDungeonTablemediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTablemedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tableMedium.fbx") }
}

export class KayKitDungeonTablesmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTablesmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tableSmall.fbx") }
}

export class KayKitDungeonTilebrickaLargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilebrickaLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickA_large.fbx") }
}

export class KayKitDungeonTilebrickaMediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilebrickaMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickA_medium.fbx") }
}

export class KayKitDungeonTilebrickaSmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilebrickaSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickA_small.fbx") }
}

export class KayKitDungeonTilebrickbLargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilebrickbLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_large.fbx") }
}

export class KayKitDungeonTilebrickbLargecrackedaFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilebrickbLargecrackeda}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_largeCrackedA.fbx") }
}

export class KayKitDungeonTilebrickbLargecrackedbFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilebrickbLargecrackedb}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_largeCrackedB.fbx") }
}

export class KayKitDungeonTilebrickbMediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilebrickbMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_medium.fbx") }
}

export class KayKitDungeonTilebrickbSmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilebrickbSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_small.fbx") }
}

export class KayKitDungeonTilespikesFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilespikes}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileSpikes.fbx") }
}

export class KayKitDungeonTilespikesLargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilespikesLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileSpikes_large.fbx") }
}

export class KayKitDungeonTilespikesShallowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTilespikesShallow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileSpikes_shallow.fbx") }
}

export class KayKitDungeonTorchFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTorch}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/torch.fbx") }
}

export class KayKitDungeonTorchwallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTorchwall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/torchWall.fbx") }
}

export class KayKitDungeonTrapdoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonTrapdoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/trapdoor.fbx") }
}

export class KayKitDungeonWallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall.fbx") }
}

export class KayKitDungeonWallcornerFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallcorner}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallCorner.fbx") }
}

export class KayKitDungeonWalldecorationaFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWalldecorationa}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallDecorationA.fbx") }
}

export class KayKitDungeonWalldecorationbFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWalldecorationb}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallDecorationB.fbx") }
}

export class KayKitDungeonWallintersectionFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallintersection}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallIntersection.fbx") }
}

export class KayKitDungeonWallsingleFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingle}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle.fbx") }
}

export class KayKitDungeonWallsingleBrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingleBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_broken.fbx") }
}

export class KayKitDungeonWallsingleCornerFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingleCorner}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_corner.fbx") }
}

export class KayKitDungeonWallsingleDecorationaFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingleDecorationa}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_decorationA.fbx") }
}

export class KayKitDungeonWallsingleDecorationbFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingleDecorationb}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_decorationB.fbx") }
}

export class KayKitDungeonWallsingleDoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingleDoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_door.fbx") }
}

export class KayKitDungeonWallsingleSplitFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingleSplit}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_split.fbx") }
}

export class KayKitDungeonWallsingleWindowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingleWindow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_window.fbx") }
}

export class KayKitDungeonWallsingleWindowgateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsingleWindowgate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_windowGate.fbx") }
}

export class KayKitDungeonWallsplitFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallsplit}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSplit.fbx") }
}

export class KayKitDungeonWallBrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_broken.fbx") }
}

export class KayKitDungeonWallDoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallDoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_door.fbx") }
}

export class KayKitDungeonWallEndFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallEnd}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_end.fbx") }
}

export class KayKitDungeonWallEndBrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallEndBroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_end_broken.fbx") }
}

export class KayKitDungeonWallGateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_gate.fbx") }
}

export class KayKitDungeonWallGatecornerFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallGatecorner}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_gateCorner.fbx") }
}

export class KayKitDungeonWallGatedoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallGatedoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_gateDoor.fbx") }
}

export class KayKitDungeonWallWindowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallWindow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_window.fbx") }
}

export class KayKitDungeonWallWindowgateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWallWindowgate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_windowGate.fbx") }
}

export class KayKitDungeonWeaponrackFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonWeaponrack}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/weaponRack.fbx") }
}
