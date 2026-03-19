import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';

export class Bunker implements IBuildingObject {
    public readonly type = BuildingType.Bunker;
    private unitsInside: any[] = [];
    private readonly capacity = 4;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        if (this.unitsInside.length > 0) {
            // 안에서 쏘는 효과 등
            // console.log(`[Bunker ${this.id}] Providing cover for ${this.unitsInside.length} units.`);
        }
    }

    onInteract(): void {
        console.log(`[Bunker ${this.id}] Unit entering/leaving.`);
    }

    addUnit(unit: any): boolean {
        if (this.unitsInside.length >= this.capacity) return false;
        this.unitsInside.push(unit);
        return true;
    }

    destroy(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
        // 안에 있던 유닛 밖으로 쫓아냄
        this.unitsInside = [];
    }
}
