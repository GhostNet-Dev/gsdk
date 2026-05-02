import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes, UnitProducedPayload } from '@Glibs/types/globaltypes';
import { AllyId } from '@Glibs/actors/allies/allytypes';
import { BuildingProperty } from '../buildingdefs';
import IEventController from '@Glibs/interface/ievent';

export class UnitProduction extends BaseBuilding {
    private isProducing = false;
    private currentUnit: AllyId | null = null;
    private unitProductionTimer = 0;
    private readonly unitProductionTime = 5.0;

    constructor(
        id: string,
        property: BuildingProperty,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: IEventController
    ) {
        super(id, BuildingType.UnitProduction, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void {
        if (this.isProducing) {
            this.unitProductionTimer += delta;
            if (this.unitProductionTimer >= this.unitProductionTime) {
                this.spawnUnit();
            }
        }
    }

    private startProduction(allyId: AllyId) {
        if (this.isProducing || this.isUpgrading) return;
        this.isProducing = true;
        this.currentUnit = allyId;
        this.unitProductionTimer = 0;
        console.log(`[Production] Started: ${allyId}`);
    }

    private spawnUnit() {
        if (this.currentUnit) {
            this.eventCtrl.SendEventMessage(EventTypes.UnitProduced, {
                allyId: this.currentUnit,
                count: 1,
                buildingId: this.id,
            } satisfies UnitProducedPayload);
        }
        this.isProducing = false;
        this.currentUnit = null;
    }

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).map(t => ({
            ...t,
            onClick: () => {
                if (t.type === "produce" && t.targetId) this.startProduction(t.targetId);
                if (t.type === "research" && t.targetId) {
                    this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                }
            },
            isDisabled: () => this.isProducing || this.isUpgrading
        }));
    }

    protected getStatusText(): string {
        return this.isProducing ? `${this.currentUnit} 생산 중...` : "대기 중";
    }

    protected getSpecificProgress(): number | undefined {
        return this.isProducing ? (this.unitProductionTimer / this.unitProductionTime) : undefined;
    }
}
