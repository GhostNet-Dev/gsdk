import * as THREE from "three";
import { Loader } from "../../loader";
import { AssetModel } from "../../assetmodel";
import { IAsset } from "../../iasset";
import { Bind, Char, ModelType } from "../../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

class KayKitItems extends AssetModel {
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

/*
arrow.fbx
arrow_bundle.fbx
axe_1handed.fbx
axe_2handed.fbx
crossbow_1handed.fbx
crossbow_2handed.fbx
dagger.fbx
mug_empty.fbx
mug_full.fbx
quiver.fbx
shield_badge.fbx
shield_badge_color.fbx
shield_round.fbx
shield_round_barbarian.fbx
shield_round_color.fbx
shield_spikes.fbx
shield_spikes_color.fbx
shield_square.fbx
shield_square_color.fbx

*/
export class KayKitArrowFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvArrow}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/arrow.fbx") }
}
export class KayKitArrowBundleFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvArrowBundle}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/arrow_bundle.fbx") }
}
export class KayKitAxe1HandedFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvAxe1Handed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/axe_1handed.fbx") }
}
export class KayKitAxe2HandedFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvAxe2Handed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/axe_2handed.fbx") }
}
export class KayKitCrossbow1HandedFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvCrossbow1Handed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/crossbow_1handed.fbx") }
}
export class KayKitCrossbow2HandedFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvCrossbow2Handed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/crossbow_2handed.fbx") }
}
export class KayKitDaggerFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvDagger}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/dagger.fbx") }
}
export class KayKitMugEmptyFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvMugEmpty}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/mug_empty.fbx") }
}
export class KayKitMugFullFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvMugFull}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/mug_full.fbx") }
}
export class KayKitQuiverFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvQuiver}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/quiver.fbx") }
}
export class KayKitShieldBadgeFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldBadge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_badge.fbx") }
}
export class KayKitShieldBadgeColorFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldBadgeColor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_badge_color.fbx") }
}
export class KayKitShieldRoundFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldRound}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_round.fbx") }
}
export class KayKitShieldRoundBarbarianFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldRoundBarbarian}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_round_barbarian.fbx") }
}
export class KayKitShieldRoundColorFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldRoundColor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_round_color.fbx") }
}
export class KayKitShieldSpikesFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldSpikes}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_spikes.fbx") }
}
export class KayKitShieldSpikesColorFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldSpikesColor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_spikes_color.fbx") }
}
export class KayKitShieldSquareFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldSquare}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_square.fbx") }
}
export class KayKitShieldSquareColorFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvShieldSquareColor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/shield_square_color.fbx") }
}
/*
smokebomb.fbx
spellbook_closed.fbx
spellbook_open.fbx
staff.fbx
sword_1handed.fbx
sword_2handed.fbx
sword_2handed_color.fbx
wand.fbx
*/

export class KayKitSmokeBombFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvSmokeBomb}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/smokebomb.fbx") }
}
export class KayKitSpellbookClosedFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvSpellbookClosed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/spellbook_closed.fbx") }
}
export class KayKitSpellbookOpenFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvSpellbookOpen}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/spellbook_open.fbx") }
}
export class KayKitStaffFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvStaff}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/staff.fbx") }
}
export class KayKitSword1HandedFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvSword1Handed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/sword_1handed.fbx") }
}
export class KayKitSword2HandedFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvSword2Handed}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/sword_2handed.fbx") }
}
export class KayKitSword2HandedColorFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvSword2HandedColor}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/sword_2handed_color.fbx") }
}
export class KayKitWandFab extends KayKitItems implements IAsset {
    get Id() {return Char.KayKitAdvWand}
    constructor(loader: Loader) { super(loader, "assets/kaykit/items/wand.fbx") }
}

