import * as THREE from "three";
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { ActionContext, ActionDef, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { OmniFlames } from "@Glibs/magical/libs/omniflame";
import { Camera } from "@Glibs/systems/camera/camera";
import { EventTypes } from "@Glibs/types/globaltypes";

export class FireballDefenceAction implements IActionComponent, ILoop {
  LoopId: number = 0
  id = "firedefence"
    // 6. 메쉬 (Mesh) 생성 및 장면에 추가
  sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffff00, // 밝은 노란색
      // toneMapped: false // 톤 매핑을 비활성화하여 Bloom 효과와 함께 사용할 때 더 밝게 빛나게 함
    }));
  flames?: OmniFlames
  // 2. 달의 궤도가 될 빈 Object3D 생성 (가장 중요한 부분)
  moonOrbit = new THREE.Object3D();

  constructor(
    private eventCtrl: IEventController,
    private camera: Camera,
    private def: ActionDef,
  ) {
      const point = new THREE.PointLight(0xffb15a, 3, 15, 0.5)
      this.sphere.add(point)
  }

  activate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    if (!this.flames) {
      this.flames = new OmniFlames({
        // 선택: 옵션 일부만 골라서 전달 가능
        streakCount: 2000,
        viewport: { width: window.innerWidth, height: window.innerHeight, fovDeg: this.camera.fov },
        shell: { farMul: 3, noiseScale: 1.5 }
      });
    }
    this.flames.attachTo(this.sphere);
    this.moonOrbit.add(this.sphere)
    this.sphere.position.x = 10
    
    // 캐릭터의 높이를 계산하여 중심점(가슴 높이) 설정
    const box = new THREE.Box3().setFromObject(obj);
    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      // obj.position.y가 캐릭터의 발 위치(바닥)라고 가정할 때, 
      // 로컬 y 좌표는 (박스 중심 y - 발 위치 y)가 됩니다.
      this.moonOrbit.position.y = center.y - obj.position.y;
      
      // 만약 계산된 높이가 너무 낮으면(예: 0.5 미만) 최소 높이 보정
      if (this.moonOrbit.position.y < 0.5) {
        this.moonOrbit.position.y = 1.2;
      }
    } else {
      this.moonOrbit.position.y = 1.2; // 폴백 값
    }

    obj.add(this.moonOrbit)
    this.moonOrbit.rotation.y += 2 * Math.random();
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }
  deactivate(target: IActionUser, context?: ActionContext | undefined): void {
    const obj = target.objs
    if (!obj) return
    obj.remove(this.moonOrbit)
    this.flames?.detach()
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
  }
  time = 0
  update(delta: number): void {
    this.time += delta
    this.moonOrbit.rotation.y += 1 * delta;
    this.flames!.update(delta, this.time)
  }
}
