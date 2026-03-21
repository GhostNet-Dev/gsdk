import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';

export class Bunker extends BaseBuilding {
    private occupants: string[] = [];
    private readonly capacity = 4;

    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
    ) {
        super(id, BuildingType.Bunker, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void { }

    private ejectAll() {
        console.log(`[Bunker] Ejected ${this.occupants.length} units.`);
        this.occupants = [];
    }

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).map(t => ({
            ...t,
            onClick: () => {
                if (t.id === "eject_all") this.ejectAll();
                if (t.type === "research" && t.targetId) {
                    this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                }
            },
            isDisabled: () => this.isUpgrading || (t.id === "eject_all" && this.occupants.length === 0)
        }));
    }

    protected getStatusText(): string {
        return `탑승 유닛: ${this.occupants.length} / ${this.capacity}`;
    }

    protected getSpecificProgress(): number | undefined {
        return undefined;
    }
}
