import * as THREE from "three";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";

export default class AimThirdPersonCameraStrategy implements ICameraStrategy {
    private dummyCamera = new THREE.PerspectiveCamera();
    private currentLookAt = new THREE.Vector3();

    private readonly shoulderOffset = new THREE.Vector3(0.85, 1.7, 0);
    private readonly lookAheadDistance = 100;
    private readonly lerpFactor = 0.5;
    private handle: OrbitControlsHandle | null = null;

    constructor(private camera: THREE.Camera) {}

    init(_camera: THREE.PerspectiveCamera, broker: OrbitControlsBroker) {
        this.handle = broker.acquire("AimThirdPersonCameraStrategy");
        const ctrl = this.handle.controls;

        ctrl.enabled = true;
        ctrl.enableZoom = true;
        ctrl.enableRotate = true;
        ctrl.enablePan = false;
        ctrl.enableDamping = false;
        ctrl.minDistance = 1.0;
        ctrl.maxDistance = 5.0;
        ctrl.minPolarAngle = 0.1;
        ctrl.maxPolarAngle = Math.PI - 0.1;

        // Sync dummy camera to real camera to avoid jumps
        this.dummyCamera.position.copy(this.camera.position);
        this.dummyCamera.quaternion.copy(this.camera.quaternion);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.currentLookAt.copy(this.camera.position).add(forward.multiplyScalar(this.lookAheadDistance));

        ctrl.object = this.dummyCamera;
    }

    uninit(camera: THREE.PerspectiveCamera) {
        if (!this.handle?.isValid) return;
        const ctrl = this.handle.controls;
        ctrl.object = camera;
        ctrl.enabled = true;
        ctrl.minDistance = 0;
        ctrl.maxDistance = Infinity;
        ctrl.minPolarAngle = 0;
        ctrl.maxPolarAngle = Math.PI;
        ctrl.enableDamping = true;
    }

    orbitStart(): void {}
    orbitEnd(): void {}

    update(camera: THREE.Camera, player?: IPhysicsObject): void {
        if (!player || !this.handle?.isValid) return;
        const ctrl = this.handle.controls;

        const target = player.CenterPos.clone().add(new THREE.Vector3(0, this.shoulderOffset.y, 0));
        ctrl.target.copy(target);
        ctrl.update();

        const direction = new THREE.Vector3().subVectors(this.dummyCamera.position, target).normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();

        const desiredPos = this.dummyCamera.position.clone().add(right.clone().multiplyScalar(this.shoulderOffset.x));
        camera.position.lerp(desiredPos, 0.15);

        const lookTarget = target.clone()
            .add(direction.multiplyScalar(-this.lookAheadDistance))
            .add(right.clone().multiplyScalar(-0.35));

        this.currentLookAt.lerp(lookTarget, 0.15);
        camera.lookAt(this.currentLookAt);
    }
}
