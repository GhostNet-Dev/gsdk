import * as THREE from "three";
import { Loader } from "../loader";
import { AssetModel } from "../assetmodel";
import { IAsset } from "../iasset";
import { Ani, Char, ModelType } from "../assettypes";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";


class Oceanpack extends AssetModel {
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
            const scale = 1
            this.meshs.children[0].scale.set(scale, scale, scale)
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

        const bbox = new THREE.Box3().setFromObject(this.meshs.children[0])
        this.size = bbox.getSize(new THREE.Vector3)
        return this.size 
    }
}
/*
submarine.glb
small_coral.glb
small_boat.glb
pirate_ship.glb
long_plant.glb
crashed_ship.glb
chest_old.glb
chest.glb
anemonie.glb
 */
export class OceanStarterSubmarineFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterSubMarine}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/submarine.glb") }
}
export class OceanStarterSmallCoralFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterSmallCoral}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/small_coral.glb") }
}
export class OceanStarterSmallBoatFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterSmallBoat}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/small_boat.glb") }
}
export class OceanStarterPirateShipFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterPirateShip}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/pirate_ship.glb") }
}
export class OceanStarterLongPlantFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterLongPlant}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/long_plant.glb") }
}
export class OceanStarterCrashedShipFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterCrashedShip}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/crashed_ship.glb") }
}
export class OceanStarterChestOldFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterChestOld}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/chest_old.glb") }
}
export class OceanStarterChestFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterChest}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/chest.glb") }
}
export class OceanStarterAnemonieFab extends Oceanpack implements IAsset {
    get Id() {return Char.OceanStarterAnemonie}
    constructor(loader: Loader) { super(loader, "assets/oceans/starterpack/anemonie.glb") }
}