import * as THREE from "three";

import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { OmniFlames } from "@Glibs/magical/libs/omniflame";
import { Camera } from "@Glibs/systems/camera/camera";
import { GhostAura } from "@Glibs/magical/libs/ghostaura";

export class GhostAction implements IActionComponent, ILoop {
  LoopId: number = 0
  id = "ghostaura"
  ghost?: GhostAura
  point?: THREE.PointLight
  maxParticleCount = 1000
  constructor(
    private eventCtrl: IEventController,
  ) { }

  activate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    if (!this.ghost) {
      this.ghost = new GhostAura();
      const point = new THREE.PointLight(0xffb15a, 3, 15, 0.5)
      obj.add(point)
      this.point = point
    }

    this.ghost.attachTo(obj);

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }
  deactivate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    this.ghost?.detach()
    this.point && obj.remove(this.point)
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
  }
  time = 0
  update(delta: number): void {
    this.time += delta
    this.ghost!.update(delta, this.time)
  }
}

