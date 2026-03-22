import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType, BuildingMode } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';
import { CurrencyType } from '@Glibs/inventory/wallet';

export class ResourceProduction extends BaseBuilding {
    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
    ) {
        super(id, BuildingType.ResourceProduction, property, position, mesh, eventCtrl);
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
        if (!this.property.production) return undefined;

        if (this.currentMode === BuildingMode.Timer) {
            return this.resourceProductionTimer / this.property.production.interval;
        } else {
            return this.resourceProductionTurnCount / this.property.production.turns;
        }
    }
}
