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
}

export class WarpArrivalAction implements IActionComponent, ILoop {
  LoopId = 0;
  id = "warpArrival";

  private obj?: THREE.Object3D;
  private emissiveMats: EmissiveMaterial[] = [];
  private originalMats = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private baseScale = new THREE.Vector3(1, 1, 1);

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
        this.resetVisuals();
        this.isWarping = false;
        this.cooldownTimer = 0;
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

    this.obj.scale.set(
      this.baseScale.x * this.minScaleXY,
      this.baseScale.y * this.minScaleXY,
      this.baseScale.z * this.maxScaleZ
    );
  }

  private bindTarget(target: IActionUser) {
    const obj = target.objs;
    if (!obj) return;

    this.obj = obj;
    this.baseScale.copy(obj.scale);
    this.prepareMaterials(obj);
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
