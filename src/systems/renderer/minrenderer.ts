import * as THREE from 'three';
import IEventController, { IViewer } from "@Glibs/interface/ievent";
import { EventTypes } from '@Glibs/types/globaltypes';
import { ILoop } from '../event/ievent';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default class MiniRenderer implements IViewer, ILoop {
  LoopId = 0
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  constructor(
    private eventCtrl: IEventController,
    private container: HTMLDivElement
  ) {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterViewer, this)
    // 렌더러 초기화
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // 렌더러 DOM 요소를 컨테이너에 추가
    container.appendChild(this.renderer.domElement);

    // 씬과 카메라 초기화
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.x = 5;
    this.camera.position.y = 5;
    this.camera.position.z = 5;
    const abmbient = new THREE.AmbientLight(0xffffff, 1)
    this.scene.add(this.light(), abmbient)

    const ctrl = new OrbitControls(this.camera, this.renderer.domElement)
    ctrl.rotateSpeed = 0.5
  }
  currentObj?: THREE.Object3D
  add(obj: THREE.Object3D) {
    if(this.currentObj) this.scene.remove(this.currentObj)
    this.scene.add(obj);
    this.fitObjectToCamera(obj)
    this.currentObj = obj
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  update() {
    this.renderer.render(this.scene, this.camera);
  };
  hide() {
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
  }
  public resize() {
    // 컨테이너 크기에 맞춰 카메라와 렌더러 업데이트
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  light() {
    const hemispherelight = new THREE.HemisphereLight(0xffffff, 0x333333)
    hemispherelight.position.set(0, 20, 10)
    const directlight = new THREE.DirectionalLight(0xffffff, 3);
    directlight.position.set(4, 10, 4)
    directlight.lookAt(new THREE.Vector3().set(0, 2, 0))
    directlight.castShadow = true
    directlight.shadow.radius = 1000
    directlight.shadow.mapSize.width = 4096
    directlight.shadow.mapSize.height = 4096
    directlight.shadow.camera.near = 1
    directlight.shadow.camera.far = 1000.0
    directlight.shadow.camera.left = 500
    directlight.shadow.camera.right = -500
    directlight.shadow.camera.top = 500
    directlight.shadow.camera.bottom = -500
    return directlight
  }
  fitObjectToCamera(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object); // 객체의 Bounding Box 계산
    const size = box.getSize(new THREE.Vector3()); // 크기 가져오기
    const center = box.getCenter(new THREE.Vector3()); // 중심 좌표 가져오기

    // 카메라 시야각(FOV)과 객체의 크기를 고려하여 적절한 거리 계산
    const maxDim = Math.max(size.x, size.y, size.z); // 가장 큰 차원 선택
    const fov = this.camera.fov * (Math.PI / 180); // FOV를 라디안으로 변환
    let distance = maxDim / (2 * Math.tan(fov / 2)); // 적절한 거리 계산

    // 카메라 위치 조정
    this.camera.position.set(center.x + distance, center.y, center.z + distance);
    this.camera.lookAt(center);
  }
}


