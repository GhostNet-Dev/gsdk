import * as THREE from "three";
import IEventController from "@Glibs/interface/ievent";
import { TechTreeService } from "@Glibs/techtree/techtreeservice";
import { BuildingMode, BuildingProperty } from "./buildingdefs";
import { subWallet } from "@Glibs/inventory/wallet";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IBuildingObject, BuildingType } from "./ibuildingobj";
import { Loader } from "@Glibs/loader/loader";
import { DefenseTurret } from "./buildingobjs/defenseturret";
import { PilotableBuilding } from "./buildingobjs/pilotablebuilding";
import { UnitProduction } from "./buildingobjs/unitproduction";
import { TechResearch } from "./buildingobjs/techresearch";
import { ResourceProduction } from "./buildingobjs/resourceproduction";
import { Wall } from "./buildingobjs/wall";
import { Bunker } from "./buildingobjs/bunker";

export interface BuildingTask {
  nodeId: string;
  prop: BuildingProperty;
  pos?: THREE.Vector3;
  startTime: number;
  progress: number; // 0 to 1
  remainingTurns: number;
  isFinished: boolean;
  constructionModel?: THREE.Object3D;
}

export class BuildingManager {
  private activeTasks: Map<string, BuildingTask> = new Map();
  private buildingObjects: Map<string, IBuildingObject> = new Map();
  private nextTaskId: number = 0;
  private currentMode: BuildingMode = BuildingMode.Timer; // 기본값 타이머 모드

  private guideModel: THREE.Group | null = null;
  private currentGuideNodeId: string | null = null;
  private loader = new Loader();

  constructor(
    private scene: THREE.Scene,
    private eventCtrl: IEventController,
    private service: TechTreeService
  ) {
    this.eventCtrl.RegisterEventListener(EventTypes.RequestBuilding, (data: { nodeId: string, pos: THREE.Vector3 }) => {
      // [수정] 가이드를 숨기지 않고 바로 건설 시작 (가이드 유지)
      this.startBuild(data.nodeId, data.pos);
    });

    // 가이드 모델 표시를 위한 HighlightGrid 리스너
    this.eventCtrl.RegisterEventListener(EventTypes.HighlightGrid, (data: { pos: THREE.Vector3, nodeId?: string }) => {
      if (data.nodeId) {
        this.showGuide(data.nodeId, data.pos);
      }
    });

    // 가이드 모델 이동을 위한 GridArrowClick 리스너
    this.eventCtrl.RegisterEventListener(EventTypes.GridArrowClick, (data: { delta: THREE.Vector3, pos?: THREE.Vector3 }) => {
      if (this.guideModel) {
        if (data.pos) {
          this.guideModel.position.copy(data.pos);
        } else {
          this.guideModel.position.add(data.delta);
        }
      }
    });

    // 그리드 종료 시 가이드 모델 제거
    this.eventCtrl.RegisterEventListener(EventTypes.HideGrid, () => {
      this.hideGuide();
    });

    this.eventCtrl.RegisterEventListener(EventTypes.RegisterLoop, (delta: number) => {
      this.update(delta);
    });
  }

  private async showGuide(nodeId: string, pos: THREE.Vector3) {
    // 이미 같은 가이드가 있으면 위치만 업데이트
    if (this.currentGuideNodeId === nodeId && this.guideModel) {
      this.guideModel.position.copy(pos);
      return;
    }

    this.hideGuide();

    const node = this.service.index.byId.get(nodeId);
    if (!node || node.kind !== "building") return;

    const prop = node.tech as BuildingProperty;
    this.currentGuideNodeId = nodeId;

    try {
      const asset = await this.loader.GetAssets(prop.assetKey);
      const model = await asset.CloneModel();
      if (!model) return;

      this.guideModel = model as THREE.Group;
      this.guideModel.position.copy(pos);
      this.guideModel.scale.set(prop.scale, prop.scale, prop.scale);

      // 반투명 처리
      this.guideModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => this.applyTranslucent(m));
          } else {
            this.applyTranslucent(child.material);
          }
        }
      });

      this.scene.add(this.guideModel);
    } catch (err) {
      console.error(`Failed to load guide model for ${nodeId}:`, err);
    }
  }

  private applyTranslucent(material: THREE.Material) {
    material.transparent = true;
    material.opacity = 0.5;
    material.depthWrite = false;
  }

  private hideGuide() {
    if (this.guideModel) {
      this.scene.remove(this.guideModel);
      this.guideModel = null;
    }
    this.currentGuideNodeId = null;
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

    // [추가] 건설 중인 상태를 보여주기 위해 가이드 모델을 복제하여 배치
    let constructionModel: THREE.Object3D | undefined;
    if (this.guideModel && pos) {
      constructionModel = this.guideModel.clone();
      constructionModel.position.copy(pos);
      // 건설 중임을 나타내기 위해 가이드(0.5)보다 더 투명하게(0.3) 설정
      constructionModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(m => {
              const cloneMat = m.clone();
              cloneMat.transparent = true;
              cloneMat.opacity = 0.3;
              cloneMat.depthWrite = false;
              return cloneMat;
            });
          } else {
            const cloneMat = child.material.clone();
            cloneMat.transparent = true;
            cloneMat.opacity = 0.3;
            cloneMat.depthWrite = false;
            child.material = cloneMat;
          }
        }
      });
      this.scene.add(constructionModel);
    }

    const taskId = `task_${this.nextTaskId++}`;
    const task: BuildingTask = {
      nodeId,
      prop,
      pos,
      startTime: Date.now(),
      progress: 0,
      remainingTurns: prop.buildTurns,
      isFinished: false,
      constructionModel
    };

    this.activeTasks.set(taskId, task);
    this.sendBuildingStatus();

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

  private async finishBuild(taskId: string) {
    const task = this.activeTasks.get(taskId);
    if (!task || task.isFinished) return;

    task.progress = 1;
    task.remainingTurns = 0;
    task.isFinished = true;

    // 건설 중이던 임시 모델 제거
    if (task.constructionModel) {
      this.scene.remove(task.constructionModel);
    }

    this.service.addLevel(task.nodeId);

    // 실제 건물 오브젝트 생성
    if (task.pos) {
      try {
        const asset = await this.loader.GetAssets(task.prop.assetKey);
        const model = await asset.CloneModel();
        if (model) {
          model.position.copy(task.pos);
          model.scale.set(task.prop.scale, task.prop.scale, task.prop.scale);
          this.scene.add(model);

          let buildingObj: IBuildingObject | null = null;
          const id = `building_${Date.now()}_${task.nodeId}`;

          switch (task.prop.type) {
            case BuildingType.DefenseTurret:
              buildingObj = new DefenseTurret(id, task.prop, task.pos, model);
              break;
            case BuildingType.Pilotable:
              buildingObj = new PilotableBuilding(id, task.prop, task.pos, model);
              break;
            case BuildingType.UnitProduction:
              buildingObj = new UnitProduction(id, task.prop, task.pos, model);
              break;
            case BuildingType.TechResearch:
              buildingObj = new TechResearch(id, task.prop, task.pos, model);
              break;
            case BuildingType.ResourceProduction:
              buildingObj = new ResourceProduction(id, task.prop, task.pos, model);
              break;
            case BuildingType.Wall:
              buildingObj = new Wall(id, task.prop, task.pos, model);
              break;
            case BuildingType.Bunker:
              buildingObj = new Bunker(id, task.prop, task.pos, model);
              break;
          }

          if (buildingObj) {
            this.buildingObjects.set(id, buildingObj);
          }
        }
      } catch (err) {
        console.error(`Failed to create building object for ${task.nodeId}:`, err);
      }
    }

    this.sendBuildingStatus();
    console.log(`Building finished: ${task.prop.name}`);
  }

  getTasks() {
    return Array.from(this.activeTasks.values());
  }

  getBuildings() {
    return Array.from(this.buildingObjects.values());
  }

  private sendBuildingStatus() {
    const buildings = Array.from(this.buildingObjects.values()).map(b => ({
      pos: b.position,
      width: b.property.size.width,
      depth: b.property.size.depth
    }));
    
    const pending = Array.from(this.activeTasks.values()).filter(t => !t.isFinished && t.pos).map(t => ({
      pos: t.pos!,
      width: t.prop.size.width,
      depth: t.prop.size.depth
    }));

    this.eventCtrl.SendEventMessage(EventTypes.ResponseBuilding, [...buildings, ...pending]);
  }
}
