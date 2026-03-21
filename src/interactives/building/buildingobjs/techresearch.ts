import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export class TechResearch implements IBuildingObject {
    public readonly type = BuildingType.TechResearch;
    public level: number = 1;
    private isResearching = false;
    private currentResearchId: string | null = null;
    private researchTimer = 0;
    private readonly researchTime = 10.0;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D,
        public readonly eventCtrl: IEventController
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        if (this.isResearching) {
            this.researchTimer += delta;
            if (this.researchTimer >= this.researchTime) {
                this.finishResearch();
            }
        }
    }

    private startResearch(techId: string) {
        if (this.isResearching) return;
        this.isResearching = true;
        this.currentResearchId = techId;
        this.researchTimer = 0;
        console.log(`[Research] Started: ${techId}`);
    }

    private finishResearch() {
        if (this.currentResearchId) {
            this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, this.currentResearchId);
            console.log(`[Research] Finished: ${this.currentResearchId}`);
        }
        this.isResearching = false;
        this.currentResearchId = null;
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
            status: this.isResearching ? `${this.currentResearchId} 연구 중...` : "대기 중",
            progress: this.isResearching ? (this.researchTimer / this.researchTime) : undefined,
            commands: (this.property.commands || []).map(t => ({
                ...t,
                onClick: () => {
                    if (t.type === "research" && t.targetId) {
                        this.startResearch(t.targetId);
                    }
                },
                isDisabled: () => this.isResearching
            }))
        };
    }
}
