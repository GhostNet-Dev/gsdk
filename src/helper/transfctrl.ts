import { Camera } from '@Glibs/systems/camera/camera';
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

export enum TransCtrlMode {
    Translate,
    Rotate,
    Scale,
}

export default class TransformCtrl {
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    objects: THREE.Group[] = [];
    transformControls = new TransformControls(this.camera, this.renderer.domElement);
    selectedObject: THREE.Object3D | null = null;
    enable = false
    dom = document.createElement("div")
    mode = TransCtrlMode.Translate

    constructor(
        private camera: Camera,
        private renderer: THREE.WebGLRenderer,
        private scene: THREE.Scene,
        { enable = false, fontFamily = "coiny" } = {}
    ) {
        // getHelper()가 존재하는지 확인 후 추가 (안전한 방식)
        this.enable = enable
        

        // 이동 스냅 설정 (0.5 단위)
        this.transformControls.setTranslationSnap(0.5);
        this.transformControls.setRotationSnap(Math.PI / 4);
        this.transformControls.setScaleSnap(0.5);

        // TransformControls 조작 시 OrbitControls 비활성화
        this.transformControls.addEventListener('dragging-changed', (event) => {
            camera.controls.enabled = !event.value;
        });

        // 이동 후 스냅 적용 (수동 반올림)
        // this.transformControls.addEventListener('objectChange', () => {
        //     if (this.selectedObject) {
        //         this.selectedObject.position.x = Math.round(this.selectedObject.position.x * 2) / 2;
        //         this.selectedObject.position.y = Math.round(this.selectedObject.position.y * 2) / 2;
        //         this.selectedObject.position.z = Math.round(this.selectedObject.position.z * 2) / 2;
        //     }
        // });

        this.dom.classList.add("container", "w-auto", "rounded", "p-1", "m-1", "gametext")
        this.dom.style.backgroundColor = `rgba(0, 0, 0, 0.5)`
        this.dom.style.boxShadow = `0 4px 8px rgba(0, 0, 0, 0.5)`
        this.dom.style.overflow = "hidden"
        this.dom.style.position = "absolute"
        this.dom.style.top = "10%"
        this.dom.style.right = "0px"
        this.dom.style.fontFamily = fontFamily

        // 이벤트 리스너 등록
        if (enable) window.addEventListener('click', this.onMouseClick.bind(this));
        this.transformControls.addEventListener("enabled-changed", () => {
            this.dom.innerText = this.StatusToString()
        })
        this.transformControls.addEventListener("objectChange", () => {
            if (this.selectedObject) {
                const r = (this.mode == TransCtrlMode.Rotate) ? this.selectedObject.rotation :
                    (this.mode == TransCtrlMode.Scale) ? this.selectedObject.scale : { x: 0, y: 0, z: 0 }
                r.x = (r.x < 0) ? 0.001 : r.x
                r.y = (r.y < 0) ? 0.001 : r.y
                r.z = (r.z < 0) ? 0.001 : r.z
            }
            this.dom.innerText = this.StatusToString()
        })
    }
    StatusToString() {
        let xyz: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 }
        let text = ""
        if (this.mode == TransCtrlMode.Translate) {
            if (this.selectedObject) xyz = this.selectedObject.position
            text = "trnsla"
        } else if (this.mode == TransCtrlMode.Rotate) {
            if (this.selectedObject) xyz = this.selectedObject.rotation
            text = "rotate"
        } else {
            if (this.selectedObject) xyz = this.selectedObject.scale
            text = "scale"
        }
        text += `\nx:${xyz.x}\ny:${xyz.y}\nz:${xyz.z}`
        return text
    }
    SetMode(mode: TransCtrlMode) {
        if(mode == TransCtrlMode.Translate)
            this.transformControls.setMode("translate")
        else if (mode == TransCtrlMode.Rotate)
            this.transformControls.setMode("rotate")
        else 
            this.transformControls.setMode("scale")
        this.mode = mode
    }
    add(obj: THREE.Group) {
        this.objects.push(obj)
    }
    Enable() {
        if (!this.enable) {
            window.addEventListener('click', this.onMouseClick.bind(this));
            this.enable = false
            document.body.appendChild(this.dom)
            const helper = (this.transformControls as any).getHelper?.();
            if (helper instanceof THREE.Object3D) {
                this.scene.add(helper);
            } else {
                this.scene.add(this.transformControls)
            }
            this.enable = true
        }
    }
    Disable() {
        if (this.enable) {
            window.removeEventListener('click', this.onMouseClick.bind(this));
            document.body.removeChild(this.dom)

            const helper = (this.transformControls as any).getHelper?.();
            if (helper instanceof THREE.Object3D) {
                this.scene.remove(helper);
            } else {
                this.scene.remove(this.transformControls)
            }
            this.enable = false
            this.selectedObject = null;
            this.transformControls.detach();
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

