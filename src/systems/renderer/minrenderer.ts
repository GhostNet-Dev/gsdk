import * as THREE from 'three';
import IEventController, { IViewer } from "@Glibs/interface/ievent";
import { EventTypes } from '@Glibs/types/globaltypes';
import { ILoop } from '../event/ievent';

export default class CharacterRenderer implements IViewer, ILoop {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  constructor(
    private eventCtrl: IEventController,
    private container: HTMLDivElement
  ) {
    this.eventCtrl.SendEventMessage(EventTypes.RegisterViewer, this)
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
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
    this.camera.position.z = 5;
    this.scene.add(this.light())

  }
  add(obj: THREE.Object3D) {
    this.scene.add(obj);
  }

  update() {
    this.renderer.render(this.scene, this.camera);
  };

  public resize() {
    // 컨테이너 크기에 맞춰 카메라와 렌더러 업데이트
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  light() {
    const abmbient = new THREE.AmbientLight(0xffffff, 1)
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
}


