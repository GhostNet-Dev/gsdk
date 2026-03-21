import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from "@Glibs/ux/selectionpanel/selectionpanel";

export class ResourceProduction implements IBuildingObject {
    public readonly type = BuildingType.ResourceProduction;
    public level: number = 1;
    private timer = 0;
    private readonly productionCooldown = 10.0; // 10초마다 자원 생산
    private readonly amount = 10;
    private readonly resourceType = "gold";
    private collectedAmount = 0;

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
        this.collectedAmount += this.amount;
        console.log(`[Resource ${this.id}] Produced ${this.amount} ${this.resourceType}. Current: ${this.collectedAmount}`);
    }

    private collect(): void {
        console.log(`[Resource ${this.id}] Collected ${this.collectedAmount} ${this.resourceType}.`);
        this.collectedAmount = 0;
        // TODO: 전역 자원(Wallet) 업데이트
    }

    private upgrade(): void {
        this.level++;
        console.log(`[Resource ${this.id}] Upgraded to level ${this.level}.`);
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc || "자원을 생산하는 시설입니다.",
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            status: `생산된 자원: ${this.collectedAmount}`,
            progress: this.timer / this.productionCooldown,
            commands: [
                {
                    id: "collect",
                    name: "자원 수집",
                    icon: "💰",
                    onClick: () => this.collect(),
                    isDisabled: () => this.collectedAmount === 0
                },
                {
                    id: "upgrade",
                    name: "업그레이드",
                    icon: "🔼",
                    onClick: () => this.upgrade()
                }
            ]
        };
    }

    onInteract(): void {
        console.log(`[Resource ${this.id}] Collecting resources manually?`);
        this.collect();
    }

    destroy(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
