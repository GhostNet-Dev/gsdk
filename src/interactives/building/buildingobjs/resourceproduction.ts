import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export class ResourceProduction implements IBuildingObject {
    public readonly type = BuildingType.ResourceProduction;
    public level: number = 1;
    private productionTimer = 0;
    private readonly productionInterval = 5.0; // 5초마다 자원 생산
    private collectedAmount = 0;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D,
        public readonly eventCtrl: IEventController
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        this.productionTimer += delta;
        if (this.productionTimer >= this.productionInterval) {
            this.collectedAmount += 10 * this.level;
            this.productionTimer = 0;
        }
    }

    private collect() {
        if (this.collectedAmount > 0) {
            this.eventCtrl.SendEventMessage(EventTypes.Gold, this.collectedAmount);
            console.log(`[Resource] Collected ${this.collectedAmount} gold.`);
            this.collectedAmount = 0;
        }
    }

    destroy(): void {
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc,
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            status: `미수집 자원: ${this.collectedAmount}`,
            progress: this.productionTimer / this.productionInterval,
            commands: (this.property.commands || []).map(t => ({
                ...t,
                onClick: () => {
                    if (t.id === "collect") this.collect();
                    if (t.type === "research" && t.targetId) {
                        this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                    }
                },
                isDisabled: () => (t.id === "collect" && this.collectedAmount <= 0)
            }))
        };
    }
}
