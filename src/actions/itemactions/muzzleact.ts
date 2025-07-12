import * as THREE from "three";
import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes"
import gsap from "gsap";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export class MuzzleAction implements IActionComponent {
  type = "muzzleFlash"
  triggerType: TriggerType = "onFire"

  mat = new THREE.MeshBasicMaterial({
    map: this.texture,
    color: 0xffdd88,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  flash1 = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), this.mat);
  flash2 = new THREE.Mesh(new THREE.PlaneGeometry(this.size, this.size), this.mat);
  flashLight = new THREE.PointLight(0xffaa66, 2, 2);
  scale = .5

  constructor(
    eventCtrl: IEventController,
    scene: THREE.Scene,
    private texture: THREE.Texture,
    private socket: string = "muzzlePoint", // 기본값
    private size: number = 0.6,
    private duration: number = 0.08
  ) { 
    eventCtrl.SendEventMessage(EventTypes.SetNonGlow, this.flash1)
    eventCtrl.SendEventMessage(EventTypes.SetNonGlow, this.flash2)
    this.flash1.visible = this.flash2.visible = this.flashLight.visible = false
    scene.add(this.flash1);
    scene.add(this.flash2);
    scene.add(this.flashLight);
  }

  trigger(user: IActionUser, triggerType: TriggerType, ctx?: ActionContext) {
    const obj = user.objs
    if (!obj || this.triggerType !== triggerType) return

    // 위치와 방향
    const position = obj.getObjectByName(this.socket)!.getWorldPosition(new THREE.Vector3())
    const direction = ctx?.direction?.clone() ?? obj.getWorldDirection(new THREE.Vector3())
    const forwardPos = position.clone().add(direction.multiplyScalar(this.scale))

    this.spawnMuzzleFlashMultiPlane(forwardPos, direction, this.duration)
  }
  prevTween?: gsap.core.Tween 

  spawnMuzzleFlashMultiPlane(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    duration: number = 0.08
  ) {

    const forward = direction.clone().normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const q1 = new THREE.Quaternion().setFromUnitVectors(up, forward);

    this.flash1.position.copy(position);
    this.flash1.quaternion.copy(q1);

    const q2 = new THREE.Quaternion().setFromAxisAngle(up, Math.PI / 2);
    this.flash2.position.copy(position);
    this.flash2.quaternion.copy(q1).multiply(q2);

    this.flashLight.position.copy(position);

    this.show(this.duration)
  }

  private disposeTimer?: ReturnType<typeof setTimeout>

  show(duration: number = 80) {
    this.flash1.visible = this.flash2.visible = this.flashLight.visible = true

    // 이전 타이머가 있다면 즉시 종료 후 재등록
    if (this.disposeTimer) {
      clearTimeout(this.disposeTimer)
    }

    this.disposeTimer = setTimeout(() => {
      this.hide()
    }, duration)
  }

  hide() {
    this.flash1.visible = this.flash2.visible = this.flashLight.visible = false
  }
}
