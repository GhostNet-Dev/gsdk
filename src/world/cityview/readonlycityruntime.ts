import * as THREE from "three";
import { Loader } from "@Glibs/loader/loader";
import { ReadonlyCityLayoutSnapshot, ReadonlyCityObjectKind } from "./cityviewtypes";

export class ReadonlyCityRuntime {
  readonly root = new THREE.Group();
  private readonly customMaterials = new Set<THREE.Material>();

  constructor(private readonly loader: Loader) {
    this.root.name = "readonly-city-runtime";
  }

  async render(snapshot: ReadonlyCityLayoutSnapshot): Promise<void> {
    this.clearRoot();

    for (const object of snapshot.objects) {
      const asset = this.loader.GetAssets(object.assetKey);
      const model = await asset.CloneModel();
      model.position.copy(object.position);
      model.rotation.y = object.rotationY;
      model.scale.setScalar(object.scale);
      model.traverse((child) => {
        child.castShadow = true;
        child.receiveShadow = true;
      });

      if (object.kind === ReadonlyCityObjectKind.ConstructionSite) {
        this.applyConstructionMaterial(model);
      }

      this.root.add(model);
    }
  }

  attach(scene: THREE.Scene): void {
    if (!this.root.parent) {
      scene.add(this.root);
    }
  }

  dispose(): void {
    this.clearRoot();
    this.root.parent?.remove(this.root);
  }

  private clearRoot(): void {
    this.root.clear();
    for (const material of this.customMaterials) {
      material.dispose();
    }
    this.customMaterials.clear();
  }

  private applyConstructionMaterial(model: THREE.Object3D): void {
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      if (Array.isArray(child.material)) {
        child.material = child.material.map((material) => {
          const nextMaterial = material.clone();
          nextMaterial.transparent = true;
          nextMaterial.opacity = 0.45;
          nextMaterial.depthWrite = false;
          this.customMaterials.add(nextMaterial);
          return nextMaterial;
        });
        return;
      }

      const nextMaterial = child.material.clone();
      nextMaterial.transparent = true;
      nextMaterial.opacity = 0.45;
      nextMaterial.depthWrite = false;
      child.material = nextMaterial;
      this.customMaterials.add(nextMaterial);
    });
  }
}
