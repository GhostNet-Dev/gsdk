import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class ThirdPersonCameraStrategy implements ICameraStrategy {
    private offset = new THREE.Vector3(10, 15, 10)
    private isFreeView = false;
    private targetPosition = new THREE.Vector3();
    private raycaster = new THREE.Raycaster();
    target = new THREE.Vector3()
    private followDistance = 6;
    lerpFactor = 0.5

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
        /** 충돌 감지할 장애물 설정 */
        private obstacles: THREE.Object3D[],
    ) {
    }
    orbitStart(): void {
        this.isFreeView = true
    }
    orbitEnd(): void {
        // 🎯 사용자 시점에서 거리, 높이 계산
        const camToTarget = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        this.offset.copy(camToTarget);
        this.isFreeView = false
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
    if (!player) return;

    this.controls.target.copy(player.CenterPos);
    this.controls.update();

    // OrbitControls 또는 자동 위치 계산
    const intendedCameraPos = this.isFreeView
        ? this.camera.position.clone()
        : player.CenterPos.clone().add(this.offset);

    // ✅ Raycaster로 충돌 감지
    const direction = intendedCameraPos.clone().sub(player.CenterPos).normalize();
    this.raycaster.set(player.CenterPos, direction);
    this.raycaster.far = player.CenterPos.distanceTo(intendedCameraPos);

    const hits = this.raycaster.intersectObjects(this.obstacles, true);
    if (hits.length > 0) {
        this.targetPosition.copy(hits[0].point);
    } else {
        this.targetPosition.copy(intendedCameraPos);
    }

    // ✅ 카메라 위치 적용 (보간 or 직접)
    if (this.isFreeView) {
        // 유저가 직접 조작하는 중에는 충돌 보정만 적용 (즉시 위치)
        camera.position.copy(this.targetPosition);
    } else {
        // TPS 모드에서는 부드럽게 따라가도록
        camera.position.lerp(this.targetPosition, this.lerpFactor);
    }

    // ✅ 바라보는 타겟은 항상 플레이어 기준
    this.target.lerp(player.CenterPos, this.lerpFactor);
    camera.lookAt(this.target);
}

}
