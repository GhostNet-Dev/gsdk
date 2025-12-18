import * as THREE from "three";
import { AssetModel } from "@Glibs/loader/assetmodel";
import { Loader } from "@Glibs/loader/loader";
import { Bind, Char, ModelType } from "@Glibs/types/assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { IAsset } from "@Glibs/interface/iasset";

class KaykitMedHexagonDecorationNaturePackFab extends AssetModel {
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

export class KaykitMedHexagonDecorationNaturePackCloudBigFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackCloudBig}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/cloud_big.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackCloudSmallFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackCloudSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/cloud_small.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillSingleAFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillSingleA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hill_single_A.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillSingleBFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillSingleB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hill_single_B.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillSingleCFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillSingleC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hill_single_C.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillsAFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillsA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hills_A.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillsATreesFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillsATrees}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hills_A_trees.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillsBFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillsB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hills_B.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillsBTreesFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillsBTrees}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hills_B_trees.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillsCFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillsC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hills_C.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackHillsCTreesFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackHillsCTrees}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/hills_C_trees.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainAFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_A.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainAGrassFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainAGrass}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_A_grass.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainAGrassTreesFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainAGrassTrees}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_A_grass_trees.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainBFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_B.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainBGrassFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainBGrass}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_B_grass.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainBGrassTreesFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainBGrassTrees}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_B_grass_trees.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainCFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_C.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainCGrassFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainCGrass}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_C_grass.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackMountainCGrassTreesFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackMountainCGrassTrees}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/mountain_C_grass_trees.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackRockSingleAFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackRockSingleA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/rock_single_A.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackRockSingleBFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackRockSingleB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/rock_single_B.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackRockSingleCFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackRockSingleC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/rock_single_C.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackRockSingleDFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackRockSingleD}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/rock_single_D.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackRockSingleEFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackRockSingleE}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/rock_single_E.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreeSingleAFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreeSingleA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/tree_single_A.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreeSingleACutFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreeSingleACut}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/tree_single_A_cut.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreeSingleBFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreeSingleB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/tree_single_B.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreeSingleBCutFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreeSingleBCut}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/tree_single_B_cut.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreesACutFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreesACut}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/trees_A_cut.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreesALargeFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreesALarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/trees_A_large.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreesAMediumFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreesAMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/trees_A_medium.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreesASmallFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreesASmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/trees_A_small.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreesBCutFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreesBCut}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/trees_B_cut.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreesBLargeFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreesBLarge}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/trees_B_large.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreesBMediumFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreesBMedium}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/trees_B_medium.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackTreesBSmallFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackTreesBSmall}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/trees_B_small.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackWaterlilyAFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackWaterlilyA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/waterlily_A.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackWaterlilyBFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackWaterlilyB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/waterlily_B.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackWaterplantAFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackWaterplantA}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/waterplant_A.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackWaterplantBFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackWaterplantB}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/waterplant_B.fbx") }
}

export class KaykitMedHexagonDecorationNaturePackWaterplantCFab extends KaykitMedHexagonDecorationNaturePackFab implements IAsset {
    get Id() {return Char.KaykitMedHexagonDecorationNaturePackWaterplantC}
    constructor(loader: Loader) { super(loader, "assets/kaykit/medieval_hexagon_pack/decoration/nature/waterplant_C.fbx") }
}