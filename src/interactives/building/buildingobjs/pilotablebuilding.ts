import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';

export class PilotableBuilding implements IBuildingObject {
    public readonly type = BuildingType.Pilotable;
    private isOccupied = false;
    private operator: any = null; // 실제 파일럿/플레이어 객체

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        if (this.isOccupied) {
            // 탑승 중일 때의 특수 효과나 상태 업데이트 (예: 레이더 회전 등)
            // console.log(`[Pilotable] Operating: ${this.id}`);
        }
    }

    onInteract(): void {
        this.isOccupied = !this.isOccupied;
        if (this.isOccupied) {
            console.log(`[Pilotable ${this.id}] Operator entered.`);
            // TODO: 플레이어 제어권 전환 로직
        } else {
            console.log(`[Pilotable ${this.id}] Operator left.`);
            // TODO: 플레이어 하차 로직
        }
    }

    destroy(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
