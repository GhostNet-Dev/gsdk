import * as THREE from "three";
import { IAsset } from "@Glibs/interface/iasset";
import { IProjectileModel } from "./projectile";

export class KnifeModel implements IProjectileModel {
  private readonly container = new THREE.Group();
  private loaded = false;

  get Meshs() {
    return this.container;
  }

  constructor(private asset?: IAsset) {
    this.container.visible = false;
  }

  async init() {
    if (!this.asset || this.loaded) return;

    try {
      const model = await this.asset.CloneModel();
      model.scale.setScalar(1.2);
      
      // FBX 모델의 기본 축을 보정 (앞을 바라보도록)
      model.rotation.set(Math.PI / 2, 0, 0); 
      
      model.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = false;
        }
      });

      this.container.add(model);
      this.loaded = true;
    } catch (err) {
      console.error("Failed to load knife asset:", err);
      this.attachDebugMesh();
    }
  }

  create(position: THREE.Vector3, direction?: THREE.Vector3): void {
    this.container.position.copy(position);
    
    if (direction && direction.lengthSq() > 0.00001) {
        // 진행 방향을 바라보도록 회전 설정
        const targetPos = position.clone().add(direction);
        this.container.lookAt(targetPos);
    }
    
    this.container.visible = this.loaded;
  }

  update(position: THREE.Vector3): void {
    if (!this.container.visible || !this.loaded) return;
    this.container.position.copy(position);
  }

  release(): void {
    this.container.visible = false;
  }

  private attachDebugMesh() {
    const geometry = new THREE.BoxGeometry(0.05, 0.05, 0.4);
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.container.add(new THREE.Mesh(geometry, material));
    this.loaded = true;
  }
}
