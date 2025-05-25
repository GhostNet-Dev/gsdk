import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class ThirdPersonFollowCameraStrategy implements ICameraStrategy {
    private targetPosition = new THREE.Vector3();
    private lookTarget = new THREE.Vector3();

    private isFreeView = false;
    private lerpFactor = 0.07;
    private dragTimer: ReturnType<typeof setTimeout> | null = null;
    private dragTimeoutMs = 3000;

    private prevPlayerPos = new THREE.Vector3();
    private followDistance = 6;
    private followHeight = 3;

    private raycaster = new THREE.Raycaster();

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
        /** 충돌 감지할 장애물 설정 */
        private obstacles: THREE.Object3D[],
    ) {
    }
    orbitStart(): void {
        this.isFreeView = true;
        if (this.dragTimer) clearTimeout(this.dragTimer);

    }
    orbitEnd(): void {
        this.dragTimer = setTimeout(() => {
            this.isFreeView = false;

            // 🎯 사용자 시점에서 거리, 높이 계산
            const camToTarget = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
            this.followHeight = camToTarget.y;
            camToTarget.y = 0;
            this.followDistance = camToTarget.length();
        }, this.dragTimeoutMs);
    }

    /** 매 프레임 호출 */
    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (!player) return;

        // 🧠 이동 감지: 이동 시 TPS 모드 복귀
        const moved = this.prevPlayerPos.distanceToSquared(player.CenterPos) > 0.0001;
        this.prevPlayerPos.copy(player.CenterPos);

        if (this.isFreeView && moved) {
            this.isFreeView = false;

            const camToTarget = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
            this.followHeight = camToTarget.y;
            camToTarget.y = 0;
            this.followDistance = camToTarget.length();

            if (this.dragTimer) clearTimeout(this.dragTimer);
        }

        if (this.isFreeView) {
            this.controls.update();
            return;
        }

        // ✅ 캐릭터 회전 기준 뒤 방향 계산
        const backDir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.Meshs.quaternion);
        backDir.y = 0;
        backDir.normalize();

        // ✅ 카메라 목표 위치 = 뒤쪽 + 높이
        const desiredCameraPos = player.CenterPos.clone()
            .add(backDir.multiplyScalar(this.followDistance))
            .add(new THREE.Vector3(0, this.followHeight, 0));

        // ✅ Raycaster로 충돌 검사
        const direction = desiredCameraPos.clone().sub(player.CenterPos).normalize();
        this.raycaster.set(player.CenterPos, direction);
        this.raycaster.far = this.followDistance;

        const hits = this.raycaster.intersectObjects(this.obstacles, true);
        if (hits.length > 0) {
            this.targetPosition.copy(hits[0].point);
        } else {
            this.targetPosition.copy(desiredCameraPos);
        }

        // ✅ 카메라 위치/회전 부드럽게 보간
        camera.position.lerp(this.targetPosition, this.lerpFactor);
        this.lookTarget.lerp(player.CenterPos, this.lerpFactor);
        camera.lookAt(this.lookTarget);

        // ✅ OrbitControls target도 캐릭터로 유지
        this.controls.target.copy(player.CenterPos);
    }
}
