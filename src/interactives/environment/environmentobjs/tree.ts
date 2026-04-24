import * as THREE from 'three';
import { IEnvironmentObject } from '../ienvironmentobj';
import { EnvironmentProperty } from '../environmentdefs';
import IEventController from '@Glibs/interface/ievent';
import { StaticColliderRegistry } from '../staticcolliderregistry';

export class Tree implements IEnvironmentObject {
    currentAmount: number;
    isDepleted: boolean = false;
    
    constructor(
        public readonly id: string,
        public readonly property: EnvironmentProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D | null,
        private eventCtrl: IEventController,
        public readonly collider: THREE.Object3D | null = null,
        private colliderRegistry?: StaticColliderRegistry,
        public instanceIndex?: number,
        public instancedMeshParts?: THREE.InstancedMesh[],
        public baseMatrix?: THREE.Matrix4
    ) {
        this.currentAmount = property.initialAmount;
    }

    update(delta: number) {
        // 바람에 흔들리는 등의 시각 효과를 넣을 수 있음
    }

    advanceTurn() {
        if (this.isDepleted) return;
        
        // 턴당 회복 로직
        if (this.property.regenerationRate) {
            this.currentAmount = Math.min(this.property.initialAmount, this.currentAmount + this.property.regenerationRate);
        }
    }

    harvest(amount: number): number {
        if (this.isDepleted) return 0;

        const actualHarvest = Math.min(this.currentAmount, amount);
        this.currentAmount -= actualHarvest;

        // 시각적 피드백 (잠시 흔들림)
        this.shakeEffect();

        if (this.currentAmount <= 0) {
            this.deplete();
        }

        return actualHarvest;
    }

    private shakeEffect() {
        if (this.instanceIndex !== undefined && this.instancedMeshParts) {
            // InstancedMesh의 경우 간단한 흔들림은 구현이 복잡하므로 일단 생략하거나 
            // 쉐이더를 통해 구현하는 것이 좋습니다.
            return;
        }

        if (!this.mesh) return;
        const originalPos = this.mesh.position.clone();
        const duration = 200;
        const start = Date.now();

        const animate = () => {
            const elapsed = Date.now() - start;
            if (elapsed < duration) {
                this.mesh!.position.x = originalPos.x + Math.sin(elapsed * 0.1) * 0.1;
                requestAnimationFrame(animate);
            } else {
                this.mesh!.position.copy(originalPos);
            }
        };
        animate();
    }

    private deplete() {
        this.isDepleted = true;
        
        if (this.instanceIndex !== undefined && this.instancedMeshParts) {
            const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
            this.instancedMeshParts.forEach(part => {
                part.setMatrixAt(this.instanceIndex!, zeroMatrix);
                part.instanceMatrix.needsUpdate = true;
            });
        }

        this.colliderRegistry?.unregister(this.id);

        if (this.mesh) {
            this.mesh.visible = false;
        }
    }

    dispose() {
        if (this.instanceIndex !== undefined && this.instancedMeshParts) {
            const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
            this.instancedMeshParts.forEach(part => {
                part.setMatrixAt(this.instanceIndex!, zeroMatrix);
                part.instanceMatrix.needsUpdate = true;
            });
        }

        this.colliderRegistry?.unregister(this.id);
        this.mesh?.parent?.remove(this.mesh);
    }
}
