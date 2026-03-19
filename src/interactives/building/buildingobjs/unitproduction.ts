import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';

export interface ProductionTask {
    unitId: string;
    duration: number;
    elapsed: number;
    isFinished: boolean;
}

export class UnitProduction implements IBuildingObject {
    public readonly type = BuildingType.UnitProduction;
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

    onInteract(): void {
        console.log(`[Production ${this.id}] Opening production UI...`);
    }

    destroy(): void {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
