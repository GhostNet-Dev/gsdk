import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from "@Glibs/ux/selectionpanel/selectionpanel";

export class PilotableBuilding implements IBuildingObject {
    public readonly type = BuildingType.Pilotable;
    public level: number = 1;
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
        if (this.isOccupied) {
            this.exit();
        } else {
            this.enter();
        }
    }

    private enter() {
        this.isOccupied = true;
        console.log(`[Pilotable ${this.id}] Operator entered.`);
        // TODO: 플레이어 제어권 전환 로직
    }

    private exit() {
        this.isOccupied = false;
        console.log(`[Pilotable ${this.id}] Operator left.`);
        // TODO: 플레이어 하차 로직
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc || "조종사가 탑승하여 제어할 수 있는 시설입니다.",
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            status: this.isOccupied ? "상태: 운용 중" : "상태: 대기",
            commands: [
                {
                    id: "exit",
                    name: "하차",
                    icon: "🚪",
                    onClick: () => this.exit(),
                    isDisabled: () => !this.isOccupied
                }
            ]
        };
    }

    destroy(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
