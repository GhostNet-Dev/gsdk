import * as THREE from "three";
import { IAsset } from "@Glibs/interface/iasset"
import { AssetModel } from "@Glibs/loader/assetmodel"
import { Loader } from "@Glibs/loader/loader"
import { Bind, Char, ModelType } from "@Glibs/types/assettypes"
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader"

class SpaceShipPack1Fab extends AssetModel {
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

    meshs.traverse(child => {
      child.castShadow = true
      child.receiveShadow = true
    })
    const scale = 1
    meshs.scale.set(scale, scale, scale)
  }
}

export class SpaceShipPack1BomberFab extends SpaceShipPack1Fab implements IAsset {
  get Id() { return Char.SpaceShipPack1Bomber }
  constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack1/bomber.fbx") }
}

export class SpaceShipPack1CarrierFab extends SpaceShipPack1Fab implements IAsset {
  get Id() { return Char.SpaceShipPack1Carrier }
  constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack1/carrier.fbx") }
}

export class SpaceShipPack1FighterFab extends SpaceShipPack1Fab implements IAsset {
  get Id() { return Char.SpaceShipPack1Fighter }
  constructor(loader: Loader) { super(loader, "assets/space/spaceship/pack1/fighter.fbx") }
}

