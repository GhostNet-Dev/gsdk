import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export class PilotableBuilding implements IBuildingObject {
    public readonly type = BuildingType.Pilotable;
    public level: number = 1;
    private isOccupied = false;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D,
        public readonly eventCtrl: IEventController
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void { }

    private enter() {
        this.isOccupied = true;
        console.log("[Pilotable] Pilot entered.");
    }

    private exit() {
        this.isOccupied = false;
        console.log("[Pilotable] Pilot exited.");
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
            status: this.isOccupied ? "조종 중" : "비어 있음",
            commands: (this.property.commands || []).map(t => ({
                ...t,
                onClick: () => {
                    if (t.id === "enter") this.enter();
                    if (t.id === "exit") this.exit();
                    if (t.type === "research" && t.targetId) {
                        this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                    }
                },
                isDisabled: () => (t.id === "enter" && this.isOccupied) || (t.id === "exit" && !this.isOccupied)
            }))
        };
    }
}
