import * as THREE from "three";

import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { OmniFlames } from "@Glibs/magical/libs/omniflame";
import { Camera } from "@Glibs/systems/camera/camera";

export class FireAction implements IActionComponent, ILoop {
  LoopId: number = 0
  id = "fireflame"
  flames?: OmniFlames
  point?: THREE.PointLight
  maxParticleCount = 1000
  constructor(
    private eventCtrl: IEventController,
    private camera: Camera
  ) { }

  activate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    if (!this.flames) {
      this.flames = new OmniFlames({
        // 선택: 옵션 일부만 골라서 전달 가능
        streakCount: 2000,
        viewport: { width: window.innerWidth, height: window.innerHeight, fovDeg: this.camera.fov },
      });
      const point = new THREE.PointLight(0xffb15a, 3, 15, 0.5)
      obj.add(point)
      this.point = point
    }

    this.flames.attachTo(obj);

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    console.log("Fire Effect Activated")
  }
  deactivate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    this.flames?.detach()
    this.point && obj.remove(this.point)
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    console.log("Fire Effect Deactivated")
  }
  time = 0
  update(delta: number): void {
    this.time += delta
    this.flames!.update(delta, this.time)
  }
}

