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

export class ThreeCharacterRenderer implements ICharacterRenderer, ILoop {
  LoopId: number = 0
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // 투명 배경
  private model: THREE.Group | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private player = new Npc(this.loader, this.loader.GetAssets(Char.CharHumanMale),
    this.eventCtrl, this.scene, this.inventory)

  constructor(
    private loader: Loader,
    private eventCtrl: IEventController,
    private inventory: InvenFactory,
  ) {

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

    // 애니메이션 루프 시작
    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this) 
  }

  async Init(asset: IAsset) {
    await this.player.Loader(asset, new THREE.Vector3(4, 1, 4), "renderer")
    this.player.Init(new THREE.Vector3(4, 0, 4))
    this.player.ChangeAction(ActionType.Idle)
    const obj = this.player.Meshs
    this.scene.add(obj);
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
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  dispose() {
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this) 
    this.renderer.dispose();
    this.renderer.domElement.remove();
    // Geometry, Material, Texture 메모리 해제 로직 필수
  }
}