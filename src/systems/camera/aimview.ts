import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class AimThirdPersonCameraStrategy implements ICameraStrategy {
    private dummyCamera = new THREE.PerspectiveCamera();
    private currentLookAt = new THREE.Vector3();

    // 캐릭터를 왼쪽으로 밀기 위해 오른쪽 오프셋을 크게 잡음
    private readonly shoulderOffset = new THREE.Vector3(0.85, 1.7, 0); 
    private readonly lookAheadDistance = 100;
    private readonly lerpFactor = 0.5;

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
    ) {
        // No init here, wait for setMode
    }

    init() {
        this.resetControls();
        
        // Sync dummy camera to real camera to avoid jumps
        this.dummyCamera.position.copy(this.camera.position);
        this.dummyCamera.quaternion.copy(this.camera.quaternion);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.currentLookAt.copy(this.camera.position).add(forward.multiplyScalar(this.lookAheadDistance));
        
        // Hijack OrbitControls to control our dummy camera
        this.controls.object = this.dummyCamera;
    }

    uninit() {
        // Restore OrbitControls to control the real camera
        this.controls.object = this.camera;
        this.controls.enabled = true;
        
        this.controls.minDistance = 0;
        this.controls.maxDistance = Infinity;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.enableDamping = true;
    }

    private resetControls() {
        this.controls.enabled = true;
        this.controls.enableZoom = true; 
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = false; 
        
        this.controls.minDistance = 1.0;
        this.controls.maxDistance = 5.0; 
        
        this.controls.minPolarAngle = 0.1;
        this.controls.maxPolarAngle = Math.PI - 0.1;
    }

    orbitStart(): void { }
    orbitEnd(): void { }

    update(camera: THREE.Camera, player?: IPhysicsObject): void {
        if (!player) return;

        // 1. Target the player shoulder height
        const target = player.CenterPos.clone().add(new THREE.Vector3(0, this.shoulderOffset.y, 0));
        this.controls.target.copy(target);
        this.controls.update();

        // 2. Calculate right and direction vectors
        const direction = new THREE.Vector3().subVectors(this.dummyCamera.position, target).normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
        
        // 3. 카메라 위치: 오른쪽 어깨 뒤쪽으로 배치 (캐릭터는 상대적으로 왼쪽에 위치하게 됨)
        const desiredPos = this.dummyCamera.position.clone().add(right.clone().multiplyScalar(this.shoulderOffset.x));

        // 4. Move real camera
        camera.position.lerp(desiredPos, 0.15);

        // 5. 🎯 시선 처리: 가늠자를 화면 오른쪽에 두기 위해 시선을 왼쪽으로 살짝 오프셋
        // 캐릭터를 비스듬히 보면서 타겟은 화면 중앙에서 오른쪽으로 치우쳐 보이게 합니다.
        const lookTarget = target.clone()
            .add(direction.multiplyScalar(-this.lookAheadDistance))
            .add(right.clone().multiplyScalar(-0.35)); // 시선을 캐릭터 쪽(왼쪽)으로 살짝 꺾음

        this.currentLookAt.lerp(lookTarget, 0.15);
        camera.lookAt(this.currentLookAt);
    }
}
