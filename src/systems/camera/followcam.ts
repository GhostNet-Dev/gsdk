import * as THREE from "three";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";

export default class ThirdPersonFollowCameraStrategy implements ICameraStrategy {
    private dummyCamera = new THREE.PerspectiveCamera();

    private isResuming = false;
    private defaultOffset = new THREE.Vector3(0, 2.5, -20);
    private lookTarget = new THREE.Vector3();
    private lerpFactor = 0.15;
    private readonly verticalLookOffset = 2.0;
    private lookAnchor = new THREE.Vector3();

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

    private handle: OrbitControlsHandle | null = null;

    constructor(
        private camera: THREE.Camera,
        private obstacles: THREE.Object3D[],
    ) {}

    init(_camera: THREE.PerspectiveCamera, broker: OrbitControlsBroker) {
        this.handle = broker.acquire("ThirdPersonFollowCameraStrategy");
        const ctrl = this.handle.controls;
        ctrl.enabled = true;
        ctrl.enableZoom = true;
        ctrl.enableRotate = true;
        ctrl.enablePan = false;
        ctrl.enableDamping = true;
        ctrl.maxPolarAngle = Math.PI * 0.85;
        ctrl.minDistance = 2.0;
        ctrl.maxDistance = 20.0;
        ctrl.minAzimuthAngle = -Infinity;
        ctrl.maxAzimuthAngle = Infinity;

        ctrl.object = this.dummyCamera;
        this.isResuming = true;
    }

    /**
     * 외부에서 카메라 모드 전환 시 호출됨.
     * 현재 카메라의 실제 위치와 회전 상태를 dummyCamera와 lookTarget에 동기화.
     */
    syncFromCameraPose() {
        this.dummyCamera.position.copy(this.camera.position);
        this.dummyCamera.quaternion.copy(this.camera.quaternion);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.lookTarget.copy(this.camera.position).add(forward.multiplyScalar(10));

        if (this.handle?.isValid) this.handle.controls.update();

        this.isResuming = true;
    }

    uninit(camera: THREE.PerspectiveCamera) {
        if (!this.handle?.isValid) return;
        const ctrl = this.handle.controls;
        ctrl.object = camera;
        ctrl.minDistance = 0;
        ctrl.maxDistance = Infinity;
        ctrl.minAzimuthAngle = -Infinity;
        ctrl.maxAzimuthAngle = Infinity;
        ctrl.maxPolarAngle = Math.PI;
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
        if (!player || !this.handle?.isValid) return;
        const ctrl = this.handle.controls;

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
            ctrl.target.copy(player.CenterPos);

            const wasDamping = ctrl.enableDamping;
            ctrl.enableDamping = false;
            ctrl.update();
            ctrl.enableDamping = wasDamping;

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

        ctrl.target.copy(player.CenterPos);

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
                const minSafeDistance = ctrl.minDistance + this.safeMinDistancePadding;
                const isTooClose = offset.length() < minSafeDistance;

                if (this.hasStableOffset && (isCameraInFrontHemisphere || isTooClose)) {
                    this.dummyCamera.position.copy(player.CenterPos).add(this.stableOffset);
                }
                ctrl.update();
            } else {
                const dot = playerForward.dot(offsetDir);
                if (dot < -0.1) {
                    const backDir = playerForward.clone().multiplyScalar(-1);
                    const targetTheta = Math.atan2(backDir.x, backDir.z);
                    const currentTheta = ctrl.getAzimuthalAngle();

                    let diff = targetTheta - currentTheta;
                    while (diff > Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;

                    const newTheta = currentTheta + diff * 0.04;
                    ctrl.minAzimuthAngle = newTheta;
                    ctrl.maxAzimuthAngle = newTheta;
                }
                ctrl.update();

                const updatedOffset = new THREE.Vector3().subVectors(this.dummyCamera.position, player.CenterPos);
                if (updatedOffset.lengthSq() > 0.0001) {
                    this.stableOffset.copy(updatedOffset);
                    this.hasStableOffset = true;
                }
            }
        } else {
            ctrl.update();
            const updatedOffset = new THREE.Vector3().subVectors(this.dummyCamera.position, player.CenterPos);
            if (updatedOffset.lengthSq() > 0.0001) {
                this.stableOffset.copy(updatedOffset);
                this.hasStableOffset = true;
            }
        }

        ctrl.minAzimuthAngle = -Infinity;
        ctrl.maxAzimuthAngle = Infinity;

        // 4. 충돌 및 보간 연출
        let finalIdealPos = this.dummyCamera.position.clone();
        const direction = new THREE.Vector3().subVectors(finalIdealPos, player.CenterPos);
        const distance = direction.length();
        direction.normalize();

        if (this.obstacles.length > 0 && finalIdealPos.y >= player.CenterPos.y) {
            this.raycaster.set(player.CenterPos, direction);
            this.raycaster.far = distance;

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
        }

        if (finalIdealPos.y < 0) finalIdealPos.y = 0;

        camera.position.lerp(finalIdealPos, this.lerpFactor);

        this.lookAnchor.copy(player.CenterPos);
        this.lookAnchor.y += this.verticalLookOffset;
        this.lookTarget.lerp(this.lookAnchor, this.lerpFactor);
        camera.lookAt(this.lookTarget);
    }
}
