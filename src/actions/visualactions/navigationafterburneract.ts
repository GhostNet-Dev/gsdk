import * as THREE from "three";

import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Afterburner, AfterburnerOptions } from "@Glibs/magical/libs/afterburner";

export interface NavigationAfterburnerActionOptions extends AfterburnerOptions {
  activationSpeed?: number;
  fullSpeed?: number;
  idleThrottle?: number;
}

export class NavigationAfterburnerAction implements IActionComponent, ILoop {
  LoopId = 0;
  id = "navigationAfterburner";

  private readonly effect: Afterburner;
  private readonly activationSpeed: number;
  private readonly fullSpeed: number;
  private readonly idleThrottle: number;
  private readonly currentWorldPosition = new THREE.Vector3();
  private readonly previousWorldPosition = new THREE.Vector3();
  private readonly drift = new THREE.Vector3();
  private target?: IActionUser;
  private loopRegistered = false;

  constructor(
    private readonly eventCtrl: IEventController,
    options: NavigationAfterburnerActionOptions = {},
  ) {
    this.activationSpeed = options.activationSpeed ?? 0.75;
    this.fullSpeed = Math.max(this.activationSpeed + 0.01, options.fullSpeed ?? 8);
    this.idleThrottle = THREE.MathUtils.clamp(options.idleThrottle ?? 0.15, 0, 1);
    this.effect = new Afterburner(options);
  }

  activate(target: IActionUser, _context?: ActionContext): void {
    const obj = target.objs;
    if (!obj) return;

    this.target = target;
    obj.getWorldPosition(this.previousWorldPosition);
    this.effect.attachTo(obj);
    this.bindLoop();
  }

  deactivate(target: IActionUser): void {
    void target;
    this.unbindLoop();
    this.effect.detach();
    this.target = undefined;
  }

  update(delta: number): void {
    if (!this.target?.objs) return;
    if (delta <= 0) return;

    const obj = this.target.objs;
    obj.getWorldPosition(this.currentWorldPosition);

    const distance = this.currentWorldPosition.distanceTo(this.previousWorldPosition);
    const speed = distance / delta;
    const movementThrottle = THREE.MathUtils.clamp(
      (speed - this.activationSpeed) / (this.fullSpeed - this.activationSpeed),
      0,
      1,
    );

    this.drift.copy(this.currentWorldPosition).sub(this.previousWorldPosition);
    this.drift.multiplyScalar(-0.18 / delta);

    this.effect.update(delta, {
      active: movementThrottle > 0.01,
      throttle: Math.max(this.idleThrottle * 0.2, movementThrottle),
      drift: this.drift,
    });

    this.previousWorldPosition.copy(this.currentWorldPosition);
  }

  private bindLoop() {
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
