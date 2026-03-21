import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';

export class Wall extends BaseBuilding {

    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
    ) {
        super(id, BuildingType.Wall, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void { }

    private repair() {
        this.currentHp = this.property.hp;
        console.log(`[Wall] Repaired to ${this.currentHp}`);
    }

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).map(t => ({
            ...t,
            onClick: () => {
                if (t.id === "repair") this.repair();
                if (t.type === "research" && t.targetId) {
                    this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                }
            },
            isDisabled: () => this.isUpgrading || (t.id === "repair" && this.currentHp >= this.property.hp)
        }));
    }

    protected getStatusText(): string {
        return "건재함";
    }

    protected getSpecificProgress(): number | undefined {
        return undefined;
    }
}
