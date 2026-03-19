import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { TechTreeService } from "@Glibs/techtree/techtreeservice";
import { BuildingMode, BuildingProperty } from "./buildingdefs";
import { subWallet } from "@Glibs/inventory/wallet";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IBuildingObject } from "./ibuildingobj";

export interface BuildingTask {
  nodeId: string;
  prop: BuildingProperty;
  pos?: THREE.Vector3;
  startTime: number;
  progress: number; // 0 to 1
  remainingTurns: number;
  isFinished: boolean;
}

export class BuildingManager implements ILoop {
  LoopId: number = 0;
  private activeTasks: Map<string, BuildingTask> = new Map();
  private buildingObjects: Map<string, IBuildingObject> = new Map();
  private nextTaskId: number = 0;
  private currentMode: BuildingMode = BuildingMode.Timer; // 기본값 타이머 모드

  constructor(
    private eventCtrl: IEventController,
    private service: TechTreeService
  ) {
    this.eventCtrl.RegisterEventListener(EventTypes.RequestBuilding, (data: { nodeId: string, pos: THREE.Vector3 }) => {
      this.startBuild(data.nodeId, data.pos);
    });

    // 매 프레임 업데이트를 위한 루프 등록 (필요 시)
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  update(delta: number) {
    for (const building of this.buildingObjects.values()) {
      building.update(delta);
    }
  }

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
  startBuild(nodeId: string, pos?: THREE.Vector3): string | null {
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
      pos,
      startTime: Date.now(),
      progress: 0,
      remainingTurns: prop.buildTurns,
      isFinished: false
    };

    this.activeTasks.set(taskId, task);

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

    // TODO: 실제 IBuildingObject 인스턴스 생성 및 배치 로직 추가
    console.log(`Building finished: ${task.prop.name}`);
  }

  getTasks() {
    return Array.from(this.activeTasks.values());
  }

  getBuildings() {
    return Array.from(this.buildingObjects.values());
  }
}
