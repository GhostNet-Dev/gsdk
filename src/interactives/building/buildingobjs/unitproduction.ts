import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingMode, BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes, UnitProducedPayload } from '@Glibs/types/globaltypes';
import { AllyId } from '@Glibs/actors/allies/allytypes';
import { BuildingProperty, ProduceCommandTemplate } from '../buildingdefs';
import IEventController from '@Glibs/interface/ievent';
import { WalletManager } from '@Glibs/inventory/wallet';

export class UnitProduction extends BaseBuilding {
    private isProducing = false;
    private currentUnit: AllyId | null = null;
    private unitProductionTimer = 0;
    private unitProductionTime = 5.0;
    private unitProductionTurnsRemaining = 0;
    private unitProductionTurnsTotal = 0;

    constructor(
        id: string,
        property: BuildingProperty,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: IEventController,
        private readonly wallet: WalletManager
    ) {
        super(id, BuildingType.UnitProduction, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void {
        if (!this.isProducing || this.currentMode !== BuildingMode.Timer) return;

        this.unitProductionTimer += delta;
        if (this.unitProductionTimer >= this.unitProductionTime) {
            this.spawnUnit();
        }
    }

    private startProduction(allyId: AllyId) {
        if (this.isProducing || this.isUpgrading) return;

        const command = this.findProduceCommand(allyId);
        if (!command) return;

        const cost = command.cost;
        if (cost && !this.wallet.hasEnough(cost)) {
            this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, "자원이 부족합니다.");
            return;
        }
        if (cost && !this.wallet.subtractMany(cost)) {
            this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, "자원이 부족합니다.");
            return;
        }

        this.unitProductionTime = command.productionTime ?? 5.0;
        this.unitProductionTurnsTotal = command.productionTurns ?? 1;
        this.unitProductionTurnsRemaining = this.unitProductionTurnsTotal;
        this.isProducing = true;
        this.currentUnit = allyId;
        this.unitProductionTimer = 0;
        console.log(`[Production] Started: ${allyId}`);
    }

    protected onAdvanceTurn(): void {
        if (!this.isProducing || this.currentMode !== BuildingMode.Turn) return;

        this.unitProductionTurnsRemaining--;
        if (this.unitProductionTurnsRemaining <= 0) {
            this.spawnUnit();
        }
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
        this.unitProductionTimer = 0;
        this.unitProductionTurnsRemaining = 0;
        this.unitProductionTurnsTotal = 0;
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
        if (!this.isProducing) return "대기 중";
        if (this.currentMode === BuildingMode.Turn) {
            return `${this.currentUnit} 생산 중... (${this.unitProductionTurnsRemaining}턴)`;
        }

        const remaining = Math.max(0, Math.ceil(this.unitProductionTime - this.unitProductionTimer));
        return `${this.currentUnit} 생산 중... (${remaining}초)`;
    }

    protected getSpecificProgress(): number | undefined {
        if (!this.isProducing) return undefined;
        if (this.currentMode === BuildingMode.Turn) {
            if (this.unitProductionTurnsTotal <= 0) return undefined;
            return (this.unitProductionTurnsTotal - this.unitProductionTurnsRemaining) / this.unitProductionTurnsTotal;
        }

        return this.unitProductionTimer / this.unitProductionTime;
    }

    private findProduceCommand(allyId: AllyId): ProduceCommandTemplate | undefined {
        return this.property.commands?.find((command): command is ProduceCommandTemplate => {
            return command.type === "produce" && command.targetId === allyId;
        });
    }
}
