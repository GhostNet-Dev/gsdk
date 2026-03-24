import { IEffect } from "@Glibs/interface/ieffector";
import IEventController from "@Glibs/interface/ievent";
import { GlobalEffectType } from "@Glibs/types/effecttypes";
import { SparkVfx } from "./sparksystem";
import { EventTypes } from "@Glibs/types/globaltypes";
import { FlameVfx } from "./flame/flame";


export class GlobalEffector {
  mapObj = new Map<GlobalEffectType, IEffect>()
  private classMap: Record<string, new (...args: any[]) => any> = {
    SparkVfx: SparkVfx,
    FlameVfx: FlameVfx,
  };
  private globalEffectTypes: Record<string, any> = {
    SparkVfx: { eventCtrl: this.eventCtrl, scene: this.scene, camera: this.camera },
    FlameVfx: { eventCtrl: this.eventCtrl, scene: this.scene, scale: 0.5, global: true },
  }
  constructor(
    private eventCtrl: IEventController,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
  ) {
    eventCtrl.RegisterEventListener(EventTypes.GlobalEffect, (gEffectType: GlobalEffectType, ...params: any[]) => {
      const eff = this.GetEffectObject(gEffectType)
      eff.Start(...params)
    })
  }
  GetEffectObject(mapType = GlobalEffectType.SparkEshSystem) {
    let obj = this.mapObj.get(mapType)
    if (!obj) {
      const params = this.globalEffectTypes[mapType]
      obj = new this.classMap[mapType](...Object.values(params))
      if (!obj) throw new Error("there is not types = " + mapType);
      this.mapObj.set(mapType, obj)
    }
    return obj
  }
}