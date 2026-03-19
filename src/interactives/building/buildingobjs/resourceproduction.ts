import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';

export class ResourceProduction implements IBuildingObject {
    public readonly type = BuildingType.ResourceProduction;
    private timer = 0;
    private readonly productionCooldown = 10.0; // 10초마다 자원 생산
    private readonly amount = 10;
    private readonly resourceType = "gold";

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        this.timer += delta;
        if (this.timer >= this.productionCooldown) {
            this.produce();
            this.timer = 0;
        }
    }

    private produce(): void {
        console.log(`[Resource ${this.id}] Produced ${this.amount} ${this.resourceType}.`);
        // TODO: 전역 자원(Wallet) 업데이트 이벤트 전송
    }

    onInteract(): void {
        console.log(`[Resource ${this.id}] Collecting resources manually?`);
    }

    destroy(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
