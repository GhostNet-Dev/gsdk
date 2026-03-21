import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';

export class ResourceProduction extends BaseBuilding {
    private productionTimer = 0;
    private readonly productionInterval = 5.0; // 5초마다 자원 생산
    private collectedAmount = 0;

    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
    ) {
        super(id, BuildingType.ResourceProduction, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void {
        if (this.isUpgrading) return;
        
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

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).map(t => ({
            ...t,
            onClick: () => {
                if (t.id === "collect") this.collect();
                if (t.type === "research" && t.targetId) {
                    this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                }
            },
            isDisabled: () => this.isUpgrading || (t.id === "collect" && this.collectedAmount <= 0)
        }));
    }

    protected getStatusText(): string {
        return `미수집 자원: ${this.collectedAmount}`;
    }

    protected getSpecificProgress(): number | undefined {
        return this.productionTimer / this.productionInterval;
    }
}
