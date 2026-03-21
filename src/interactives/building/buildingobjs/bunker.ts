import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from "@Glibs/ux/selectionpanel/selectionpanel";

export class Bunker implements IBuildingObject {
    public readonly type = BuildingType.Bunker;
    public level: number = 1;
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

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc || "보병 유닛을 보호하는 방어 시설입니다.",
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp }, // 실제 HP 시스템 연결 전이므로 기본값 사용
            status: `유닛 수용 중 (${this.unitsInside.length}/${this.capacity})`,
            commands: [
                {
                    id: "eject_all",
                    name: "모두 퇴거",
                    icon: "🚪",
                    onClick: () => this.ejectAll(),
                    isDisabled: () => this.unitsInside.length === 0
                }
            ]
        };
    }

    ejectAll() {
        console.log(`[Bunker ${this.id}] Ejecting all units.`);
        this.unitsInside = [];
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
