import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { ICameraStrategy } from "./cameratypes";

export default class ThirdPersonCameraStrategy implements ICameraStrategy {
    offset = new THREE.Vector3(0, 5, -10); // 캐릭터 뒤에서 위쪽
    lerpFactor = 0.1;
    target = new THREE.Vector3();

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (!player) return;

        const targetPos = player.CenterPos.clone().add(this.offset);
        camera.position.lerp(targetPos, this.lerpFactor);
        this.target.lerp(player.CenterPos, this.lerpFactor);
        (camera as THREE.PerspectiveCamera).lookAt(this.target);
    }
}

// export class ThirdPersonFollowCameraStrategy implements ICameraStrategy {
//     private defaultOffset = new THREE.Vector3(0, 3, -6);
//     private targetPosition = new THREE.Vector3();
//     private lookTarget = new THREE.Vector3();

//     private isFreeView = false;
//     private lerpFactor = 0.1;
//     private dragTimer: ReturnType<typeof setTimeout> | null = null;
//     private dragTimeoutMs = 3000;

//     private prevPlayerPos = new THREE.Vector3();
//     private followDistance = 6; // 사용자 줌 길이 반영

//     constructor(private controls: OrbitControls, private camera: THREE.Camera) {
//         controls.addEventListener("start", () => {
//             this.isFreeView = true;
//             if (this.dragTimer) clearTimeout(this.dragTimer);
//         });

//         controls.addEventListener("end", () => {
//             this.dragTimer = setTimeout(() => {
//                 this.isFreeView = false;

//                 // ✅ 드래그 종료 시, 카메라 거리 측정하여 저장
//                 this.followDistance = camera.position.distanceTo(controls.target);
//             }, this.dragTimeoutMs);
//         });
//     }

//     update(camera: THREE.Camera, player?: IPhysicsObject) {
//         if (!player) return;

//         const moved = this.prevPlayerPos.distanceToSquared(player.HeadPos) > 0.0001;
//         this.prevPlayerPos.copy(player.HeadPos);

//         if (this.isFreeView && moved) {
//             this.isFreeView = false;

//             // ✅ 드래그 도중 이동 → 즉시 TPS 복귀 + 현재 카메라 거리 유지
//             this.followDistance = camera.position.distanceTo(this.controls.target);
//             if (this.dragTimer) clearTimeout(this.dragTimer);
//         }

//         if (this.isFreeView) {
//             this.controls.update();
//             return;
//         }

//         // ✅ TPS 복귀: 사용자가 줌한 거리 유지하며 캐릭터 뒤에 배치
//         const rotatedOffset = this.defaultOffset.clone()
//             .normalize()
//             .applyQuaternion(player.Meshs.quaternion)
//             .multiplyScalar(this.followDistance);

//         this.targetPosition.copy(player.HeadPos).add(rotatedOffset);

//         camera.position.lerp(this.targetPosition, this.lerpFactor);
//         this.lookTarget.lerp(player.HeadPos, this.lerpFactor);
//         camera.lookAt(this.lookTarget);

//         this.controls.target.copy(player.HeadPos);
//     }
// }