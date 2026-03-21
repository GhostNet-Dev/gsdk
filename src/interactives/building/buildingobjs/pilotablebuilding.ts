import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';

export class PilotableBuilding extends BaseBuilding {
    private isOccupied = false;

    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
    ) {
        super(id, BuildingType.Pilotable, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void { }

    private enter() {
        this.isOccupied = true;
        console.log("[Pilotable] Pilot entered.");
    }

    private exit() {
        this.isOccupied = false;
        console.log("[Pilotable] Pilot exited.");
    }

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).map(t => ({
            ...t,
            onClick: () => {
                if (t.id === "enter") this.enter();
                if (t.id === "exit") this.exit();
                if (t.type === "research" && t.targetId) {
                    this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                }
            },
            isDisabled: () => this.isUpgrading || (t.id === "enter" && this.isOccupied) || (t.id === "exit" && !this.isOccupied)
        }));
    }

    protected getStatusText(): string {
        return this.isOccupied ? "조종 중" : "비어 있음";
    }

    protected getSpecificProgress(): number | undefined {
        return undefined;
    }
}
