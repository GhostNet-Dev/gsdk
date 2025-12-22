import * as THREE from 'three';
import IEventController, { IViewer } from "@Glibs/interface/ievent";
import { EventTypes } from '@Glibs/types/globaltypes';
import { ILoop } from '../event/ievent';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ZeldaGrass } from '@Glibs/world/grass/zeldagrass';
import { SkyBoxAllTime } from '@Glibs/world/sky/skyboxalltime';
import { Loader } from '@Glibs/loader/loader';
import { Char } from '@Glibs/types/assettypes';
import { IAsset } from '@Glibs/interface/iasset';
import { ActionType } from '@Glibs/types/playertypes';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { Npc } from '@Glibs/actors/npc/npc';
import { InvenFactory } from '@Glibs/inventory/invenfactory';

export default class CharMiniRenderer implements IViewer, ILoop {
    LoopId = 0
    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera: THREE.OrthographicCamera;
    private center = new THREE.Vector3()
    private directlight = new THREE.DirectionalLight(0xffffff, 3);
    private grass = new ZeldaGrass(this.eventCtrl)
    private sky = new SkyBoxAllTime(this.directlight, { daytime: 0 })
    private player = new Npc(this.loader, this.loader.GetAssets(Char.CharHumanMale),
        this.eventCtrl, this.scene, this.inventory)

    frustumSize = 5; // 뷰포트의 전체 높이 (또는 너비)를 결정하는 값. 이 값을 조절하여 캐릭터의 크기를 조절합니다.

    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private container: HTMLDivElement,
        private inventory: InvenFactory,
    ) {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterViewer, this)
        // 렌더러 초기화
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        console.log(container.clientWidth, container.clientHeight)
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // 렌더러 생성 시 또는 생성 후
        this.renderer.setClearColor(0x87CEEB, 1); // 하늘색 (투명도 1 = 불투명)
        this.renderer.domElement.width = container.clientWidth;
        this.renderer.domElement.classList.add('rounded')
        // 렌더러 DOM 요소를 컨테이너에 추가
        container.appendChild(this.renderer.domElement);
        // 카메라 설정
        const aspect = container.clientWidth / container.clientHeight;

        this.camera = new THREE.OrthographicCamera(
            -this.frustumSize * aspect / 2, // left
            this.frustumSize * aspect / 2, // right
            this.frustumSize / 2,          // top
            -this.frustumSize / 2,          // bottom
            0.1,                       // near
            1000                       // far
        );

        // 씬과 카메라 초기화
        // this.camera = new THREE.PerspectiveCamera(
        //     75,
        //     container.clientWidth / container.clientHeight,
        //     0.1,
        //     1000
        // );
        const abmbient = new THREE.AmbientLight(0xffffff, 1)
        this.scene.add(this.light(), abmbient, this.grass.mesh, this.sky.Meshs)
        // const ctrl = new OrbitControls(this.camera, this.renderer.domElement)
        // ctrl.rotateSpeed = 0.1
        // ctrl.enablePan = false;              // 팬 비활성화
        // ctrl.enableZoom = false;             // 줌 비활성화 (선택)

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // this.renderer.domElement.style.width = container.clientWidth + "px"
                    console.log(container.clientWidth, container, container.style.width)
                    this.resize()
                    observer.unobserve(entry.target);
                } 
            });
        }, {
            root: null, // 뷰포트를 기준으로 관찰 (기본값)
            threshold: 0.1 // 요소의 100%가 보일 때 콜백 실행
        });

        observer.observe(container);
    }
    currentObj?: THREE.Object3D
    async Init(asset: IAsset) {
        await this.player.Loader(asset, new THREE.Vector3(4, 1, 4), "renderer")
        this.player.Init(new THREE.Vector3(4, 0, 4))
        this.player.ChangeAction(ActionType.Idle)

        const obj = this.player.Meshs
        this.setupOrthographicCameraForObject(this.camera, this.container, this.player)
        // this.fitObjectToCamera(obj)

        this.scene.add(obj);
        this.currentObj = obj
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }

    update(delta: number) {
        //this.camera.lookAt(this.center);
        if(this.camera.position.y < 0) this.camera.position.y = 0
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
        setTimeout(() => {
            const newAspect = this.container.clientWidth / this.container.clientHeight;
            console.log(this.container.clientWidth, this.container.clientHeight, newAspect, this.container.style.width)
            this.camera.left = -this.frustumSize * newAspect / 2;
            this.camera.right = this.frustumSize * newAspect / 2;
            this.camera.top = this.frustumSize / 2;
            this.camera.bottom = -this.frustumSize / 2;
            // this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        });
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

    /**
     * OrthographicCamera를 OBJ 모델에 맞게 설정하는 함수.
     * 렌더러 배경색을 설정하고, 모델의 크기와 위치에 따라 카메라의 뷰포트와 위치를 조정하며,
     * 모델 하단이 화면 하단에 가깝게 오고 캐릭터는 수평 중앙에 위치하도록 합니다.
     *
     * @param {THREE.OrthographicCamera} camera - 설정할 OrthographicCamera 인스턴스.
     * @param {HTMLElement} rendererDomElement - 렌더러의 DOM 요소 (OrbitControls 초기화에 필요).
     * @param {THREE.Object3D} object - 카메라를 맞출 OBJ 모델 (THREE.Group 또는 THREE.Mesh).
     * @param {number} [padding=1.2] - 모델 주변에 추가할 여백 (1.0 = 여백 없음, 1.2 = 20% 여백).
     * @param {number} [bottomOffsetRatio=0.1] - 모델 하단을 화면 하단으로부터 얼마나 띄울지 비율 (0.0 = 딱 맞게, 0.1 = 10% 띄움).
     * @returns {OrbitControls} 설정된 OrbitControls 인스턴스.
     */
    setupOrthographicCameraForObject(
        camera: THREE.OrthographicCamera,
        rendererDomElement: HTMLElement,
        object: IPhysicsObject,
        padding: number = 1.2,
        bottomOffsetRatio: number = 0.1 // y=0을 하단에 맞추기 위한 비율
    ): OrbitControls {
        // 1. 모델의 바운딩 박스 계산
        const center = object.CenterPos; // 모델의 중심점
        const size = object.Size;     // 모델의 크기 (x, y, z)

        // 2. 뷰포트(frustum) 높이 계산 (모델의 전체 높이 기준)
        const objectHeight = size.y;
        // 패딩을 고려한 뷰포트의 높이 (모델이 완전히 보이도록)
        let frustumHeight = objectHeight * padding;

        // 3. 화면 비율 (aspect ratio) 계산
        const aspect = rendererDomElement.clientWidth / rendererDomElement.clientHeight;

        // 4. OrthographicCamera의 뷰포트 경계 설정
        // 목표: 모델의 bottom (box.min.y)이 뷰포트의 하단에 오도록 하고,
        // 모델의 상단까지 포함하여 frustumHeight가 유지되도록 top 값을 설정합니다.
        const cameraBottom = object.Pos.y - (frustumHeight * bottomOffsetRatio); // 모델 하단에서 조금 더 내림
        const cameraTop = cameraBottom + frustumHeight; // 계산된 높이를 유지하며 top 설정

        camera.left = -frustumHeight * aspect / 2; // 화면 비율에 따라 좌우 폭 계산
        camera.right = frustumHeight * aspect / 2;
        camera.top = cameraTop;
        camera.bottom = cameraBottom;

        // 5. 카메라의 near 및 far clipping plane 설정
        // 모델 전체가 렌더링되도록 충분히 넓게 설정합니다.
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.near = center.z - maxDim * 2; // 모델 뒤쪽도 볼 수 있도록 충분히 가깝게
        camera.far = center.z + maxDim * 2;  // 모델 앞쪽도 볼 수 있도록 충분히 멀리
        camera.updateProjectionMatrix(); // 카메라 설정 변경 후 반드시 호출

        // 6. 카메라 위치 및 시선(lookAt) 설정
        // 카메라를 모델 중심의 Z축 위치에서 충분히 뒤로 물리고, 모델의 중심을 바라보도록 설정합니다.
        // OrthographicCamera에서는 Z축 거리에 따라 보이는 크기가 변하지 않지만,
        // OrbitControls 사용 시 초기 시점 설정에 중요합니다.
        // Y축 위치는 카메라 뷰포트의 중심 Y와 모델 중심 Y를 맞춰줍니다.
        const cameraLookAtY = center.y; // 모델의 Y 중심을 바라보도록
        camera.position.set(center.x, object.Size.y, center.z + maxDim * padding * 2); // 모델 뒤로 충분히 이동
        camera.lookAt(center.x, cameraLookAtY, center.z); // 모델의 Y 중심을 바라보도록 설정

        // 7. OrbitControls 설정 (선택 사항이지만 강력 추천)
        const controls = new OrbitControls(camera, rendererDomElement);
        controls.target.set(center.x, cameraLookAtY, center.z); // OrbitControls의 타겟도 모델 중심으로 설정
        controls.enableDamping = true; // 부드러운 카메라 움직임
        controls.dampingFactor = 0.05;

        // 2. 카메라 이동 (팬) 제한
        controls.enablePan = false;

        // 3. 카메라 줌 제한
        controls.enableZoom = false; 
        controls.update(); // OrbitControls 설정 변경 후 반드시 호출


        return controls; // 설정된 OrbitControls 반환
    }
    // fitObjectToCamera(object: THREE.Object3D) {
    //     const box = new THREE.Box3().setFromObject(object); // 객체의 Bounding Box 계산
    //     const size = box.getSize(new THREE.Vector3()); // 크기 가져오기
    //     const center = object.position.clone()
    //     center.y += size.y / 2

    //     // 카메라 시야각(FOV)과 객체의 크기를 고려하여 적절한 거리 계산
    //     const maxDim = Math.max(size.x, size.y, size.z); // 가장 큰 차원 선택
    //     const fov = this.camera.fov * (Math.PI / 180); // FOV를 라디안으로 변환
    //     let distance = maxDim / (2 * Math.tan(fov / 2)); // 적절한 거리 계산

    //     // 카메라 위치 조정
    //     this.camera.position.set(center.x, center.y + size.y / 2, center.z + distance);
    //     this.camera.lookAt(center);
    //     console.log(object.position)
    //     console.log(center, distance, this.camera.position)
    //     this.center = center
    // }
}


