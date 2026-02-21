import * as THREE from "three";
import { IAsset } from "@Glibs/interface/iasset";
import { IProjectileModel } from "./projectile";

export class KnifeModel implements IProjectileModel {
  private readonly container = new THREE.Group();
  private loadPromise?: Promise<void>;
  private loaded = false;

  get Meshs() {
    return this.container;
  }

  constructor(private asset?: IAsset) {
    this.container.visible = false;

    if (!this.asset) {
      this.attachFallbackMesh();
      this.loaded = true;
      return;
    }

    this.loadPromise = this.loadAssetModel();
  }

  create(position: THREE.Vector3): void {
    this.container.position.copy(position);
    this.container.visible = true;

    if (!this.loaded && !this.loadPromise && this.asset) {
      this.loadPromise = this.loadAssetModel();
    }
  }

  update(position: THREE.Vector3): void {
    if (!this.container.visible) return;
    this.container.position.copy(position);
    this.container.rotateZ(0.45);
  }

  release(): void {
    this.container.visible = false;
  }

  private async loadAssetModel() {
    if (!this.asset) return;

    try {
      const model = await this.asset.CloneModel();
      model.scale.setScalar(0.25);
      model.rotation.set(Math.PI / 2, 0, 0);
      model.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.castShadow = false;
        node.receiveShadow = false;
      });

      this.container.clear();
      this.container.add(model);
      this.loaded = true;
    } catch {
      this.container.clear();
      this.attachFallbackMesh();
      this.loaded = true;
    }
  }

  private attachFallbackMesh() {
    const geometry = new THREE.ConeGeometry(0.08, 0.55, 6);
    geometry.rotateX(Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
      color: 0xcfd6e0,
      metalness: 0.75,
      roughness: 0.25,
      emissive: 0x16202f,
      emissiveIntensity: 0.35,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.container.add(mesh);
  }
}
