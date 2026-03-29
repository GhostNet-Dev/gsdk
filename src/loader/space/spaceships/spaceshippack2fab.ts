import * as THREE from "three";
import { IAsset } from "@Glibs/interface/iasset"
import { AssetModel } from "@Glibs/loader/assetmodel"
import { Loader } from "@Glibs/loader/loader"
import { Bind, Char, ModelType } from "@Glibs/types/assettypes"
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader"

class SpaceShipPack2Fab extends AssetModel {
  gltf?: GLTF
  constructor(loader: Loader, path: string) {
    super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
      this.meshs = meshs
      this.InitMesh(meshs)
    })
  }
  GetBodyMeshId(bind: Bind) {
    switch (bind) {
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

    const tloader = new THREE.TextureLoader()
    meshs.traverse(child => {
      child.castShadow = true
      child.receiveShadow = true
      if (child instanceof THREE.Mesh)
        // tloader.load("assets/space/spaceship/pack2/T_Spase_64.png", (texture) => {
        tloader.load("assets/space/spaceship/pack2/T_Spase_blue.png", (texture) => {
          child.material.map = texture
          child.material.needsupdate = true
          child.material = new THREE.MeshToonMaterial({ map: child.material.map })
        })
    })
    const scale = 0.01
    meshs.scale.set(scale, scale, scale)
  }
}
export class SpaceShipPack2Destroyer01Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer01}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Destroyer_01.fbx") }
}

export class SpaceShipPack2Destroyer02Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer02}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Destroyer_02.fbx") }
}

export class SpaceShipPack2Destroyer03Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer03}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Destroyer_03.fbx") }
}

export class SpaceShipPack2Destroyer04Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer04}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Destroyer_04.fbx") }
}

export class SpaceShipPack2Destroyer05Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer05}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Destroyer_05.fbx") }
}

export class SpaceShipPack2LightCruiser01Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser01}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Light cruiser_01.fbx") }
}

export class SpaceShipPack2LightCruiser02Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser02}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Light cruiser_02.fbx") }
}

export class SpaceShipPack2LightCruiser03Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser03}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Light cruiser_03.fbx") }
}

export class SpaceShipPack2LightCruiser04Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser04}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Light cruiser_04.fbx") }
}

export class SpaceShipPack2LightCruiser05Fab extends SpaceShipPack2Fab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser05}
    constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack2/Light cruiser_05.fbx") }
}