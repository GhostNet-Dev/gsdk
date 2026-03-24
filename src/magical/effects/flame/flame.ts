import * as THREE from "three";
import { IEffect } from "../ieffector";
import { Controller } from "./controller";
import { ExplosionController } from "./animation/explosionController";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export class FlameVfx implements IEffect, ILoop {
  LoopId: number = 0;
  processFlag = false
  obj = new THREE.Group()
  ctrl = new Controller()
  exCtrl = new ExplosionController(this.ctrl, this.obj)
  time = Date.now()

  get Mesh() { return this.obj }

  constructor(
    private eventCtrl:IEventController, 
    private scene: THREE.Scene, 
    private scale = 0.5,
    private global = false
  ) {
    this.obj.scale.set(scale, scale, scale)
    if (global) {
      eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }
  }
  Start(pos: THREE.Vector3) {
    this.exCtrl.reset()
    this.ctrl.init()
    this.exCtrl.init()
    this.processFlag = true
    this.obj.position.copy(pos)
    this.scene.add(this.obj)
  }
  Complete() {
    this.exCtrl.reset()
    this.processFlag = false
    if(this.global) {
      this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    }
  }
  update(delta: number, elapsed?: number | undefined): void {
    this.Update(delta)
  }
  Update(_: number) {
    if (!this.processFlag) return
    let timediff = Date.now() - this.time
    this.exCtrl.update(timediff)
    this.time = Date.now()
  }
}


export class Utils {
  static hexToVec3(col: string) {
    var num = parseInt(col.substr(1), 16);
    var r = (num / 256 / 256) % 256;
    var g = (num / 256) % 256;
    var b = num % 256;
    return [r / 255.0, g / 255.0, b / 255.0];
  }
  static formatZero(val: string) {
    if (val.length == 1)
      return '0' + val;
    return val;
  };
  /*
  static vec3ToHex(col: THREE.Vector3) {
    return '#' +
      this.formatZero(col[0].toString(16)) +
      this.formatZero(col[1].toString(16)) +
      this.formatZero(col[2].toString(16));
  };
  */
  static vec3Blend(cola: string, colb: string, t: number) {
    var a = this.hexToVec3(cola);
    var b = this.hexToVec3(colb);
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }
}
