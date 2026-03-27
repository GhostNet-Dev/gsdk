import * as THREE from "three";

import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

type EmissiveMaterial = THREE.Material & {
  emissive: THREE.Color;
  emissiveIntensity: number;
};

function hasEmissive(material: THREE.Material): material is EmissiveMaterial {
  return "emissive" in material && "emissiveIntensity" in material;
}

export interface WarpArrivalOptions {
  progressSpeed?: number;
  maxScaleZ?: number;
  minScaleXY?: number;
  maxEmissiveIntensity?: number;
  autoRepeat?: boolean;
  cycleDelaySec?: number;
  emissiveColor?: THREE.ColorRepresentation;
  flashColor?: THREE.ColorRepresentation;
  onComplete?: () => void;
}

export class WarpArrivalAction implements IActionComponent, ILoop {
  LoopId = 0;
  id = "warpArrival";

  private obj?: THREE.Object3D;
  private emissiveMats: EmissiveMaterial[] = [];
  private originalMats = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private baseScale = new THREE.Vector3(1, 1, 1);
  private arrivalPos = new THREE.Vector3();
  private meshLength = 1;
  private frontTipLocalZ = 0; // 그룹 원점에서 front tip까지의 local Z 거리 (world units)

  private isWarping = false;
  private warpingProgress = 0;
  private cooldownTimer = 0;

  private readonly progressSpeed: number;
  private readonly maxScaleZ: number;
  private readonly minScaleXY: number;
  private readonly maxEmissiveIntensity: number;
  private readonly autoRepeat: boolean;
  private readonly cycleDelaySec: number;
  private readonly emissiveColor: THREE.Color;
  private readonly flashColor: THREE.Color;
  private readonly onComplete?: () => void;
  private loopRegistered = false;

  constructor(
    private readonly eventCtrl: IEventController,
    opts: WarpArrivalOptions = {}
  ) {
    this.progressSpeed = opts.progressSpeed ?? 0.007;
    this.maxScaleZ = opts.maxScaleZ ?? 150;
    this.minScaleXY = opts.minScaleXY ?? 0.01;
    this.maxEmissiveIntensity = opts.maxEmissiveIntensity ?? 10;
    this.autoRepeat = opts.autoRepeat ?? false;
    this.cycleDelaySec = opts.cycleDelaySec ?? 4;
    this.emissiveColor = new THREE.Color(opts.emissiveColor ?? 0x3366ff);
    this.flashColor = new THREE.Color(opts.flashColor ?? 0xffffff);
    this.onComplete = opts.onComplete;
  }

  activate(target: IActionUser, _context?: ActionContext): void {
    this.bindTarget(target);
  }

  deactivate(target: IActionUser): void {
    this.unbindLoop();

    this.resetVisuals();
    this.restoreMaterials();

    const obj = target.objs;
    if (obj) {
      obj.scale.copy(this.baseScale);
    }

    this.obj = undefined;
    this.isWarping = false;
    this.warpingProgress = 0;
    this.cooldownTimer = 0;
  }

  trigger(target: IActionUser, triggerType: TriggerType): void {
    if (triggerType !== "onTrigger") return;
    
    if (!this.obj) {
      this.bindTarget(target);
    }
    this.startWarp();
  }

  update(delta: number): void {
    if (!this.obj) return;

    if (this.isWarping) {
      this.warpingProgress += this.progressSpeed;
      const t = Math.min(1, this.warpingProgress);
      const easedT = t * t * t * t;

      const currentScaleZ = this.maxScaleZ * (1 - easedT) + easedT;
      const currentScaleXY = this.minScaleXY * (1 - easedT) + easedT;

      this.obj.scale.set(
        this.baseScale.x * currentScaleXY,
        this.baseScale.y * currentScaleXY,
        this.baseScale.z * currentScaleZ
      );

      // 워프 종료 지점을 기준으로 front tip을 고정하고 뒤로만 늘어지도록 위치 보정
      const offset = (currentScaleZ - 1) * this.frontTipLocalZ;
      this.obj.position.copy(this.arrivalPos);
      this.obj.translateZ(-offset);

      const glowTrigger = Math.sin(t * Math.PI * 1.2);
      const currentGlow = Math.max(0, glowTrigger);
      const intensity = currentGlow * this.maxEmissiveIntensity;

      this.emissiveMats.forEach((mat) => {
        mat.emissiveIntensity = intensity;
        if (t > 0.8) {
          mat.emissive.lerp(this.flashColor, (t - 0.8) * 5);
        } else {
          mat.emissive.copy(this.emissiveColor);
        }
      });

      if (t >= 1) {
        this.obj.scale.copy(this.baseScale);
        this.obj.position.copy(this.arrivalPos);
        this.resetVisuals();
        this.isWarping = false;
        this.cooldownTimer = 0;
        this.onComplete?.();
      }

      return;
    }

    if (!this.autoRepeat) return;

    this.cooldownTimer += delta;
    if (this.cooldownTimer >= this.cycleDelaySec) {
      this.startWarp();
    }
  }

  private startWarp() {
    if (!this.obj) return;

    this.isWarping = true;
    this.warpingProgress = 0;
    // bindTarget()에서 이미 arrivalPos를 올바르게 저장함
    // obj.position은 이미 translateZ(-offset)이 적용된 상태이므로 덮어쓰면 이중 오프셋 버그 발생

    this.obj.scale.set(
      this.baseScale.x * this.minScaleXY,
      this.baseScale.y * this.minScaleXY,
      this.baseScale.z * this.maxScaleZ
    );

    const offset = (this.maxScaleZ - 1) * this.frontTipLocalZ;
    this.obj.position.copy(this.arrivalPos);
    this.obj.translateZ(-offset);
  }

  private bindTarget(target: IActionUser) {
    const obj = target.objs;
    if (!obj) return;

    this.obj = obj;
    this.baseScale.copy(obj.scale);
    this.arrivalPos.copy(obj.position);
    
    // 모델의 local Z 방향 실제 길이와 front tip 거리 계산
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    this.meshLength = size.z / this.baseScale.z;

    // 그룹 원점에서 front tip(local +Z 방향 최대점)까지의 거리를 정확하게 계산
    // size.z/2 대신 사용하여 pivot이 중심에 없는 모델도 처리
    const localZDir = new THREE.Vector3(0, 0, 1).applyQuaternion(obj.quaternion);
    const objPos = new THREE.Vector3();
    obj.getWorldPosition(objPos);
    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z),
    ];
    let maxProj = -Infinity;
    for (const corner of corners) {
      maxProj = Math.max(maxProj, corner.sub(objPos).dot(localZDir));
    }
    this.frontTipLocalZ = maxProj;
    console.log("[WarpArrival] meshLength:", this.meshLength, "frontTipLocalZ:", this.frontTipLocalZ, "size:", size);

    this.prepareMaterials(obj);

    // 초기 상태 설정
    this.obj.scale.set(
      this.baseScale.x * this.minScaleXY,
      this.baseScale.y * this.minScaleXY,
      this.baseScale.z * this.maxScaleZ
    );
    
    const offset = (this.maxScaleZ - 1) * this.frontTipLocalZ;
    this.obj.position.copy(this.arrivalPos);
    this.obj.translateZ(-offset);

    this.registerLoop();
  }

  private prepareMaterials(root: THREE.Object3D) {
    this.restoreMaterials();

    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const original = child.material;
      this.originalMats.set(child, original);

      if (Array.isArray(original)) {
        const cloned = original.map((mat) => mat.clone());
        child.material = cloned;
        cloned.forEach((mat) => {
          if (hasEmissive(mat)) {
            mat.emissive.copy(this.emissiveColor);
            mat.emissiveIntensity = 0;
            this.emissiveMats.push(mat);
          }
        });
        return;
      }

      const cloned = original.clone();
      child.material = cloned;
      if (hasEmissive(cloned)) {
        cloned.emissive.copy(this.emissiveColor);
        cloned.emissiveIntensity = 0;
        this.emissiveMats.push(cloned);
      }
    });
  }

  private resetVisuals() {
    this.emissiveMats.forEach((mat) => {
      mat.emissiveIntensity = 0;
      mat.emissive.copy(this.emissiveColor);
    });
  }

  private restoreMaterials() {
    if (this.originalMats.size > 0) {
      this.originalMats.forEach((material, mesh) => {
        mesh.material = material;
      });
    }

    this.originalMats.clear();
    this.emissiveMats = [];
  }

  private registerLoop() {
    if (this.loopRegistered) return;
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
    this.loopRegistered = true;
  }

  private unbindLoop() {
    if (!this.loopRegistered) return;
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
    this.loopRegistered = false;
  }
}
