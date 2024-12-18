import * as THREE from 'three';
import Nebula from 'three-nebula';
import {
  Emitter, Force, Rate, Span, RadialVelocity, Position, SphereZone, Vector3D,
  Color, Alpha, Scale, SpriteRenderer
} from 'three-nebula';
import { IEffect } from "../effector";

export class NebulaVfxCustom implements IEffect {
  processFlag = false
  nebula = new Nebula();
  emitter = new Emitter();
  obj = new THREE.Group()

  get Mesh() { return this.obj }

  constructor(private scene: THREE.Scene) {
    // 파티클 방출기 (Emitter) 생성

    // 파티클 방출 속도 설정 (스파크처럼 순간적으로 터짐)
    this.emitter.setRate(new Rate(new Span(50, 100), new Span(0.1)));

    // 파티클의 초기 위치 설정 (작은 구에서 발생)
    this.emitter.setInitializers([
      new Position(new SphereZone(0, 0, 0, 5)), // 작은 구 영역에서 스파크 발생
      new RadialVelocity(10, new Vector3D(0, 1, 0), 180, true), // 빠르게 퍼져나가는 스파크 속도
    ]);

    // 파티클의 색상, 크기, 수명 설정
    this.emitter.setBehaviours([
      new Color(new THREE.Color(0xffff00), new THREE.Color(0xff6600)), // 노란색에서 주황색으로 변화
      new Alpha(1, 0), // 투명도 변화 (점차 사라짐)
      new Scale(.5, 0.05), // 크기 변화
      new Force(0, -10, 0), // 파티클의 중력과 같은 힘 추가 (스파크가 자연스럽게 떨어지도록)
    ]);

    // 파티클 방출기를 파티클 시스템에 추가
  }
  Start() {
    this.processFlag = true
    // 시작
    this.emitter.emit()
    this.nebula = this.nebula.addEmitter(this.emitter);
    // 파티클 텍스처를 사용한 렌더러
    const spriteRenderer = new SpriteRenderer(this.obj as unknown as THREE.Scene, THREE);
    this.nebula = this.nebula.addRenderer(spriteRenderer);
    this.scene.add(this.obj)
  }
  Complete() {
    this.processFlag = false
  }
  Update(delta: number) {
    if (!this.processFlag) return
    this.nebula.update(delta)
  }
}


