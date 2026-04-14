import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { TechTreeService } from "@Glibs/techtree/techtreeservice";
import { BuildingProperty } from "./buildingdefs";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IBuildingObject, BuildingType, BuildingMode } from "./ibuildingobj";
import { Loader } from "@Glibs/loader/loader";
import { DefenseTurret } from "./buildingobjs/defenseturret";
import { PilotableBuilding } from "./buildingobjs/pilotablebuilding";
import { UnitProduction } from "./buildingobjs/unitproduction";
import { TechResearch } from "./buildingobjs/techresearch";
import { ResourceProduction } from "./buildingobjs/resourceproduction";
import { Wall } from "./buildingobjs/wall";
import { Bunker } from "./buildingobjs/bunker";
import { CameraMode } from "@Glibs/systems/camera/cameratypes";
import { CameraInputPreset } from "@Glibs/systems/camera/orbitbroker";
import { SelectionPanel } from "@Glibs/ux/selectionpanel/selectionpanel";

export interface BuildingTask {
  nodeId: string;
  prop: BuildingProperty;
  pos?: THREE.Vector3;
  startTime: number;
  progress: number; // 0 to 1
  remainingTurns: number;
  isFinished: boolean;
  constructionModel?: THREE.Object3D;
  progressMesh?: THREE.Group;
}

export class BuildingManager implements ILoop {
  LoopId: number = 0;
  private activeTasks: Map<string, BuildingTask> = new Map();
  private buildingObjects: Map<string, IBuildingObject> = new Map();
  private nextTaskId: number = 0;
  private currentMode: BuildingMode = BuildingMode.Timer; // 기본값 타이머 모드

  private guideModel: THREE.Group | null = null;
  private currentGuideNodeId: string | null = null;
  private latestGuidePos: THREE.Vector3 = new THREE.Vector3(); // 최신 스냅 위치 저장
  private loader = new Loader();

  // [추가] 선택된 건물 및 UI
  private selectedBuilding: IBuildingObject | null = null;
  private selectionPanel: SelectionPanel;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  // [최적화] 건물 종류별 템플릿 캐시
  private constructionTemplates: Map<string, THREE.Object3D> = new Map();
  private finishedTemplates: Map<string, THREE.Object3D> = new Map();

  constructor(
    private scene: THREE.Scene,
    private eventCtrl: IEventController,
    private service: TechTreeService,
    private camera: THREE.Camera
  ) {
    this.selectionPanel = new SelectionPanel();

    this.eventCtrl.RegisterEventListener(EventTypes.RequestBuilding, (data: { nodeId: string, pos: THREE.Vector3 }) => {
      this.startBuild(data.nodeId, data.pos);
    });

    this.eventCtrl.RegisterEventListener(EventTypes.HighlightGrid, (data: { pos: THREE.Vector3, nodeId?: string }) => {
      if (data.nodeId) {
        // [수정] showGuide는 모델 로딩만 담당하게 하고 위치는 latestGuidePos가 결정
        this.showGuide(data.nodeId, data.pos);
      }
    });

    this.eventCtrl.RegisterEventListener(EventTypes.GridArrowClick, (data: { delta: THREE.Vector3, pos?: THREE.Vector3 }) => {
      // CustomGround가 스냅해서 보내주는 최종 월드 좌표를 최우선으로 저장
      if (data.pos) {
        this.latestGuidePos.copy(data.pos);
      } else if (data.delta) {
        this.latestGuidePos.add(data.delta);
      }

      // 이미 모델이 떠 있다면 즉시 위치 업데이트
      if (this.guideModel) {
        this.guideModel.position.copy(this.latestGuidePos);
      }
    });

    this.eventCtrl.RegisterEventListener(EventTypes.HideGrid, () => {
      this.hideGuide();
    });

    this.eventCtrl.RegisterEventListener(EventTypes.ShowGrid, () => {
        this.sendBuildingStatus();
    });

    // [추가] 마우스 클릭 이벤트 리스너
    window.addEventListener('pointerdown', this.onPointerDown);

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  private onPointerDown = (e: PointerEvent) => {
    // 오직 <canvas> 요소에서 발생한 클릭만 처리 (모든 UI 클릭 무시)
    const target = e.target as HTMLElement;
    if (target.tagName !== 'CANVAS') return;

    const rect = target.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // 지어진 건물들 중에서 충돌 체크
    const buildingMeshes: THREE.Object3D[] = [];
    this.buildingObjects.forEach(b => {
        if (b.mesh) buildingMeshes.push(b.mesh);
    });
    
    const intersects = this.raycaster.intersectObjects(buildingMeshes, true);

    if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData.buildingId) {
            obj = obj.parent;
        }

        if (obj && obj.userData.buildingId) {
            this.selectBuilding(obj.userData.buildingId);
            return;
        }
    }

    this.deselectBuilding();
  };

  private selectBuilding(id: string) {
    const building = this.buildingObjects.get(id);
    if (building) {
        this.selectedBuilding = building;
        this.updateUI();
    }
  }

  private deselectBuilding() {
    this.selectedBuilding = null;
    this.selectionPanel.hide();
  }

  private updateUI() {
    if (this.selectedBuilding) {
        this.selectionPanel.show(this.selectedBuilding.getSelectionData());
    }
  }

  private async showGuide(nodeId: string, pos: THREE.Vector3) {
    this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.Grid);
    
    // 로딩이 시작되기 전, 일단 현재 위치 저장
    this.latestGuidePos.copy(pos);

    if (this.currentGuideNodeId === nodeId && this.guideModel) {
      this.guideModel.position.copy(this.latestGuidePos);
      return;
    }

    this.hideGuide(false);

    const node = this.service.index.byId.get(nodeId);
    if (!node || node.kind !== "building") return;

    const prop = node.tech as BuildingProperty;
    this.currentGuideNodeId = nodeId;

    try {
      const asset = await this.loader.GetAssets(prop.assetKey);
      const model = await asset.CloneModel();
      
      // 비동기 로딩 중에 이 가이드가 이미 취소되었거나 바뀐 경우 무시
      if (this.currentGuideNodeId !== nodeId) return;

      this.guideModel = model as THREE.Group;
      this.guideModel.traverse((child) => {
        child.raycast = () => { };
      });

      // [핵심] 로딩이 끝난 시점의 '가장 최신 스냅 좌표'를 적용
      this.guideModel.position.copy(this.latestGuidePos);
      this.guideModel.scale.set(prop.scale, prop.scale, prop.scale);

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

  private hideGuide(restoreCamera = true) {
    if (this.guideModel) {
      this.scene.remove(this.guideModel);
      this.guideModel = null;
    }
    this.currentGuideNodeId = null;

    if (restoreCamera) {
      this.eventCtrl.SendEventMessage(EventTypes.CameraInputPreset, CameraInputPreset.Default);
      this.eventCtrl.SendEventMessage(EventTypes.CameraMode, CameraMode.Restore);
    }
  }

  update(delta: number) {
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.isFinished) continue;

      if (this.currentMode === BuildingMode.Timer) {
        const elapsed = (Date.now() - task.startTime) / 1000;
        task.progress = Math.min(elapsed / task.prop.buildTime, 1.0);

        this.updateProgressVisual(task);

        if (task.progress >= 1.0) {
          this.finishBuild(taskId);
        }
      }
    }

    for (const building of this.buildingObjects.values()) {
      building.update(delta);
    }

    // 선택된 건물의 UI 실시간 업데이트
    if (this.selectedBuilding) {
        this.updateUI();
    }
  }

  private updateProgressVisual(task: BuildingTask) {
    if (!task.progressMesh) return;
    const ring = task.progressMesh.getObjectByName('ring_progress') as THREE.Mesh;
    if (ring) {
      const { innerRadius, outerRadius } = task.progressMesh.userData;
      ring.geometry.dispose();
      const thetaLength = task.progress * Math.PI * 2;
      const newGeom = new THREE.RingGeometry(innerRadius, outerRadius, 64, 1, Math.PI / 2, -thetaLength);
      newGeom.rotateX(-Math.PI / 2);
      ring.geometry = newGeom;
    }
  }

  setMode(mode: BuildingMode) {
    this.currentMode = mode;
    for (const building of this.buildingObjects.values()) {
        building.setMode(mode);
    }
  }

  canBuild(nodeId: string): { ok: boolean; reason?: string } {
    const node = this.service.index.byId.get(nodeId);
    if (!node || node.kind !== "building") return { ok: false, reason: "invalid building type" };

    const prop = node.tech as BuildingProperty;
    const curLv = this.service.levels[nodeId] ?? 0;

    // 1. Unique 건물 중복 체크 (월드에 이미 존재하거나 건설 중인지 확인)
    if (prop.isUnique) {
      const isAlreadyBuilding = Array.from(this.activeTasks.values()).some(t => t.nodeId === nodeId);
      const isAlreadyExists = Array.from(this.buildingObjects.values()).some(b => b.property.id === prop.id);
      if (isAlreadyBuilding || isAlreadyExists) {
        return { ok: false, reason: "unique building already exists" };
      }
    }

    // 2. 건설 권한 체크 (테크트리 레벨이 0이면 해금 시도, 1 이상이면 즉시 건설 가능)
    if (curLv === 0) {
      const res = this.service.canLevelUp(nodeId);
      if (!res.ok) return { ok: false, reason: res.reason };
    } else {
      // 이미 해금(레벨 1 이상)된 경우, 추가 건설 시 비용 정책이 있다면 여기서 체크
      // 현재는 레벨 1이 건설 가능한 상태임을 의미하므로 통과
    }

    return { ok: true };
  }

  async startBuild(nodeId: string, pos?: THREE.Vector3): Promise<string | null> {
    const check = this.canBuild(nodeId);
    if (!check.ok) {
      console.error(`Cannot build ${nodeId}: ${check.reason}`);
      this.eventCtrl.SendEventMessage(EventTypes.Toast, check.reason);
      return null;
    }

    const node = this.service.index.byId.get(nodeId);
    if (!node || node.kind !== "building") return null;

    const prop = node.tech as BuildingProperty;
    const curLv = this.service.levels[nodeId] ?? 0;

    // [수정] 테크트리에서 이미 해금(레벨 1 이상)되었다면 추가 비용 차감 방지
    if (curLv === 0) {
        const canLevel = this.service.canLevelUp(nodeId);
        if (canLevel.ok && canLevel.cost) {
            this.service.ctx.wallet.subtractMany(canLevel.cost);
        }
    }

    let constructionModel: THREE.Object3D | undefined;
    let progressMesh: THREE.Group | undefined;

    if (pos) {
      let template = this.constructionTemplates.get(nodeId);
      if (!template) {
        const asset = await this.loader.GetAssets(prop.assetKey);
        const [model, _exist] = await asset.UniqModel(`construction_template_${nodeId}`);
        if (model) {
          model.traverse((child) => {
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
          this.constructionTemplates.set(nodeId, model);
          template = model;
        }
      }

      if (template) {
        constructionModel = template.clone();
        constructionModel.position.copy(pos);
        constructionModel.scale.set(prop.scale, prop.scale, prop.scale);
        constructionModel.traverse((child) => {
          child.raycast = () => { };
        });
        this.scene.add(constructionModel);
      }

      progressMesh = this.createProgressMesh(prop.size.width, prop.size.depth);
      progressMesh.traverse((child) => {
        child.raycast = () => { };
      });
      progressMesh.position.copy(pos);
      progressMesh.position.y += 0.5;
      this.scene.add(progressMesh);
    }

    const taskId = `task_${this.nextTaskId++}`;
    const task: BuildingTask = {
      nodeId, prop, pos, startTime: Date.now(), progress: 0,
      remainingTurns: prop.buildTurns, isFinished: false,
      constructionModel, progressMesh
    };

    this.activeTasks.set(taskId, task);
    this.sendBuildingStatus();
    return taskId;
  }

  advanceTurn() {
    if (this.currentMode !== BuildingMode.Turn) return;
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (task.isFinished) continue;
      task.remainingTurns--;
      task.progress = (task.prop.buildTurns - task.remainingTurns) / task.prop.buildTurns;
      
      this.updateProgressVisual(task);

      if (task.remainingTurns <= 0) this.finishBuild(taskId);
    }

    for (const building of this.buildingObjects.values()) {
      building.advanceTurn();
    }
  }

  private async finishBuild(taskId: string) {
    const task = this.activeTasks.get(taskId);
    if (!task || task.isFinished) return;

    task.progress = 1;
    task.remainingTurns = 0;
    task.isFinished = true;

    if (task.constructionModel) this.scene.remove(task.constructionModel);
    if (task.progressMesh) this.scene.remove(task.progressMesh);

    if ((this.service.levels[task.nodeId] ?? 0) === 0) {
      this.service.addLevel(task.nodeId);
    }

    if (task.pos) {
      try {
        let template = this.finishedTemplates.get(task.nodeId);
        if (!template) {
          const asset = await this.loader.GetAssets(task.prop.assetKey);
          const [model, _exist] = await asset.UniqModel(`finished_template_${task.nodeId}`);
          if (model) {
            this.finishedTemplates.set(task.nodeId, model);
            template = model;
          }
        }

        if (template) {
          const model = template.clone();
          model.position.copy(task.pos);
          model.scale.set(task.prop.scale, task.prop.scale, task.prop.scale);
          this.scene.add(model);

          let buildingObj: IBuildingObject | null = null;
          const id = `building_${Date.now()}_${task.nodeId}`;

          switch (task.prop.type) {
            case BuildingType.DefenseTurret: buildingObj = new DefenseTurret(id, task.prop, task.pos, model, this.eventCtrl); break;
            case BuildingType.Pilotable: buildingObj = new PilotableBuilding(id, task.prop, task.pos, model, this.eventCtrl); break;
            case BuildingType.UnitProduction: buildingObj = new UnitProduction(id, task.prop, task.pos, model, this.eventCtrl); break;
            case BuildingType.TechResearch: buildingObj = new TechResearch(id, task.prop, task.pos, model, this.eventCtrl); break;
            case BuildingType.ResourceProduction: buildingObj = new ResourceProduction(id, task.prop, task.pos, model, this.eventCtrl); break;
            case BuildingType.Wall: buildingObj = new Wall(id, task.prop, task.pos, model, this.eventCtrl); break;
            case BuildingType.Bunker: buildingObj = new Bunker(id, task.prop, task.pos, model, this.eventCtrl); break;
          }

          if (buildingObj) {
            buildingObj.setMode(this.currentMode);
            buildingObj.level = 1; // 기본 레벨 1 설정
            this.buildingObjects.set(id, buildingObj);
            model.userData.buildingId = id;

            // [추가] 인구수 공급 반영
            if (task.prop.providesPeople) {
              this.eventCtrl.SendEventMessage(EventTypes.People, task.prop.providesPeople);
            }
          }
        }
      } catch (err) {
        console.error(`Failed to create building object for ${task.nodeId}:`, err);
      }
    }
    this.sendBuildingStatus();
  }

  getTasks() { return Array.from(this.activeTasks.values()); }
  getBuildings() { return Array.from(this.buildingObjects.values()); }

  private sendBuildingStatus() {
    const buildings = Array.from(this.buildingObjects.values()).map(b => ({
      nodeId: b.property.id,
      pos: b.position, 
      width: b.property.size.width, 
      depth: b.property.size.depth
    }));
    const pending = Array.from(this.activeTasks.values()).filter(t => !t.isFinished && t.pos).map(t => ({
      nodeId: t.nodeId,
      pos: t.pos!, 
      width: t.prop.size.width, 
      depth: t.prop.size.depth
    }));
    this.eventCtrl.SendEventMessage(EventTypes.ResponseBuilding, [...buildings, ...pending]);
  }

  private createProgressMesh(width: number, depth: number): THREE.Group {
    const group = new THREE.Group();
    const radius = Math.max(width, depth) * 2.0;
    const innerRadius = radius * 0.9;
    const outerRadius = radius;

    const bgGeom = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    bgGeom.rotateX(-Math.PI / 2);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    group.add(new THREE.Mesh(bgGeom, bgMat));

    const barMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const bar = new THREE.Mesh(new THREE.BufferGeometry(), barMat);
    bar.name = 'ring_progress';
    bar.position.y += 0.01;
    group.add(bar);

    group.userData = { innerRadius, outerRadius };
    return group;
  }
}
