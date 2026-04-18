import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';

export class UnitProduction extends BaseBuilding {
    private isProducing = false;
    private currentUnit: string | null = null;
    private unitProductionTimer = 0;
    private readonly unitProductionTime = 5.0;

    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
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

    private startProduction(unitId: string) {
        if (this.isProducing || this.isUpgrading) return;
        this.isProducing = true;
        this.currentUnit = unitId;
        this.unitProductionTimer = 0;
        console.log(`[Production] Started: ${unitId}`);
    }

    private spawnUnit() {
        if (this.currentUnit) {
            this.eventCtrl.SendEventMessage(EventTypes.SpawnProjectile, { 
                type: "spawn", 
                unitId: this.currentUnit, 
                pos: this.position.clone().add(new THREE.Vector3(5, 0, 5)) 
            });
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
