import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from "@Glibs/ux/selectionpanel/selectionpanel";

export class TechResearch implements IBuildingObject {
    public readonly type = BuildingType.TechResearch;
    public level: number = 1;
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

    private upgrade(): void {
        this.level++;
        console.log(`[Research ${this.id}] Upgraded to level ${this.level}.`);
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc || "새로운 기술을 연구하거나 기존 능력을 강화하는 시설입니다.",
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            status: this.currentResearchId ? `연구 중: ${this.currentResearchId}` : "대기 중",
            progress: this.currentResearchId ? this.researchProgress / this.researchDuration : 0,
            commands: [
                {
                    id: "research_basic",
                    name: "기본 연구",
                    icon: "🔬",
                    onClick: () => this.startResearch("Basic Tech", 10),
                    isDisabled: () => this.currentResearchId !== null
                },
                {
                    id: "upgrade",
                    name: "업그레이드",
                    icon: "🔼",
                    onClick: () => this.upgrade(),
                    isDisabled: () => this.currentResearchId !== null
                }
            ]
        };
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
