import * as THREE from "three";
import { FoliageMaterial } from "./foliagematerial";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { Loader } from "@Glibs/loader/loader";
import { Char } from "@Glibs/types/assettypes";

export class FluffyTree extends PhysicsObject {
  foliageMaterial: FoliageMaterial[] = []

  constructor(loader: Loader) {
    super(loader.GetAssets(Char.FluffyTree))
  }

  async createTree(
    rotation: THREE.Euler,
    position: THREE.Vector3,
    scale: number = 2,
    color: string = '#3f6d21',
    texturePath: string = 'assets/texture/foliage_alpha3.png',
  ) {
    const material = new FoliageMaterial(texturePath, color);
    const tree = await this.asset.CloneModel()
    const treeGroup = new THREE.Group();
    treeGroup.name = 'tree';
    treeGroup.position.copy(position);
    treeGroup.rotation.copy(rotation);

    // 트렁크 처리
    const trunk = tree.getObjectByName('trunk') as THREE.Mesh;
    if (trunk) {
      trunk.material = new THREE.MeshBasicMaterial({ color: 'black' });
      trunk.receiveShadow = true;
      trunk.castShadow = true;
      treeGroup.add(trunk.clone());
    }

    // 잎사귀 처리
    const foliage = tree.getObjectByName('foliage') as THREE.Mesh;
    if (foliage) {
      foliage.material = material.m
      foliage.receiveShadow = true;
      foliage.castShadow = true;
      treeGroup.add(foliage.clone());
      this.foliageMaterial.push(material)
    }
    this.meshs = treeGroup;
    this.meshs.scale.set(scale, scale, scale)
  }
  Dispose() {
    this.meshs.traverse((m) => {
      this.disposeMesh(m as THREE.Mesh)
    })
  }
  disposeMesh(mesh: THREE.Mesh): void {
    // Geometry 해제
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    // Material 해제
    this.foliageMaterial.forEach((f) => {
      f.m.dispose()
    })
  }

  update(delta: number): void {
    this.foliageMaterial.forEach(m => { m.update(delta) })
  }
}
