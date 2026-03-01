import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class ThirdPersonFollowCameraStrategy implements ICameraStrategy {
    private dummyCamera = new THREE.PerspectiveCamera();
    
    private isResuming = false;
    private defaultOffset = new THREE.Vector3(0, 2.5, -20);
    private lookTarget = new THREE.Vector3();
    private lerpFactor = 0.15; // 부드러움 조절

    private isFreeView = false;
    private dragTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly dragTimeoutMs = 2000;
    
    private readonly backwardIgnoreThreshold = -0.15;
    private readonly cameraApproachIgnoreThreshold = 0.35;
    private readonly safeMinDistancePadding = 0.4;

    private prevPlayerPos = new THREE.Vector3();
    private stableOffset = new THREE.Vector3();
    private hasStableOffset = false;
    private raycaster = new THREE.Raycaster();

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
        private obstacles: THREE.Object3D[],
    ) {}

    init() {
        this.controls.enabled = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; 
        this.controls.minDistance = 2.0;
        this.controls.maxDistance = 20.0;
        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;

        this.controls.object = this.dummyCamera;
        this.isResuming = true; 
    }

    /**
     * 🌟 외부에서 카메라 모드 전환 시 호출됨.
     * 현재 카메라의 실제 위치와 회전 상태를 dummyCamera와 lookTarget에 동기화하여
     * 'update' 시 lerp가 현재 위치에서부터 부드럽게 시작되도록 함.
     */
    syncFromCameraPose() {
        // 1. 현재 카메라 위치를 dummyCamera로 복사
        this.dummyCamera.position.copy(this.camera.position);
        this.dummyCamera.quaternion.copy(this.camera.quaternion);

        // 2. 현재 카메라가 바라보고 있는 지점을 계산하여 lookTarget 초기화
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.lookTarget.copy(this.camera.position).add(forward.multiplyScalar(10));
        
        // 3. OrbitControls의 내부 상태도 갱신 (반드시 dummyCamera 기준으로)
        this.controls.update();
        
        // 4. 리줌 플래그는 유지하되, 위치 튀는 현상 방지
        this.isResuming = true;
    }

    uninit() {
        this.controls.object = this.camera; 
        this.controls.minDistance = 0;
        this.controls.maxDistance = Infinity;
        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;
        this.controls.maxPolarAngle = Math.PI;
    }

    orbitStart(): void { 
        this.isFreeView = true;
        if (this.dragTimer) clearTimeout(this.dragTimer);
    }

    orbitEnd(): void { 
        this.dragTimer = setTimeout(() => {
            this.isFreeView = false;
        }, this.dragTimeoutMs);
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (!player) return;

        // 1. 복귀 로직
        if (this.isResuming) {
            this.isResuming = false;
            let targetOffset = this.defaultOffset.clone();
            
            if (this.hasStableOffset) {
                const horizontalDist = Math.sqrt(this.stableOffset.x ** 2 + this.stableOffset.z ** 2);
                const verticalDist = this.stableOffset.y;
                
                const playerBackward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.Meshs.quaternion);
                targetOffset = playerBackward.multiplyScalar(horizontalDist);
                targetOffset.y = verticalDist;
            }

            this.dummyCamera.position.copy(player.CenterPos).add(targetOffset);
            this.controls.target.copy(player.CenterPos);

            // 🌟 핵심 픽스 1: 댐핑 관성 우회 🌟
            // 순간적으로 댐핑을 끄고 업데이트하여 OrbitControls가 어깨 쪽으로 튕겨 돌아가려는 현상 방지
            const wasDamping = this.controls.enableDamping;
            this.controls.enableDamping = false;
            this.controls.update();
            this.controls.enableDamping = wasDamping;

            this.prevPlayerPos.copy(player.CenterPos);
        }

        // 2. 줌 거리 유지
        if (this.prevPlayerPos.lengthSq() > 0) {
            const moveDeltaCam = new THREE.Vector3().subVectors(player.CenterPos, this.prevPlayerPos);
            this.dummyCamera.position.add(moveDeltaCam);
        }

        const moveDelta = new THREE.Vector3().subVectors(player.CenterPos, this.prevPlayerPos);
        const isMoving = moveDelta.lengthSq() > 0.0001;
        this.prevPlayerPos.copy(player.CenterPos);

        this.controls.target.copy(player.CenterPos);

        const offset = new THREE.Vector3().subVectors(this.dummyCamera.position, player.CenterPos);
        if (!this.hasStableOffset && offset.lengthSq() > 0.0001) {
            this.stableOffset.copy(offset);
            this.hasStableOffset = true;
        }

        // 3. 오토 팔로우 로직
        if (!this.isFreeView && isMoving) {
            const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.Meshs.quaternion);
            const moveDir = moveDelta.clone().normalize();
            const offsetDir = offset.clone().normalize();
            const moveForwardness = moveDir.dot(playerForward);
            const cameraApproachness = moveDir.dot(offsetDir);

            const shouldIgnoreAutoFollow = moveForwardness < this.backwardIgnoreThreshold || cameraApproachness > this.cameraApproachIgnoreThreshold;

            if (shouldIgnoreAutoFollow) {
                const isCameraInFrontHemisphere = playerForward.dot(offsetDir) > 0;
                const minSafeDistance = this.controls.minDistance + this.safeMinDistancePadding;
                const isTooClose = offset.length() < minSafeDistance;

                if (this.hasStableOffset && (isCameraInFrontHemisphere || isTooClose)) {
                    this.dummyCamera.position.copy(player.CenterPos).add(this.stableOffset);
                }
                this.controls.update();
            } else {
                const dot = playerForward.dot(offsetDir);
                if (dot < -0.1) {
                    const backDir = playerForward.clone().multiplyScalar(-1);
                    const targetTheta = Math.atan2(backDir.x, backDir.z);
                    const currentTheta = this.controls.getAzimuthalAngle();

                    let diff = targetTheta - currentTheta;
                    while (diff > Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;

                    const newTheta = currentTheta + diff * 0.04;
                    this.controls.minAzimuthAngle = newTheta;
                    this.controls.maxAzimuthAngle = newTheta;
                }
                this.controls.update();
                
                const updatedOffset = new THREE.Vector3().subVectors(this.dummyCamera.position, player.CenterPos);
                if (updatedOffset.lengthSq() > 0.0001) {
                    this.stableOffset.copy(updatedOffset);
                    this.hasStableOffset = true;
                }
            }
        } else {
            this.controls.update();
            const updatedOffset = new THREE.Vector3().subVectors(this.dummyCamera.position, player.CenterPos);
            if (updatedOffset.lengthSq() > 0.0001) {
                this.stableOffset.copy(updatedOffset);
                this.hasStableOffset = true;
            }
        }

        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;

        // 4. 충돌 및 보간 연출
        let finalIdealPos = this.dummyCamera.position.clone();
        const direction = new THREE.Vector3().subVectors(finalIdealPos, player.CenterPos);
        const distance = direction.length();
        direction.normalize();

        this.raycaster.set(player.CenterPos, direction);
        this.raycaster.far = distance;

        // 🌟 핵심 픽스 2: 레이캐스터가 '플레이어 자신'을 타격하여 강제 줌인되는 현상 방지 🌟
        const hits = this.raycaster.intersectObjects(this.obstacles, true).filter(hit => {
            let current: THREE.Object3D | null = hit.object;
            while (current) {
                if (current.uuid === player.Meshs.uuid) return false;
                current = current.parent;
            }
            return true;
        });

        if (hits.length > 0 && hits[0].distance > 0.5) {
            finalIdealPos = hits[0].point.clone().add(direction.multiplyScalar(-0.2));
        }

        // 실제 카메라 위치 보간 (부드러운 시점 복귀)
        camera.position.lerp(finalIdealPos, this.lerpFactor);
        
        this.lookTarget.lerp(player.CenterPos, this.lerpFactor);
        camera.lookAt(this.lookTarget);
    }
}