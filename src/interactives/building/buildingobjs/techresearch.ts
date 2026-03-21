import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';

export class TechResearch extends BaseBuilding {
    private isResearching = false;
    private currentResearchId: string | null = null;
    private researchTimer = 0;
    private readonly researchTime = 10.0;

    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
    ) {
        super(id, BuildingType.TechResearch, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void {
        if (this.isUpgrading) return;

        if (this.isResearching) {
            this.researchTimer += delta;
            if (this.researchTimer >= this.researchTime) {
                this.finishResearch();
            }
        }
    }

    private startResearch(techId: string) {
        if (this.isResearching || this.isUpgrading) return;
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

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).map(t => ({
            ...t,
            onClick: () => {
                if (t.type === "research" && t.targetId) {
                    this.startResearch(t.targetId);
                }
            },
            isDisabled: () => this.isResearching || this.isUpgrading
        }));
    }

    protected getStatusText(): string {
        return this.isResearching ? `${this.currentResearchId} 연구 중...` : "대기 중";
    }

    protected getSpecificProgress(): number | undefined {
        return this.isResearching ? (this.researchTimer / this.researchTime) : undefined;
    }
}
