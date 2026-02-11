import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class ThirdPersonFollowCameraStrategy implements ICameraStrategy {
    private targetPosition = new THREE.Vector3();
    private lookTarget = new THREE.Vector3();

    private isFreeView = false;
    
    private defaultLerpFactor = 0.05; // 기본 부드러움
    private currentLerpFactor = 0.03;

    private dragTimer: ReturnType<typeof setTimeout> | null = null;
    private dragTimeoutMs = 3000;

    private prevPlayerPos = new THREE.Vector3();
    private followDistance = 6;
    private followHeight = 3;

    private readonly MIN_CAMERA_Y = 0.5;
    private readonly MIN_DISTANCE = 2.0; 

    private raycaster = new THREE.Raycaster();

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
        private obstacles: THREE.Object3D[],
    ) {
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; 
    }

    orbitStart(): void {
        this.isFreeView = true;
        if (this.dragTimer) clearTimeout(this.dragTimer);
    }

    orbitEnd(): void {
        this.dragTimer = setTimeout(() => {
            this.isFreeView = false;
            this.recalculateOffset();
        }, this.dragTimeoutMs);
    }

    private recalculateOffset() {
        const camToTarget = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        this.followHeight = Math.max(camToTarget.y, this.MIN_CAMERA_Y);
        camToTarget.y = 0;
        this.followDistance = Math.max(camToTarget.length(), this.MIN_DISTANCE);
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (!player) return;

        // 1. 이동 감지
        const moved = this.prevPlayerPos.distanceToSquared(player.CenterPos) > 0.0001;
        this.prevPlayerPos.copy(player.CenterPos);

        if (this.isFreeView && moved) {
            this.isFreeView = false;
            this.recalculateOffset();
            if (this.dragTimer) clearTimeout(this.dragTimer);
        }

        if (this.isFreeView) {
            this.controls.update();
            return;
        }

        // --- 2. 방향 벡터 계산 (핵심 수정 부분) ---

        // 캐릭터가 바라보는 방향 (Forward)
        const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.Meshs.quaternion);
        playerForward.y = 0;
        playerForward.normalize();

        // 카메라가 캐릭터를 바라보는 방향 (Camera to Player)
        const camToPlayerDir = new THREE.Vector3().subVectors(player.CenterPos, camera.position);
        camToPlayerDir.y = 0;
        camToPlayerDir.normalize();

        // 내적(Dot Product) 계산: 
        // 1에 가까움 = 캐릭터가 카메라 등지고 있음 (일반 주행)
        // -1에 가까움 = 캐릭터가 카메라 보면서 달려옴 (후진)
        const dot = playerForward.dot(camToPlayerDir);

        let desiredCameraPos: THREE.Vector3;

        // ✨ [해결책] 캐릭터가 카메라를 향해 다가오는 경우 (dot < -0.2 정도)
        // 카메라를 캐릭터 등 뒤로 보내지 말고, 현재 카메라 각도를 유지하며 위치만 따라감
        if (dot < -0.2) {
            // 현재 카메라가 있는 방향 그대로 거리만 유지
            const currentCamDir = new THREE.Vector3().subVectors(camera.position, player.CenterPos).normalize();
            currentCamDir.y = 0; // 높이 영향 제거
            
            desiredCameraPos = player.CenterPos.clone()
                .add(currentCamDir.multiplyScalar(this.followDistance)) // 현재 방향 유지
                .add(new THREE.Vector3(0, this.followHeight, 0));
            
            // 후진 중에는 카메라는 느리게 따라오는 게 자연스러움
            this.currentLerpFactor = 0.02; 
        } else {
            // 일반 주행: 캐릭터 등 뒤로 이동
            const backDir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.Meshs.quaternion);
            backDir.y = 0;
            backDir.normalize();

            desiredCameraPos = player.CenterPos.clone()
                .add(backDir.multiplyScalar(this.followDistance))
                .add(new THREE.Vector3(0, this.followHeight, 0));
            
            // 일반 주행은 적당한 속도
            this.currentLerpFactor = this.defaultLerpFactor;
        }

        // --- 3. 장애물 충돌 검사 ---
        const direction = desiredCameraPos.clone().sub(player.CenterPos).normalize();
        this.raycaster.set(player.CenterPos, direction);
        this.raycaster.far = this.followDistance;

        const hits = this.raycaster.intersectObjects(this.obstacles, true);
        if (hits.length > 0) {
            this.targetPosition.copy(hits[0].point);
        } else {
            this.targetPosition.copy(desiredCameraPos);
        }

        // 지면 뚫림 방지
        if (this.targetPosition.y < this.MIN_CAMERA_Y) {
            this.targetPosition.y = this.MIN_CAMERA_Y;
        }

        // --- 4. 위치/회전 적용 ---
        camera.position.lerp(this.targetPosition, this.currentLerpFactor);
        
        // 시선 처리
        this.lookTarget.lerp(player.CenterPos, this.currentLerpFactor * 2);
        camera.lookAt(this.lookTarget);

        this.controls.target.copy(player.CenterPos);
    }
}