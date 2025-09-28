import * as THREE from "three";

import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { OccludingParticles } from "@Glibs/magical/libs/btparticles";

export class DarkAction implements IActionComponent, ILoop {
  LoopId: number = 0
  id = "darkparticle"
  dark?: OccludingParticles
  maxParticleCount = 1000
  constructor(
    private eventCtrl: IEventController,
    private scean: THREE.Scene,
  ) { }

  activate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    if (!this.dark) this.dark = new OccludingParticles({ ...context?.param, 
      particleCount: this.maxParticleCount,
      spawnFadeIn: true,
      spawnFadeInSeconds: 1.0, // 스폰 후 0.25초 동안 서서히 진해짐
      spawnFadeInPower: 1.5,    // 초반 더 투명(곡률)
      maxAlpha: 1,           // 최대 불투명도 제한
      fadeOutStart: 0.88,       // 수명 88%부터
      fadeOutEnd: 1.0           // 100%에서 완전 투명
    })
    this.dark.setTargets([obj], "local", true)
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    this.eventCtrl.RegisterEventListener(EventTypes.DarkParticle, (ratio: number) => {
      ratio = Math.min(ratio, 1)
      const count = Math.floor(this.maxParticleCount * ratio)
      this.dark!.setParticleCountSmooth(count, { fadeOutSeconds: 0.5, shrinkPerFrame: 32 });
    })
    // this.scean.add(this.dark.points)
    obj.add((this.dark.points))
  }
  deactivate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    this.dark?.dispose()
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    // this.scean.remove(this.dark!.points)
    obj.remove((this.dark!.points))
  }
  update(delta: number): void {
    this.dark!.update(delta)
  }
}
