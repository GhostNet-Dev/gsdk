import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


class UltimatePack extends AssetModel {
    gltf?:GLTF
    constructor(loader: Loader, path: string) { 
        super(loader, ModelType.Gltf, path, async (gltf: GLTF) => {
            this.gltf = gltf
            this.meshs = gltf.scene
            this.meshs.castShadow = true
            this.meshs.receiveShadow = true
            this.meshs.traverse(child => {
                child.castShadow = true
                child.receiveShadow = false
            })
            console.log(this.meshs)
            // const scale = 1
            // const size = this.GetSize(this.meshs)
            
            // this.meshs.position.y += (size.y / 2)
            // this.meshs.children[0].scale.set(scale, scale, scale)
        })
    }
    
    GetBodyMeshId() { return "mixamorigRightHand" }
    GetBox(mesh: THREE.Group) {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.box == undefined) {
            const s = this.GetSize(mesh)
            this.box = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), this.boxMat)
        }

        const p = this.GetBoxPos(mesh)
        this.box.position.set(p.x, p.y, p.z)
        return new THREE.Box3().setFromObject(this.box)
    }
    GetSize(mesh: THREE.Group): THREE.Vector3 {
        if (this.meshs == undefined) this.meshs = mesh
        if (this.size) return this.size

        // const bbox = new THREE.Box3().setFromObject(this.meshs)
        // this.size = bbox.getSize(new THREE.Vector3)
        this.size = new THREE.Vector3(2, 2, 2)
        return this.size 
    }
}
export class UltimateModPlatform2DCubeDirt1x1CenterFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform2DCubeDirt1x1Center}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/2D/Cube_Dirt_1x1Center.gltf") }
}
export class UltimateModPlatform2DCubeDirt1x1EndFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform2DCubeDirt1x1End}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/2D/Cube_Dirt_1x1End.gltf") }
}
export class UltimateModPlatform2DCubeGrass1x1CenterFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform2DCubeGrass1x1Center}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/2D/Cube_Grass_1x1Center.gltf") }
}
export class UltimateModPlatform2DCubeGrass1x1EndFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform2DCubeGrass1x1End}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/2D/Cube_Grass_1x1End.gltf") }
}

export class UltimateModPlatform3DCubeDirtCenterTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeDirtCenterTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Dirt_Center_Tall.gltf") }
}
export class UltimateModPlatform3DCubeDirtCornerTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeDirtCornerTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Dirt_Corner_Tall.gltf") }
}
export class UltimateModPlatform3DCubeDirtSideTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeDirtSideTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Dirt_Side_Tall.gltf") }
}
export class UltimateModPlatform3DCubeGrassBottomTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeGrassBottomTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Grass_Bottom_Tall.gltf") }
}
export class UltimateModPlatform3DCubeGrassCornerTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeGrassCornerTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Grass_Corner_Tall.gltf") }
}
export class UltimateModPlatform3DCubeGrassCornerBottomTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeGrassCornerBottomTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Grass_CornerBottom_Tall.gltf") }
}
export class UltimateModPlatform3DCubeGrassCornerCenterTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeGrassCornerCenterTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Grass_CornerCenter_Tall.gltf") }
}
export class UltimateModPlatform3DCubeGrassSideBottomTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeGrassSideBottomTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Grass_SideBottom_Tall.gltf") }
}
export class UltimateModPlatform3DCubeGrassSideCenterTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeGrassSideCenterTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Grass_SideCenter_Tall.gltf") }
}
export class UltimateModPlatform3DCubeGrassSideTallFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatform3DCubeGrassSideTall}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/3D/Cube_Grass_Side_Tall.gltf") }
}
export class UltimateModPlatformSingleCubeDirtFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatformSingleCubeDirt}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/SingleCube/Cube_Dirt_Single.gltf") }
}
export class UltimateModPlatformSingleCubeGrassFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatformSingleCubeGrass}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/SingleCube/Cube_Grass_Single.gltf") }
}
export class UltimateModPlatformSingleHeightDirtCenterFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatformSingleHeightDirtCenter}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/SingleHeight/Cube_Dirt_Center.gltf") }
}
export class UltimateModPlatformSingleHeightDirtCornerFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatformSingleHeightDirtCorner}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/SingleHeight/Cube_Dirt_Corner.gltf") }
}
export class UltimateModPlatformSingleHeightDirtSideFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatformSingleHeightDirtSide}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/SingleHeight/Cube_Dirt_Side.gltf") }
}
export class UltimateModPlatformSingleHeightGrassCenterFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatformSingleHeightGrassCenter}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/SingleHeight/Cube_Grass_Center.gltf") }
}
export class UltimateModPlatformSingleHeightGrassCornerFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatformSingleHeightGrassCorner}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/SingleHeight/Cube_Grass_Corner.gltf") }
}
export class UltimateModPlatformSingleHeightGrassSideFab extends UltimatePack implements IAsset {
    get Id() {return Char.UltimateModPlatformSingleHeightGrassSide}
    constructor(loader: Loader) { super(loader, "assets/ultimatepack/ModularPlatforms/SingleHeight/Cube_Grass_Side.gltf") }
}