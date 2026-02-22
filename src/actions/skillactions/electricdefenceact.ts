import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { ActionContext, ActionDef, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { Camera } from "@Glibs/systems/camera/camera";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ElectricAura } from "@Glibs/magical/libs/electricaura";

export class ElectricDefenceAction implements IActionComponent, ILoop {
  LoopId: number = 0
  id = "electricdefence"
    // 6. 메쉬 (Mesh) 생성 및 장면에 추가
  sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x7cc8ff, 
    }));
  elec?: ElectricAura
  // 2. 달의 궤도가 될 빈 Object3D 생성 (가장 중요한 부분)
  moonOrbit = new THREE.Object3D();

  constructor(
    private eventCtrl: IEventController,
    private def: ActionDef,
  ) {
      const point = new THREE.PointLight(0x7cc8ff, 3, 15, 0.5)
      this.sphere.add(point)
  }

  activate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    if (!this.elec) {
      this.elec = new ElectricAura({ 
        boltCount: 20, 
        // boltRadius: .1, 
        boltJitter: 2, 
        spawnRate: 0.8, 
        boltGlow: 0.9 
      });
    }
    this.elec.attachTo(this.sphere);
    this.moonOrbit.add(this.sphere)
    this.sphere.position.x = 10

    // 캐릭터의 높이를 계산하여 중심점(가슴 높이) 설정
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      this.moonOrbit.position.y = center.y - obj.position.y;
      if (this.moonOrbit.position.y < 0.5) {
        this.moonOrbit.position.y = 1.2;
      }
    } else {
      this.moonOrbit.position.y = 1.2; // 폴백 값
    }

    obj.add(this.moonOrbit)
    this.moonOrbit.rotation.y -= 2 * Math.random();
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }
  deactivate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    obj.remove(this.moonOrbit)
    this.elec?.detach()
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
  }
  update(delta: number): void {
    this.moonOrbit.rotation.y -= 1 * delta;
    this.elec!.update(delta)
  }
}
