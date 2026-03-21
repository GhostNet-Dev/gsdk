import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from "@Glibs/ux/selectionpanel/selectionpanel";

export interface ProductionTask {
    unitId: string;
    duration: number;
    elapsed: number;
    isFinished: boolean;
}

export class UnitProduction implements IBuildingObject {
    public readonly type = BuildingType.UnitProduction;
    public level: number = 1;
    private queue: ProductionTask[] = [];
    private currentTask: ProductionTask | null = null;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        if (!this.currentTask && this.queue.length > 0) {
            this.currentTask = this.queue.shift()!;
        }

        if (this.currentTask) {
            this.currentTask.elapsed += delta;
            if (this.currentTask.elapsed >= this.currentTask.duration) {
                this.onFinished(this.currentTask);
                this.currentTask = null;
            }
        }
    }

    private onFinished(task: ProductionTask) {
        console.log(`[Production ${this.id}] Unit ${task.unitId} finished production.`);
        // TODO: 월드에 유닛 스폰 로직
    }

    addQueue(unitId: string, duration = 10): void {
        this.queue.push({ unitId, duration, elapsed: 0, isFinished: false });
        console.log(`[Production ${this.id}] Added to queue: ${unitId}`);
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc || "유닛을 생산하는 시설입니다.",
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            status: this.currentTask ? `생산 중: ${this.currentTask.unitId}` : "대기 중",
            progress: this.currentTask ? this.currentTask.elapsed / this.currentTask.duration : 0,
            commands: (this.property.provides || []).map(unitId => ({
                id: `produce_${unitId}`,
                name: `${unitId} 생산`,
                icon: "🤖",
                onClick: () => this.addQueue(unitId)
            }))
        };
    }

    onInteract(): void {
        console.log(`[Production ${this.id}] Opening production UI...`);
    }

    destroy(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
