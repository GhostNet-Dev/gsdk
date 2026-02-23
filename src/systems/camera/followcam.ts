import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class ThirdPersonFollowCameraStrategy implements ICameraStrategy {
    private targetPosition = new THREE.Vector3();
    private lookTarget = new THREE.Vector3();

    private isFreeView = false;
    
    private defaultLerpFactor = 0.05;
    private currentLerpFactor = 0.03;

    private dragTimer: ReturnType<typeof setTimeout> | null = null;
    private dragTimeoutMs = 3000;

    private prevPlayerPos = new THREE.Vector3();
    private followDistance = 6;
    private followHeight = 3;
    private smoothedBackDir = new THREE.Vector3(0, 0, -1);

    private readonly DIRECTION_SMOOTHING = 0.08;
    private readonly MAX_LERP_FACTOR = 0.05;
    private readonly MIN_LERP_FACTOR = 0.02;

    private readonly MIN_CAMERA_Y = 0.5;
    private readonly MIN_DISTANCE = 2.0; 

    private raycaster = new THREE.Raycaster();

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
        private obstacles: THREE.Object3D[],
    ) {
        this.init();
    }

    init() {
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; 
        this.controls.minDistance = 2.0;
        this.controls.maxDistance = 20.0;
    }

    orbitStart(): void {
        this.isFreeView = true;
        if (this.dragTimer) clearTimeout(this.dragTimer);

        // ✨ [진짜 원인 해결] AimView 등 다른 모드에 의해 1.2로 고정된 거리 제한을 해제
        this.controls.minDistance = this.MIN_DISTANCE;
        this.controls.maxDistance = Infinity; // 원하는 만큼 멀어질 수 있게 허용
        this.controls.enablePan = true;
    }

    orbitEnd(): void {
        this.dragTimer = setTimeout(() => {
            this.isFreeView = false;
            this.recalculateOffset();
        }, this.dragTimeoutMs);
    }


    syncFromCameraPose() {
        this.recalculateOffset()
    }
    private recalculateOffset() {
        const camToTarget = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        this.followHeight = Math.max(camToTarget.y, this.MIN_CAMERA_Y);
        camToTarget.y = 0;
        this.followDistance = Math.max(camToTarget.length(), this.MIN_DISTANCE);
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (!player) return;

        this.prevPlayerPos.copy(player.CenterPos);

        if (this.isFreeView) {
            // 조작 중일 때는 OrbitControls가 거리/각도를 계산하게 둠
            this.controls.target.copy(player.CenterPos);
            this.controls.update();
            return;
        }

        // --- 2. 방향 벡터 계산 ---
        const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.Meshs.quaternion);
        playerForward.y = 0;
        playerForward.normalize();

        const camToPlayerDir = new THREE.Vector3().subVectors(player.CenterPos, camera.position);
        camToPlayerDir.y = 0;
        camToPlayerDir.normalize();

        const dot = playerForward.dot(camToPlayerDir);

        let desiredCameraPos: THREE.Vector3;

        // ✨ 앞서 수정한 수학적 계산 보정 (y=0 이후 normalize)
        if (dot < -0.2) {
            const currentCamDir = new THREE.Vector3().subVectors(camera.position, player.CenterPos).normalize();
            currentCamDir.y = 0; 
            currentCamDir.normalize(); 
            
            desiredCameraPos = player.CenterPos.clone()
                .add(currentCamDir.multiplyScalar(this.followDistance))
                .add(new THREE.Vector3(0, this.followHeight, 0));
            
            this.currentLerpFactor = 0.02; 
        } else {
            const targetBackDir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.Meshs.quaternion);
            targetBackDir.y = 0;
            targetBackDir.normalize();

            this.smoothedBackDir.lerp(targetBackDir, this.DIRECTION_SMOOTHING).normalize();

            desiredCameraPos = player.CenterPos.clone()
                .add(this.smoothedBackDir.clone().multiplyScalar(this.followDistance))
                .add(new THREE.Vector3(0, this.followHeight, 0));
            
            const turnIntensity = 1 - Math.abs(dot);
            this.currentLerpFactor = THREE.MathUtils.clamp(
                this.defaultLerpFactor - (turnIntensity * 0.03),
                this.MIN_LERP_FACTOR,
                this.MAX_LERP_FACTOR,
            );
        }

        // --- 3. 장애물 충돌 검사 ---
        const direction = desiredCameraPos.clone().sub(player.CenterPos).normalize();
        this.raycaster.set(player.CenterPos, direction);
        this.raycaster.far = this.followDistance;

        const hits = this.raycaster.intersectObjects(this.obstacles, true);
        
        // ✨ [개선] 1.0 거리 이내의 충돌은 무조건 캐릭터 본인(또는 무기)이므로 무시
        const validHits = hits.filter(hit => hit.distance > 1.0);

        if (validHits.length > 0) {
            this.targetPosition.copy(validHits[0].point);
        } else {
            this.targetPosition.copy(desiredCameraPos);
        }

        if (this.targetPosition.y < this.MIN_CAMERA_Y) {
            this.targetPosition.y = this.MIN_CAMERA_Y;
        }

        // --- 4. 위치/회전 적용 ---
        camera.position.lerp(this.targetPosition, this.currentLerpFactor);
        
        this.lookTarget.lerp(player.CenterPos, this.currentLerpFactor * 2);
        camera.lookAt(this.lookTarget);

        this.controls.target.copy(player.CenterPos);
    }
}