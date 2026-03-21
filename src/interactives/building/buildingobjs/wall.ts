import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from "@Glibs/ux/selectionpanel/selectionpanel";

export class Wall implements IBuildingObject {
    public readonly type = BuildingType.Wall;
    public level: number = 1;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        // 성벽은 보통 정적인 상태 유지
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc || "진입을 막는 견고한 장벽입니다.",
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            commands: [
                {
                    id: "repair",
                    name: "수리",
                    icon: "🔧",
                    onClick: () => { console.log(`[Wall ${this.id}] Repaired.`); }
                },
                {
                    id: "upgrade",
                    name: "업그레이드",
                    icon: "🔼",
                    onClick: () => { this.level++; console.log(`[Wall ${this.id}] Upgraded to level ${this.level}.`); }
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
