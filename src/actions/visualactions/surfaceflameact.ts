import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Controller } from "@Glibs/magical/effects/flame/controller";
import { ExplosionController } from "@Glibs/magical/effects/flame/animation/explosionController";

interface FlameCluster {
  group: THREE.Group;
  ctrl: Controller;
  exCtrl: ExplosionController;
}

export class SurfaceFlameAction implements IActionComponent, ILoop {
  LoopId: number = 0;
  id = "surfaceflame";

  private clusters: FlameCluster[] = [];
  private point?: THREE.PointLight;
  private time = Date.now();

  constructor(
    private eventCtrl: IEventController,
    private sampleCount: number = 4,
    private flameScale: number = 0.18,
  ) {}

  activate(target: IActionUser, context?: ActionContext): void {
    const obj = target.objs;
    if (!obj) return;

    const meshes: THREE.Mesh[] = [];
    obj.traverse(child => {
      if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh);
    });
    if (meshes.length === 0) return;

    obj.updateWorldMatrix(true, true);
    const objInvWorld = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    const localPositions = this.sampleSurface(meshes, objInvWorld, this.sampleCount);

    for (const localPos of localPositions) {
      const group = new THREE.Group();
      group.scale.setScalar(this.flameScale);
      group.position.copy(localPos);
      obj.add(group);

      const ctrl = new Controller();
      ctrl.init();
      const exCtrl = new ExplosionController(ctrl, group);
      exCtrl.init();

      this.clusters.push({ group, ctrl, exCtrl });
    }

    this.point = new THREE.PointLight(0xffb15a, 3, 15, 0.5);
    obj.add(this.point);

    this.time = Date.now();
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this);
  }

  deactivate(target: IActionUser, context?: ActionContext): void {
    const obj = target.objs;
    if (!obj) return;

    for (const { group, exCtrl } of this.clusters) {
      exCtrl.reset();
      obj.remove(group);
    }
    this.clusters = [];

    if (this.point) {
      obj.remove(this.point);
      this.point = undefined;
    }

    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this);
  }

  update(_delta: number): void {
    const now = Date.now();
    const deltaMs = now - this.time;
    this.time = now;

    for (const { exCtrl } of this.clusters) {
      exCtrl.update(deltaMs);
    }
  }

  private sampleSurface(
    meshes: THREE.Mesh[],
    objInvWorld: THREE.Matrix4,
    count: number,
  ): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const perMesh = Math.max(1, Math.ceil(count / meshes.length));
    const samplePos = new THREE.Vector3();
    const worldPos = new THREE.Vector3();

    for (const mesh of meshes) {
      if (!mesh.geometry) continue;
      try {
        const sampler = new MeshSurfaceSampler(mesh).build();
        for (let i = 0; i < perMesh && positions.length < count; i++) {
          sampler.sample(samplePos);
          worldPos.copy(samplePos).applyMatrix4(mesh.matrixWorld).applyMatrix4(objInvWorld);
          positions.push(worldPos.clone());
        }
      } catch {
        // 샘플링 불가한 메시는 건너뜀
      }
    }

    return positions;
  }
}
