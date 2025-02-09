import { Camera } from '@Glibs/systems/camera/camera';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export default class TransformCtrl {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    objects: THREE.Group[] = [];
    transformControls = new TransformControls(this.camera, this.renderer.domElement);
    selectedObject: THREE.Object3D | null = null;
    enable = true

    constructor(
        private camera: Camera,
        private renderer: THREE.WebGLRenderer,
        scene: THREE.Scene,
    ) {
        // getHelper()가 존재하는지 확인 후 추가 (안전한 방식)
        const helper = (this.transformControls as any).getHelper?.();
        console.log(helper, typeof(helper))
        if (helper instanceof THREE.Object3D) {
            scene.add(helper);
        } else {
            scene.add(this.transformControls)
        }

        // 이동 스냅 설정 (0.5 단위)
        this.transformControls.setTranslationSnap(0.5);

        // TransformControls 조작 시 OrbitControls 비활성화
        this.transformControls.addEventListener('dragging-changed', (event) => {
            camera.controls.enabled = !event.value;
        });

        // 이동 후 스냅 적용 (수동 반올림)
        this.transformControls.addEventListener('objectChange', () => {
            if (this.selectedObject) {
                this.selectedObject.position.x = Math.round(this.selectedObject.position.x * 2) / 2;
                this.selectedObject.position.y = Math.round(this.selectedObject.position.y * 2) / 2;
                this.selectedObject.position.z = Math.round(this.selectedObject.position.z * 2) / 2;
            }
        });

        // 이벤트 리스너 등록
        window.addEventListener('click', this.onMouseClick.bind(this));
    }
    add(obj: THREE.Group) {
        this.objects.push(obj)
    }
    Enable() {
        if (this.enable) {
            window.addEventListener('click', this.onMouseClick.bind(this));
            this.enable = false
        }
    }
    Disable() {
        if (!this.enable) {
            this.enable = true
            window.removeEventListener('click', this.onMouseClick.bind(this));
        }
    }
    // 마우스 클릭 감지
    onMouseClick(event: MouseEvent): void {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects, true);

        if (intersects.length > 0) {
            let clickedObject: THREE.Object3D | null = intersects[0].object;

            // 부모를 따라가며 Mesh 찾기
            while (clickedObject && !(clickedObject instanceof THREE.Group)) {
                clickedObject = clickedObject.parent;
            }

            if (clickedObject instanceof THREE.Object3D) {
                this.selectedObject = clickedObject;
                this.transformControls.attach(this.selectedObject);
            } else {
                console.error("Selected object is not a THREE.Object3D instance:", clickedObject);
                this.transformControls.detach();
            }
        } else {
            this.selectedObject = null;
            this.transformControls.detach();
        }
    }
}
// 애니메이션 루프

