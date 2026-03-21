import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export class Bunker implements IBuildingObject {
    public readonly type = BuildingType.Bunker;
    public level: number = 1;
    private occupants: string[] = [];
    private readonly capacity = 4;

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

    private ejectAll() {
        console.log(`[Bunker] Ejected ${this.occupants.length} units.`);
        this.occupants = [];
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
            status: `탑승 유닛: ${this.occupants.length} / ${this.capacity}`,
            commands: (this.property.commands || []).map(t => ({
                ...t,
                onClick: () => {
                    if (t.id === "eject_all") this.ejectAll();
                    if (t.type === "research" && t.targetId) {
                        this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                    }
                },
                isDisabled: () => (t.id === "eject_all" && this.occupants.length === 0)
            }))
        };
    }
}
