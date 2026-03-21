import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export class Wall implements IBuildingObject {
    public readonly type = BuildingType.Wall;
    public level: number = 1;
    private currentHp: number;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D,
        public readonly eventCtrl: IEventController
    ) {
        this.mesh.position.copy(position);
        this.currentHp = this.property.hp;
    }

    update(delta: number): void { }

    private repair() {
        this.currentHp = this.property.hp;
        console.log(`[Wall] Repaired to ${this.currentHp}`);
    }

    destroy(): void {
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc,
            level: this.level,
            hp: { current: this.currentHp, max: this.property.hp },
            status: "건재함",
            commands: (this.property.commands || []).map(t => ({
                ...t,
                onClick: () => {
                    if (t.id === "repair") this.repair();
                    if (t.type === "research" && t.targetId) {
                        this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                    }
                },
                isDisabled: () => (t.id === "repair" && this.currentHp >= this.property.hp)
            }))
        };
    }
}
