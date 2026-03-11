import IEventController from "@Glibs/interface/ievent";
import { TechTreeService } from "@Glibs/techtree/techtreeservice";
import { BuildingMode, BuildingProperty } from "./buildingdefs";
import { subWallet } from "@Glibs/inventory/wallet";
import { EventTypes } from "@Glibs/types/globaltypes";

export interface BuildingTask {
    nodeId: string;
    prop: BuildingProperty;
    startTime: number;
    progress: number; // 0 to 1
    remainingTurns: number;
    isFinished: boolean;
}

export class BuildingManager {
    private activeTasks: Map<string, BuildingTask> = new Map();
    private nextTaskId: number = 0;
    private currentMode: BuildingMode = BuildingMode.Timer; // 기본값 타이머 모드

    constructor(
        private eventCtrl: IEventController,
        private service: TechTreeService
    ) {}

    setMode(mode: BuildingMode) {
        this.currentMode = mode;
    }

    /**
     * 건물을 지을 수 있는지 확인합니다.
     */
    canBuild(nodeId: string): { ok: boolean; reason?: string } {
        const res = this.service.canLevelUp(nodeId);
        if (!res.ok) return { ok: false, reason: res.reason };
        return { ok: true };
    }

    /**
     * 건물 건설을 시작합니다.
     */
    startBuild(nodeId: string): string | null {
        const res = this.service.canLevelUp(nodeId);
        if (!res.ok) {
            console.error(`Cannot build ${nodeId}: ${res.reason}`);
            return null;
        }

        const node = this.service.index.byId.get(nodeId);
        if (!node || node.kind !== "building") return null;

        const prop = node.tech as BuildingProperty;
        subWallet(this.service.ctx.wallet, res.cost!);
        
        const taskId = `task_${this.nextTaskId++}`;
        const task: BuildingTask = {
            nodeId,
            prop,
            startTime: Date.now(),
            progress: 0,
            remainingTurns: prop.buildTurns,
            isFinished: false
        };

        this.activeTasks.set(taskId, task);
        this.eventCtrl.SendEventMessage(EventTypes.UpdateBuff + "building", task);
        
        if (this.currentMode === BuildingMode.Timer) {
            // 타이머 모드: 지정된 시간 후 완료
            setTimeout(() => this.finishBuild(taskId), prop.buildTime * 1000);
        }

        return taskId;
    }

    /**
     * [Turn-based Only] 턴을 한 단계 진행시킵니다.
     */
    advanceTurn() {
        if (this.currentMode !== BuildingMode.Turn) return;

        for (const [taskId, task] of this.activeTasks.entries()) {
            if (task.isFinished) continue;

            task.remainingTurns--;
            task.progress = (task.prop.buildTurns - task.remainingTurns) / task.prop.buildTurns;

            console.log(`Building progress: ${task.prop.name} - Remaining turns: ${task.remainingTurns}`);

            if (task.remainingTurns <= 0) {
                this.finishBuild(taskId);
            } else {
                // UI 갱신 등을 위한 중간 이벤트 전송
                this.eventCtrl.SendEventMessage(EventTypes.UpdateBuff + "building", task);
            }
        }
    }

    private finishBuild(taskId: string) {
        const task = this.activeTasks.get(taskId);
        if (!task || task.isFinished) return;

        task.progress = 1;
        task.remainingTurns = 0;
        task.isFinished = true;

        this.service.addLevel(task.nodeId);
        this.eventCtrl.SendEventMessage(EventTypes.SkillLearned + "building", task);
        
        console.log(`Building finished: ${task.prop.name}`);
    }

    getTasks() {
        return Array.from(this.activeTasks.values());
    }
}
