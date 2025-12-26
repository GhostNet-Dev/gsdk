// renderers/character/ThreeCharacterRenderer.ts
import * as THREE from 'three'; // Three.js 설치 필요
import { ICharacterRenderer } from '../views/characterview';
import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { Loader } from '@Glibs/loader/loader';
import { InvenFactory } from '@Glibs/inventory/invenfactory';
import { Npc } from '@Glibs/actors/npc/npc';
import { Char } from '@Glibs/types/assettypes';
import { IAsset } from '@Glibs/interface/iasset';
import { EventTypes } from '@Glibs/types/globaltypes';
import { ActionType } from '@Glibs/types/playertypes';
import { Player } from '@Glibs/actors/player/player';

export class ThreeCharacterRenderer implements ICharacterRenderer, ILoop {
  LoopId: number = 0
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  private renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // 투명 배경
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private player = new Npc(this.loader, this.loader.GetAssets(Char.CharHumanMale),
    this.eventCtrl, this.scene, this.inventory)

  constructor(
    private loader: Loader,
    private eventCtrl: IEventController,
    private inventory: InvenFactory,
    private refPlayer: Player,
  ) {
    // 캐릭터가 (4, 0, 4)에 있으므로, 카메라는 그보다 조금 멀리/위로 배치
    this.camera.position.set(4, 3, 10);
    this.camera.lookAt(4, 1, 4); // 캐릭터의 중심부를 바라봄
    this.scene.add(this.camera)

    // 조명 설정
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 10, 10);
    this.scene.add(light);
    this.scene.add(new THREE.AmbientLight(0x404040));
  }

  mount(container: HTMLElement) {
    const { width, height } = container.getBoundingClientRect();
    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);

    this.Init()

    // 애니메이션 루프 시작
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  async Init() {
    if(this.player.Asset.Id != this.refPlayer.Asset.Id) 
      await this.player.Loader(this.refPlayer.Asset, new THREE.Vector3(0, 0, 0), "renderer")
    this.player.Init(new THREE.Vector3(0, 0, 0))
    this.player.ChangeAction(ActionType.Idle)
    const obj = this.player.Meshs
    this.mixer = this.player.mixer ?? null; // 예시: Npc 클래스에서 믹서를 가져옴
    this.scene.add(obj);

    obj.updateMatrixWorld(true); // 행렬 강제 업데이트
    this.fitCameraToObject(obj, 1.2); // 1.3배 줌아웃 (약간 여유 있게)
    // 1. 모델 로딩 (GLTFLoader 등 사용)
    // 2. Mesh 교체 (장비 장착)
    // 3. VFX 추가 (Three.js Particle System)
  }
  update(delta: number): void {
    if (this.mixer) this.mixer.update(delta);
    this.renderer.render(this.scene, this.camera);
    this.player.Update(delta)
  }

  resize(w: number, h: number) {
    const aspect = w / h;
    const frustumSize = 10; // 카메라가 담을 수 있는 수직 공간의 크기 (임의의 기준값)

    // 화면 비율에 맞춰 가로 시야폭(frustum) 조절
    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    this.renderer.dispose();
    this.renderer.domElement.remove();
    // Geometry, Material, Texture 메모리 해제 로직 필수
  }
  /**
   * 객체가 화면에 꽉 차게 들어오도록 카메라 위치를 조정합니다.
   * @param object 대상 3D 객체 (Mesh 또는 Group)
   * @param offset 줌 아웃 비율 (1.0 = 딱 맞게, 1.2 = 20% 여유 공간)
   */
  private fitCameraToObject(object: THREE.Object3D, offset: number = 1.2) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // 캐릭터의 높이를 기준으로 잡습니다.
    const maxDim = Math.max(size.x, size.y, size.z);

    // 1. 카메라 위치는 캐릭터의 정면(중심)을 바라보게 고정
    // 거리는 near/far 클리핑만 안 되게 적당히 떨어뜨리면 됩니다 (Orthographic은 거리 상관없이 크기 동일)
    const direction = new THREE.Vector3(0, 0, 1); // 완전 정면
    this.camera.position.copy(center).add(direction.multiplyScalar(10)); // 10만큼 뒤로
    this.camera.lookAt(center);

    // 2. 줌(Zoom) 레벨 계산
    // 현재 카메라가 담고 있는 수직 높이(top - bottom)를 구합니다.
    const currentHeight = this.camera.top - this.camera.bottom;

    // 캐릭터 크기(maxDim)에 여유분(offset)을 곱한 것이 우리가 원하는 화면 높이입니다.
    // 줌 레벨 = 현재 카메라 높이 / (캐릭터 크기 * 여유분)
    // 예: 카메라가 10을 담는데 캐릭터가 5라면, zoom은 2배가 되어야 함. (10 / 5 = 2)
    // 반대로 offset(여유)을 고려하면:
    const newZoom = currentHeight / (maxDim * offset);

    this.camera.zoom = newZoom;
    this.camera.updateProjectionMatrix(); // 줌 변경 후 필수 호출
  }
}