import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';

export class TechResearch implements IBuildingObject {
    public readonly type = BuildingType.TechResearch;
    private currentResearchId: string | null = null;
    private researchProgress = 0;
    private researchDuration = 0;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        if (this.currentResearchId) {
            this.researchProgress += delta;
            if (this.researchProgress >= this.researchDuration) {
                this.finishResearch();
            }
        }
    }

    startResearch(techId: string, duration = 30): void {
        if (this.currentResearchId) return;
        this.currentResearchId = techId;
        this.researchDuration = duration;
        this.researchProgress = 0;
        console.log(`[Research ${this.id}] Started research: ${techId}`);
    }

    private finishResearch(): void {
        console.log(`[Research ${this.id}] Finished research: ${this.currentResearchId}`);
        // TODO: 테크트리 레벨업 또는 스탯 업그레이드 적용
        this.currentResearchId = null;
    }

    onInteract(): void {
        console.log(`[Research ${this.id}] Opening research UI...`);
    }

    destroy(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
