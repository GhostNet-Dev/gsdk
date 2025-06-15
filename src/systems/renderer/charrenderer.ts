import * as THREE from 'three';
import IEventController, { IViewer } from "@Glibs/interface/ievent";
import { EventTypes } from '@Glibs/types/globaltypes';
import { ILoop } from '../event/ievent';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ZeldaGrass } from '@Glibs/world/grass/zeldagrass';
import { SkyBoxAllTime } from '@Glibs/world/sky/skyboxalltime';
import { Player } from '@Glibs/actors/player/player';
import { Loader } from '@Glibs/loader/loader';
import { Char } from '@Glibs/types/assettypes';
import { IAsset } from '@Glibs/interface/iasset';
import { ActionType } from '@Glibs/types/playertypes';
import IInventory from '@Glibs/interface/iinven';
import { Effector } from '@Glibs/magical/effects/effector';

export default class CharMiniRenderer implements IViewer, ILoop {
    LoopId = 0
    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera: THREE.PerspectiveCamera;
    private center = new THREE.Vector3()
    private directlight = new THREE.DirectionalLight(0xffffff, 3);
    private grass = new ZeldaGrass(this.eventCtrl)
    private sky = new SkyBoxAllTime(this.directlight, { daytime: 0 })
    private player = new Player(this.loader, this.loader.GetAssets(Char.CharHumanMale), 
        this.eventCtrl, this.effector, this.scene, this.inventory)

    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private effector: Effector,
        private container: HTMLDivElement,
        private inventory: IInventory,
    ) {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterViewer, this)
        // 렌더러 초기화
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        // 렌더러 DOM 요소를 컨테이너에 추가
        container.appendChild(this.renderer.domElement);

        // 씬과 카메라 초기화
        this.camera = new THREE.PerspectiveCamera(
            50,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        const abmbient = new THREE.AmbientLight(0xffffff, 1)
        this.scene.add(this.light(), abmbient, this.grass.mesh, this.sky.Meshs)

        // const ctrl = new OrbitControls(this.camera, this.renderer.domElement)
        // ctrl.rotateSpeed = 0.1
        // ctrl.enablePan = false;              // 팬 비활성화
        // ctrl.enableZoom = false;             // 줌 비활성화 (선택)
    }
    currentObj?: THREE.Object3D
    async Init(asset: IAsset) {
        await this.player.Loader(asset, new THREE.Vector3(4, 1, 4), "renderer")
        this.player.Init(new THREE.Vector3(4, 0, 4))
        this.player.ChangeAction(ActionType.Idle)

        const obj = this.player.Meshs
        this.fitObjectToCamera(obj)

        this.scene.add(obj);
        this.currentObj = obj
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }

    update(delta: number) {
        //this.camera.lookAt(this.center);
        this.renderer.render(this.scene, this.camera);
        this.player.Update(delta)
    };
    hide() {
        if (this.currentObj) this.scene.remove(this.currentObj)
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
        this.player.Uninit()
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
        this.directlight.position.set(4, 10, 4)
        this.directlight.lookAt(new THREE.Vector3().set(0, 2, 0))
        this.directlight.castShadow = true
        this.directlight.shadow.radius = 1000
        this.directlight.shadow.mapSize.width = 4096
        this.directlight.shadow.mapSize.height = 4096
        this.directlight.shadow.camera.near = 1
        this.directlight.shadow.camera.far = 1000.0
        this.directlight.shadow.camera.left = 500
        this.directlight.shadow.camera.right = -500
        this.directlight.shadow.camera.top = 500
        this.directlight.shadow.camera.bottom = -500
        return this.directlight
    }
    fitObjectToCamera(object: THREE.Object3D) {
        const box = new THREE.Box3().setFromObject(object); // 객체의 Bounding Box 계산
        const size = box.getSize(new THREE.Vector3()); // 크기 가져오기
        const center = object.position.clone()
        center.y += size.y / 2

        // 카메라 시야각(FOV)과 객체의 크기를 고려하여 적절한 거리 계산
        const maxDim = Math.max(size.x, size.y, size.z); // 가장 큰 차원 선택
        const fov = this.camera.fov * (Math.PI / 180); // FOV를 라디안으로 변환
        let distance = maxDim / (2 * Math.tan(fov / 2)); // 적절한 거리 계산

        // 카메라 위치 조정
        this.camera.position.set(center.x, center.y + size.y / 2, center.z + distance);
        this.camera.lookAt(center);
        console.log(object.position)
        console.log(center, distance, this.camera.position)
        this.center = center
    }
}


