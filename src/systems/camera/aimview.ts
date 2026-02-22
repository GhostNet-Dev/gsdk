import * as THREE from "three";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class AimThirdPersonCameraStrategy implements ICameraStrategy {
    private targetPosition = new THREE.Vector3();
    private lookTarget = new THREE.Vector3();

    private readonly shoulderOffset = new THREE.Vector3(0.9, 2.1, 0);
    private readonly backDistance = 5.2;
    private readonly lookAheadDistance = 25;
    private readonly lerpFactor = 0.18;

    update(camera: THREE.Camera, player?: IPhysicsObject): void {
        if (!player) return;

        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.Meshs.quaternion).setY(0).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const desired = player.CenterPos.clone()
            .add(right.multiplyScalar(this.shoulderOffset.x))
            .add(new THREE.Vector3(0, this.shoulderOffset.y, 0))
            .add(forward.clone().multiplyScalar(-this.backDistance));

        this.targetPosition.lerp(desired, this.lerpFactor);
        camera.position.copy(this.targetPosition);

        const aimTarget = player.CenterPos.clone().add(new THREE.Vector3(0, this.shoulderOffset.y, 0)).add(forward.multiplyScalar(this.lookAheadDistance));
        this.lookTarget.lerp(aimTarget, this.lerpFactor * 1.4);
        camera.lookAt(this.lookTarget);
    }
}
