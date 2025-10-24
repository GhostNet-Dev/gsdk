import * as THREE from "three";

import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { OmniFlames } from "@Glibs/magical/libs/omniflame";
import { Camera } from "@Glibs/systems/camera/camera";
import { ElectricAura } from "@Glibs/magical/libs/electricaura";

export class ElectricAction implements IActionComponent, ILoop {
  LoopId: number = 0
  id = "electricaura"
  elec?: ElectricAura
  constructor(
    private eventCtrl: IEventController,
  ) { }

  activate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    if (!this.elec) {
      this.elec = new ElectricAura();
      const point = new THREE.PointLight(0x7cc8ff, 3, 15, 0.5)
      obj.add(point)
    }

    this.elec.attachTo(obj);

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    // this.eventCtrl.SendEventMessage(EventTypes.SetGlow, this.flames.shell)
    // this.eventCtrl.SendEventMessage(EventTypes.SetGlow, this.flames.streaks!.mesh)
    // this.scean.add(this.dark.points)
  }
  deactivate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    this.elec?.detach()
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
  }
  time = 0
  update(delta: number): void {
    this.time += delta
    this.elec!.update(delta)
  }
}

