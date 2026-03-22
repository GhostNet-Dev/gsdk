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
            const amount = 10 * this.level;
            this.eventCtrl.SendEventMessage(this.getResourceType(), amount);
            this.productionTimer = 0;
        }
    }

    protected onAdvanceTurn(): void {
        if (this.isUpgrading) return;

        const amount = 20 * this.level;
        this.eventCtrl.SendEventMessage(this.getResourceType(), amount);
    }

    private getResourceType(): string {
        const id = this.property.id.toLowerCase();
        if (id.includes('wood') || id.includes('lumber')) return EventTypes.Wood;
        if (id.includes('well') || id.includes('water')) return EventTypes.Water;
        if (id.includes('windmill')) return EventTypes.Electric;
        if (id.includes('watermill') || id.includes('food')) return EventTypes.Food;
        return EventTypes.Gold;
    }

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).filter(t => t.id !== "collect").map(t => ({
            ...t,
            onClick: () => {
                if (t.type === "research" && t.targetId) {
                    this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                }
            },
            isDisabled: () => this.isUpgrading
        }));
    }

    protected getStatusText(): string {
        return "자원 생산 중";
    }

    protected getSpecificProgress(): number | undefined {
        return this.productionTimer / this.productionInterval;
    }
}
