import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class AimThirdPersonCameraStrategy implements ICameraStrategy {
    private targetPosition = new THREE.Vector3();
    private lookTarget = new THREE.Vector3();

    private readonly shoulderOffset = new THREE.Vector3(0.9, 2.1, 0);
    private readonly backDistance = 5.2;
    private readonly lookAheadDistance = 25;
    private readonly lerpFactor = 0.18;

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
    ) {
        this.controls.autoRotate = false
        this.controls.enableRotate = true
        this.controls.enablePan = false
        this.controls.enableZoom = false
        this.controls.enableDamping = false
        this.controls.minPolarAngle = 0.25
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05
    }

    orbitStart(): void {
        this.controls.enabled = true
    }

    orbitEnd(): void {
        this.controls.enabled = true
    }

    update(camera: THREE.Camera, player?: IPhysicsObject): void {
        if (!player) return;

        const target = player.CenterPos.clone().add(new THREE.Vector3(0, this.shoulderOffset.y, 0))
        this.controls.target.copy(target)

        const camDir = new THREE.Vector3().subVectors(camera.position, target).setY(0)
        if (camDir.lengthSq() < 1e-4) camDir.set(0, 0, -1)
        camDir.normalize()
        const forward = camDir.clone().multiplyScalar(-1)
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

        const desired = target.clone()
            .add(right.multiplyScalar(this.shoulderOffset.x))
            .add(forward.clone().multiplyScalar(-this.backDistance));

        this.targetPosition.lerp(desired, this.lerpFactor);
        camera.position.copy(this.targetPosition);

        const aimTarget = target.clone().add(forward.multiplyScalar(this.lookAheadDistance));
        this.lookTarget.lerp(aimTarget, this.lerpFactor * 1.4);
        camera.lookAt(this.lookTarget);

        this.controls.update()
    }
}
