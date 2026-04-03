import * as THREE from "three";
import { IAsset } from "@Glibs/interface/iasset"
import { AssetModel } from "@Glibs/loader/assetmodel"
import { Loader } from "@Glibs/loader/loader"
import { Bind, Char, ModelType } from "@Glibs/types/assettypes"
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader"

const PACK2_MODEL_PATH = "assets/space/spaceship/pack2"
const PACK2_TEXTURE_PATH = {
  Blue: `${PACK2_MODEL_PATH}/T_Spase_blue.png`,
  Red: `${PACK2_MODEL_PATH}/T_Spase_64.png`,
} as const

type SpaceShipPack2TextureType = keyof typeof PACK2_TEXTURE_PATH

class SpaceShipPack2Fab extends AssetModel {
  gltf?: GLTF
  private texturePath: string

  constructor(loader: Loader, path: string, textureType: SpaceShipPack2TextureType = "Blue") {
    super(loader, ModelType.Fbx, path, async (meshs: THREE.Group) => {
      this.meshs = meshs
      this.InitMesh(meshs)
    })
    this.texturePath = PACK2_TEXTURE_PATH[textureType]
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
    tloader.load(this.texturePath, (texture) => {
      meshs.traverse(child => {
        child.castShadow = true
        child.receiveShadow = true
        if (child instanceof THREE.Mesh) {
          child.material.map = texture
          child.material.needsupdate = true
          child.material = new THREE.MeshToonMaterial({ map: child.material.map })
        }
      })
    })
    const scale = 0.01
    meshs.scale.set(scale, scale, scale)
  }
}

class SpaceShipPack2DestroyerBlue01BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_01.fbx`, "Blue") }
}
class SpaceShipPack2DestroyerBlue02BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_02.fbx`, "Blue") }
}
class SpaceShipPack2DestroyerBlue03BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_03.fbx`, "Blue") }
}
class SpaceShipPack2DestroyerBlue04BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_04.fbx`, "Blue") }
}
class SpaceShipPack2DestroyerBlue05BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_05.fbx`, "Blue") }
}

class SpaceShipPack2DestroyerRed01BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_01.fbx`, "Red") }
}
class SpaceShipPack2DestroyerRed02BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_02.fbx`, "Red") }
}
class SpaceShipPack2DestroyerRed03BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_03.fbx`, "Red") }
}
class SpaceShipPack2DestroyerRed04BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_04.fbx`, "Red") }
}
class SpaceShipPack2DestroyerRed05BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Destroyer_05.fbx`, "Red") }
}

class SpaceShipPack2LightCruiserBlue01BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_01.fbx`, "Blue") }
}
class SpaceShipPack2LightCruiserBlue02BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_02.fbx`, "Blue") }
}
class SpaceShipPack2LightCruiserBlue03BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_03.fbx`, "Blue") }
}
class SpaceShipPack2LightCruiserBlue04BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_04.fbx`, "Blue") }
}
class SpaceShipPack2LightCruiserBlue05BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_05.fbx`, "Blue") }
}

class SpaceShipPack2LightCruiserRed01BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_01.fbx`, "Red") }
}
class SpaceShipPack2LightCruiserRed02BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_02.fbx`, "Red") }
}
class SpaceShipPack2LightCruiserRed03BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_03.fbx`, "Red") }
}
class SpaceShipPack2LightCruiserRed04BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_04.fbx`, "Red") }
}
class SpaceShipPack2LightCruiserRed05BaseFab extends SpaceShipPack2Fab {
  constructor(loader: Loader) { super(loader, `${PACK2_MODEL_PATH}/Light cruiser_05.fbx`, "Red") }
}

export class SpaceShipPack2DestroyerBlue01Fab extends SpaceShipPack2DestroyerBlue01BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerBlue01}
}
export class SpaceShipPack2DestroyerBlue02Fab extends SpaceShipPack2DestroyerBlue02BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerBlue02}
}
export class SpaceShipPack2DestroyerBlue03Fab extends SpaceShipPack2DestroyerBlue03BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerBlue03}
}
export class SpaceShipPack2DestroyerBlue04Fab extends SpaceShipPack2DestroyerBlue04BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerBlue04}
}
export class SpaceShipPack2DestroyerBlue05Fab extends SpaceShipPack2DestroyerBlue05BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerBlue05}
}

export class SpaceShipPack2DestroyerRed01Fab extends SpaceShipPack2DestroyerRed01BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerRed01}
}
export class SpaceShipPack2DestroyerRed02Fab extends SpaceShipPack2DestroyerRed02BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerRed02}
}
export class SpaceShipPack2DestroyerRed03Fab extends SpaceShipPack2DestroyerRed03BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerRed03}
}
export class SpaceShipPack2DestroyerRed04Fab extends SpaceShipPack2DestroyerRed04BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerRed04}
}
export class SpaceShipPack2DestroyerRed05Fab extends SpaceShipPack2DestroyerRed05BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2DestroyerRed05}
}

export class SpaceShipPack2LightCruiserBlue01Fab extends SpaceShipPack2LightCruiserBlue01BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserBlue01}
}
export class SpaceShipPack2LightCruiserBlue02Fab extends SpaceShipPack2LightCruiserBlue02BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserBlue02}
}
export class SpaceShipPack2LightCruiserBlue03Fab extends SpaceShipPack2LightCruiserBlue03BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserBlue03}
}
export class SpaceShipPack2LightCruiserBlue04Fab extends SpaceShipPack2LightCruiserBlue04BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserBlue04}
}
export class SpaceShipPack2LightCruiserBlue05Fab extends SpaceShipPack2LightCruiserBlue05BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserBlue05}
}

export class SpaceShipPack2LightCruiserRed01Fab extends SpaceShipPack2LightCruiserRed01BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserRed01}
}
export class SpaceShipPack2LightCruiserRed02Fab extends SpaceShipPack2LightCruiserRed02BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserRed02}
}
export class SpaceShipPack2LightCruiserRed03Fab extends SpaceShipPack2LightCruiserRed03BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserRed03}
}
export class SpaceShipPack2LightCruiserRed04Fab extends SpaceShipPack2LightCruiserRed04BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserRed04}
}
export class SpaceShipPack2LightCruiserRed05Fab extends SpaceShipPack2LightCruiserRed05BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiserRed05}
}

// Legacy aliases keep existing IDs on the previous blue texture variant.
export class SpaceShipPack2Destroyer01Fab extends SpaceShipPack2DestroyerBlue01BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer01}
}
export class SpaceShipPack2Destroyer02Fab extends SpaceShipPack2DestroyerBlue02BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer02}
}
export class SpaceShipPack2Destroyer03Fab extends SpaceShipPack2DestroyerBlue03BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer03}
}
export class SpaceShipPack2Destroyer04Fab extends SpaceShipPack2DestroyerBlue04BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer04}
}
export class SpaceShipPack2Destroyer05Fab extends SpaceShipPack2DestroyerBlue05BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2Destroyer05}
}
export class SpaceShipPack2LightCruiser01Fab extends SpaceShipPack2LightCruiserBlue01BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser01}
}
export class SpaceShipPack2LightCruiser02Fab extends SpaceShipPack2LightCruiserBlue02BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser02}
}
export class SpaceShipPack2LightCruiser03Fab extends SpaceShipPack2LightCruiserBlue03BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser03}
}
export class SpaceShipPack2LightCruiser04Fab extends SpaceShipPack2LightCruiserBlue04BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser04}
}
export class SpaceShipPack2LightCruiser05Fab extends SpaceShipPack2LightCruiserBlue05BaseFab implements IAsset {
    get Id() {return Char.SpaceShipPack2LightCruiser05}
}
