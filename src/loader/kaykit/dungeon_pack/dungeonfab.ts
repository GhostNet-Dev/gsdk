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
export class KayKitDungeoncrossbowrareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncrossbowrare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crossbow_rare.fbx") }
}

export class KayKitDungeonscaffoldsmallmediumcornerRightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallmediumcornerRight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_cornerRight.fbx") }
}

export class KayKitDungeonscaffoldlowcornerRightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldlowcornerRight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low_cornerRight.fbx") }
}

export class KayKitDungeonscaffoldsmallmediumlongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallmediumlong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_long.fbx") }
}

export class KayKitDungeoncrateDarkFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncrateDark}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crateDark.fbx") }
}

export class KayKitDungeonaxeDoubleuncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonaxeDoubleuncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axeDouble_uncommon.fbx") }
}

export class KayKitDungeonfloorDecorationwoodLeftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonfloorDecorationwoodLeft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_woodLeft.fbx") }
}

export class KayKitDungeonscaffoldsmallmediumcornerLeftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallmediumcornerLeft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_cornerLeft.fbx") }
}

export class KayKitDungeonlootSackAFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonlootSackA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/lootSackA.fbx") }
}

export class KayKitDungeonbookcasebrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookcasebroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcase_broken.fbx") }
}

export class KayKitDungeonplateFullFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonplateFull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/plateFull.fbx") }
}

export class KayKitDungeoncoinsLargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncoinsLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/coinsLarge.fbx") }
}

export class KayKitDungeonpotionMediumgreenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionMediumgreen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionMedium_green.fbx") }
}

export class KayKitDungeonscaffoldsmalllowcornerLeftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmalllowcornerLeft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_cornerLeft.fbx") }
}

export class KayKitDungeonbookcaseFilledFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookcaseFilled}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseFilled.fbx") }
}

export class KayKitDungeonscaffoldhighrailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldhighrailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high_railing.fbx") }
}

export class KayKitDungeonwallbrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallbroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_broken.fbx") }
}

export class KayKitDungeonchestuncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestuncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_uncommon.fbx") }
}

export class KayKitDungeonpotionMediumredFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionMediumred}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionMedium_red.fbx") }
}

export class KayKitDungeonwallDecorationAFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallDecorationA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallDecorationA.fbx") }
}

export class KayKitDungeonpotBFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potB.fbx") }
}

export class KayKitDungeonwallgateDoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallgateDoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_gateDoor.fbx") }
}

export class KayKitDungeonhammeruncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonhammeruncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/hammer_uncommon.fbx") }
}

export class KayKitDungeonscaffoldmediumrailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldmediumrailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium_railing.fbx") }
}

export class KayKitDungeonwallgateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallgate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_gate.fbx") }
}

export class KayKitDungeonwalldoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwalldoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_door.fbx") }
}

export class KayKitDungeonpotionLargeblueFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionLargeblue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionLarge_blue.fbx") }
}

export class KayKitDungeonscaffoldlowcornerBothFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldlowcornerBoth}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low_cornerBoth.fbx") }
}

export class KayKitDungeonbookcaseWidebrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookcaseWidebroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseWide_broken.fbx") }
}

export class KayKitDungeonscaffoldsmallhighcornerLeftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallhighcornerLeft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_cornerLeft.fbx") }
}

export class KayKitDungeonscaffoldmediumcornerLeftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldmediumcornerLeft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium_cornerLeft.fbx") }
}

export class KayKitDungeonfloorDecorationwoodRightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonfloorDecorationwoodRight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_woodRight.fbx") }
}

export class KayKitDungeontorchFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontorch}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/torch.fbx") }
}

export class KayKitDungeonscaffoldsmallhighFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallhigh}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high.fbx") }
}

export class KayKitDungeonscaffoldmediumcornerBothFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldmediumcornerBoth}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium_cornerBoth.fbx") }
}

export class KayKitDungeonchestcommonemptyFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestcommonempty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_common_empty.fbx") }
}

export class KayKitDungeonbookAFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookA.fbx") }
}

export class KayKitDungeonbookFFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookF}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookF.fbx") }
}

export class KayKitDungeonartifactFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonartifact}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/artifact.fbx") }
}

export class KayKitDungeontorchWallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontorchWall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/torchWall.fbx") }
}

export class KayKitDungeonwallSingleFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSingle}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle.fbx") }
}

export class KayKitDungeonwallSinglewindowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSinglewindow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_window.fbx") }
}

export class KayKitDungeonaxeuncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonaxeuncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axe_uncommon.fbx") }
}

export class KayKitDungeonbarrelFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbarrel}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/barrel.fbx") }
}

export class KayKitDungeonpotionMediumblueFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionMediumblue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionMedium_blue.fbx") }
}

export class KayKitDungeonscaffoldsmallhighrailinglongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallhighrailinglong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_railing_long.fbx") }
}

export class KayKitDungeonscaffoldmediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldmedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium.fbx") }
}

export class KayKitDungeoncratePlatformmediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncratePlatformmedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/cratePlatform_medium.fbx") }
}

export class KayKitDungeonwallSingledecorationBFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSingledecorationB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_decorationB.fbx") }
}

export class KayKitDungeonaxecommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonaxecommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axe_common.fbx") }
}

export class KayKitDungeonpotCdecoratedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotCdecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potC_decorated.fbx") }
}

export class KayKitDungeonbookEFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookE}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookE.fbx") }
}

export class KayKitDungeondoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeondoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/door.fbx") }
}

export class KayKitDungeondoorgateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeondoorgate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/door_gate.fbx") }
}

export class KayKitDungeonwallSinglecornerFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSinglecorner}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_corner.fbx") }
}

export class KayKitDungeonpotionLargeredFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionLargered}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionLarge_red.fbx") }
}

export class KayKitDungeonscaffoldsmallhighcornerRightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallhighcornerRight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_cornerRight.fbx") }
}

export class KayKitDungeonwallSinglesplitFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSinglesplit}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_split.fbx") }
}

export class KayKitDungeonchestraremimicFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestraremimic}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_rare_mimic.fbx") }
}

export class KayKitDungeoncrateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncrate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crate.fbx") }
}

export class KayKitDungeonbucketFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbucket}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bucket.fbx") }
}

export class KayKitDungeonaxerareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonaxerare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axe_rare.fbx") }
}

export class KayKitDungeonstaffuncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonstaffuncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/staff_uncommon.fbx") }
}

export class KayKitDungeonshieldcommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonshieldcommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/shield_common.fbx") }
}

export class KayKitDungeonscaffoldhighcornerBothFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldhighcornerBoth}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high_cornerBoth.fbx") }
}

export class KayKitDungeonpotionLargegreenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionLargegreen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionLarge_green.fbx") }
}

export class KayKitDungeonbookCFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookC.fbx") }
}

export class KayKitDungeonwallSinglebrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSinglebroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_broken.fbx") }
}

export class KayKitDungeonfloorDecorationtilesLargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonfloorDecorationtilesLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_tilesLarge.fbx") }
}

export class KayKitDungeonbookcaseWideFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookcaseWide}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseWide.fbx") }
}

export class KayKitDungeonpotionSmallgreenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionSmallgreen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionSmall_green.fbx") }
}

export class KayKitDungeonscaffoldhighFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldhigh}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high.fbx") }
}

export class KayKitDungeonhammercommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonhammercommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/hammer_common.fbx") }
}

export class KayKitDungeonwallendbrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallendbroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_end_broken.fbx") }
}

export class KayKitDungeonwallSingledecorationAFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSingledecorationA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_decorationA.fbx") }
}

export class KayKitDungeonquiveremptyFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonquiverempty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/quiver_empty.fbx") }
}

export class KayKitDungeonbookDFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookD}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookD.fbx") }
}

export class KayKitDungeonpillarFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpillar}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/pillar.fbx") }
}

export class KayKitDungeonscaffoldhighcornerRightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldhighcornerRight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high_cornerRight.fbx") }
}

export class KayKitDungeonweaponRackFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonweaponRack}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/weaponRack.fbx") }
}

export class KayKitDungeonbookOpenBFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookOpenB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookOpenB.fbx") }
}

export class KayKitDungeontableSmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontableSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tableSmall.fbx") }
}

export class KayKitDungeonaxeDoublecommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonaxeDoublecommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axeDouble_common.fbx") }
}

export class KayKitDungeonbarrelDarkFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbarrelDark}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/barrelDark.fbx") }
}

export class KayKitDungeonwallCornerFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallCorner}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallCorner.fbx") }
}

export class KayKitDungeonscaffoldsmalllowrailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmalllowrailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_railing.fbx") }
}

export class KayKitDungeonswordcommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonswordcommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/sword_common.fbx") }
}

export class KayKitDungeonaxeDoublerareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonaxeDoublerare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/axeDouble_rare.fbx") }
}

export class KayKitDungeonpotsFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpots}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/pots.fbx") }
}

export class KayKitDungeonfloorDecorationshatteredBricksFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonfloorDecorationshatteredBricks}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_shatteredBricks.fbx") }
}

export class KayKitDungeonquiverfullFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonquiverfull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/quiver_full.fbx") }
}

export class KayKitDungeonscaffoldsmallhighrailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallhighrailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_railing.fbx") }
}

export class KayKitDungeonstaffcommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonstaffcommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/staff_common.fbx") }
}

export class KayKitDungeonscaffoldsmalllowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmalllow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low.fbx") }
}

export class KayKitDungeontableLargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontableLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tableLarge.fbx") }
}

export class KayKitDungeonchestTopraremimicFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestTopraremimic}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_rare_mimic.fbx") }
}

export class KayKitDungeoncratePlatformsmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncratePlatformsmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/cratePlatform_small.fbx") }
}

export class KayKitDungeoncrossbowcommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncrossbowcommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crossbow_common.fbx") }
}

export class KayKitDungeontileBrickBsmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileBrickBsmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_small.fbx") }
}

export class KayKitDungeonwallSingledoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSingledoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_door.fbx") }
}

export class KayKitDungeonpillarbrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpillarbroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/pillar_broken.fbx") }
}

export class KayKitDungeonshieldrareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonshieldrare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/shield_rare.fbx") }
}

export class KayKitDungeonbookcaseFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookcase}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcase.fbx") }
}

export class KayKitDungeonscaffoldsmallmediumrailinglongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallmediumrailinglong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_railing_long.fbx") }
}

export class KayKitDungeonwallgateCornerFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallgateCorner}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_gateCorner.fbx") }
}

export class KayKitDungeonscaffoldhighcornerLeftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldhighcornerLeft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_high_cornerLeft.fbx") }
}

export class KayKitDungeonstairswideFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonstairswide}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/stairs_wide.fbx") }
}

export class KayKitDungeonbannerFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbanner}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/banner.fbx") }
}

export class KayKitDungeonstairsFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonstairs}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/stairs.fbx") }
}

export class KayKitDungeontileBrickBmediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileBrickBmedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_medium.fbx") }
}

export class KayKitDungeoncoinsSmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncoinsSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/coinsSmall.fbx") }
}

export class KayKitDungeonshielduncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonshielduncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/shield_uncommon.fbx") }
}

export class KayKitDungeontileSpikeslargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileSpikeslarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileSpikes_large.fbx") }
}

export class KayKitDungeonbenchFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbench}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bench.fbx") }
}

export class KayKitDungeonchestuncommonmimicFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestuncommonmimic}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_uncommon_mimic.fbx") }
}

export class KayKitDungeonstaffrareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonstaffrare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/staff_rare.fbx") }
}

export class KayKitDungeonchestTopcommonemptyFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestTopcommonempty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_common_empty.fbx") }
}

export class KayKitDungeonbookOpenAFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookOpenA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookOpenA.fbx") }
}

export class KayKitDungeonhammerrareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonhammerrare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/hammer_rare.fbx") }
}

export class KayKitDungeonpotAdecoratedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotAdecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potA_decorated.fbx") }
}

export class KayKitDungeonbricksFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbricks}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bricks.fbx") }
}

export class KayKitDungeonbookBFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookB.fbx") }
}

export class KayKitDungeonspellBookFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonspellBook}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/spellBook.fbx") }
}

export class KayKitDungeontileBrickBlargeCrackedBFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileBrickBlargeCrackedB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_largeCrackedB.fbx") }
}

export class KayKitDungeonchestcommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestcommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_common.fbx") }
}

export class KayKitDungeonbookcaseWideFilledbrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookcaseWideFilledbroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseWideFilled_broken.fbx") }
}

export class KayKitDungeonlootSackBFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonlootSackB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/lootSackB.fbx") }
}

export class KayKitDungeonfloorDecorationwoodFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonfloorDecorationwood}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_wood.fbx") }
}

export class KayKitDungeonmugFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonmug}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/mug.fbx") }
}

export class KayKitDungeontileBrickAmediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileBrickAmedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickA_medium.fbx") }
}

export class KayKitDungeonpotCFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potC.fbx") }
}

export class KayKitDungeondaggercommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeondaggercommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/dagger_common.fbx") }
}

export class KayKitDungeonchestrareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestrare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chest_rare.fbx") }
}

export class KayKitDungeondaggerrareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeondaggerrare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/dagger_rare.fbx") }
}

export class KayKitDungeonscaffoldsmallmediumrailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallmediumrailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium_railing.fbx") }
}

export class KayKitDungeonplateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonplate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/plate.fbx") }
}

export class KayKitDungeonscaffoldmediumcornerRightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldmediumcornerRight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_medium_cornerRight.fbx") }
}

export class KayKitDungeonstoolFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonstool}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/stool.fbx") }
}

export class KayKitDungeonswordrareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonswordrare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/sword_rare.fbx") }
}

export class KayKitDungeonscaffoldstairsFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldstairs}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_stairs.fbx") }
}

export class KayKitDungeontileBrickBlargeCrackedAFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileBrickBlargeCrackedA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_largeCrackedA.fbx") }
}

export class KayKitDungeonchestTopuncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestTopuncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_uncommon.fbx") }
}

export class KayKitDungeontileBrickAlargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileBrickAlarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickA_large.fbx") }
}

export class KayKitDungeonwallIntersectionFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallIntersection}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallIntersection.fbx") }
}

export class KayKitDungeonpotionSmallblueFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionSmallblue}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionSmall_blue.fbx") }
}

export class KayKitDungeonwallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall.fbx") }
}

export class KayKitDungeonwallSplitFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSplit}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSplit.fbx") }
}

export class KayKitDungeonscaffoldsmallmediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallmedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_medium.fbx") }
}

export class KayKitDungeonplateHalfFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonplateHalf}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/plateHalf.fbx") }
}

export class KayKitDungeonscaffoldsmalllowlongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmalllowlong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_long.fbx") }
}

export class KayKitDungeonfloorDecorationtilesSmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonfloorDecorationtilesSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/floorDecoration_tilesSmall.fbx") }
}

export class KayKitDungeonpotionSmallredFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotionSmallred}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potionSmall_red.fbx") }
}

export class KayKitDungeonwallSinglewindowGateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallSinglewindowGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallSingle_windowGate.fbx") }
}

export class KayKitDungeontileSpikesshallowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileSpikesshallow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileSpikes_shallow.fbx") }
}

export class KayKitDungeonwallDecorationBFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallDecorationB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wallDecorationB.fbx") }
}

export class KayKitDungeonscaffoldlowrailingFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldlowrailing}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low_railing.fbx") }
}

export class KayKitDungeonscaffoldlowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldlow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low.fbx") }
}

export class KayKitDungeoncratePlatformlargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncratePlatformlarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/cratePlatform_large.fbx") }
}

export class KayKitDungeonwallwindowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallwindow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_window.fbx") }
}

export class KayKitDungeonscaffoldsmalllowrailinglongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmalllowrailinglong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_railing_long.fbx") }
}

export class KayKitDungeoncoinFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncoin}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/coin.fbx") }
}

export class KayKitDungeonchestTopuncommonmimicFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestTopuncommonmimic}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_uncommon_mimic.fbx") }
}

export class KayKitDungeonpotAFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potA.fbx") }
}

export class KayKitDungeontileBrickBlargeFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileBrickBlarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickB_large.fbx") }
}

export class KayKitDungeonscaffoldsmalllowcornerRightFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmalllowcornerRight}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_low_cornerRight.fbx") }
}

export class KayKitDungeonchairFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchair}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chair.fbx") }
}

export class KayKitDungeonscaffoldsmallhighlongFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldsmallhighlong}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_small_high_long.fbx") }
}

export class KayKitDungeonarrowFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonarrow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/arrow.fbx") }
}

export class KayKitDungeonquiverhalffullFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonquiverhalffull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/quiver_half_full.fbx") }
}

export class KayKitDungeoncoinsMediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncoinsMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/coinsMedium.fbx") }
}

export class KayKitDungeonscaffoldlowcornerLeftFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonscaffoldlowcornerLeft}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/scaffold_low_cornerLeft.fbx") }
}

export class KayKitDungeonbookcaseFilledbrokenFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookcaseFilledbroken}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseFilled_broken.fbx") }
}

export class KayKitDungeonwallendFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallend}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_end.fbx") }
}

export class KayKitDungeontableMediumFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontableMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tableMedium.fbx") }
}

export class KayKitDungeonbookcaseWideFilledFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonbookcaseWideFilled}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/bookcaseWideFilled.fbx") }
}

export class KayKitDungeoncrossbowuncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeoncrossbowuncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/crossbow_uncommon.fbx") }
}

export class KayKitDungeonsworduncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonsworduncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/sword_uncommon.fbx") }
}

export class KayKitDungeonpotBdecoratedFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonpotBdecorated}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/potB_decorated.fbx") }
}

export class KayKitDungeontileBrickAsmallFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileBrickAsmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileBrickA_small.fbx") }
}

export class KayKitDungeonchestToprareFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestToprare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_rare.fbx") }
}

export class KayKitDungeondaggeruncommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeondaggeruncommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/dagger_uncommon.fbx") }
}

export class KayKitDungeontileSpikesFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontileSpikes}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/tileSpikes.fbx") }
}

export class KayKitDungeonwallwindowGateFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonwallwindowGate}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/wall_windowGate.fbx") }
}

export class KayKitDungeonchestTopcommonFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeonchestTopcommon}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/chestTop_common.fbx") }
}

export class KayKitDungeontrapdoorFab extends KayKitDungeonPack implements IAsset {
    get Id() {return Char.KayKitDungeontrapdoor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/dungeon_pack/fbx/trapdoor.fbx") }
}



