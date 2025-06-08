// src/projectiles/BulletLine.ts
import * as THREE from "three";
import { IProjectileModel } from "./projectile";

export class BulletLine implements IProjectileModel {
  private line?: THREE.Line;
  private positions!: THREE.BufferAttribute;
  private readonly segmentCount = 10;

  private history: THREE.Vector3[] = [];

  get Meshs(): THREE.Line | undefined {
    return this.line;
  }

  create(position: THREE.Vector3): void {
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i < this.segmentCount; i++) {
      color.setHSL(0.6, 1, Math.pow(1 - i / (this.segmentCount - 1), 4));
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(this.segmentCount * 3);
    this.positions = new THREE.BufferAttribute(posArray, 3);
    geometry.setAttribute("position", this.positions);
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });

    this.line = new THREE.Line(geometry, material);

    // 위치 히스토리 초기화
    this.history = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.history.push(position.clone());
      this.positions.setXYZ(i, position.x, position.y, position.z);
    }
    this.positions.needsUpdate = true;
  }

  update(currentPos: THREE.Vector3): void {
    if (!this.line || !this.positions) return;

    // 새 위치 삽입 (맨 앞에)
    this.history.unshift(currentPos.clone());

    // 오래된 히스토리 제거
    if (this.history.length > this.segmentCount) {
      this.history.length = this.segmentCount;
    }

    // 버퍼 업데이트
    for (let i = 0; i < this.history.length; i++) {
      const p = this.history[i];
      this.positions.setXYZ(i, p.x, p.y, p.z);
    }

    this.positions.needsUpdate = true;
  }

  release(): void {
    if (this.line?.geometry) this.line.geometry.dispose();
    if (this.line?.material instanceof THREE.Material) this.line.material.dispose();
    this.line = undefined;
    this.history = [];
  }
}
