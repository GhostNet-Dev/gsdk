import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class AimThirdPersonCameraStrategy implements ICameraStrategy {
    private purePosition = new THREE.Vector3();
    private pureQuaternion = new THREE.Quaternion();
    private isOrbiting = false;

    private readonly shoulderOffset = new THREE.Vector3(0.45, 1.6, 0);
    private readonly backDistance = 1.2;
    private readonly lookAheadDistance = 100;

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
    ) {
        this.init();
    }

    init() {
        this.resetControls();
        this.purePosition.set(0, 0, 0); // Reset pure state
        // Initial placement if needed can go here
    }

    private resetControls() {
        this.controls.enabled = true;
        this.controls.autoRotate = false;
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.enableDamping = false;
        
        this.controls.minDistance = 0.8;
        this.controls.maxDistance = 8;
        
        this.controls.minPolarAngle = 0.1;
        this.controls.maxPolarAngle = Math.PI - 0.1;
    }

    orbitStart(): void {
        this.controls.enabled = true;
        this.isOrbiting = true;
    }

    orbitEnd(): void {
        this.controls.enabled = true;
        this.isOrbiting = false;
    }

    update(camera: THREE.Camera, player?: IPhysicsObject): void {
        if (!player) return;

        const target = player.CenterPos.clone().add(new THREE.Vector3(0, this.shoulderOffset.y, 0));
        
        // 1. Restore pure state before OrbitControls update
        if (this.purePosition.lengthSq() > 0) {
            camera.position.copy(this.purePosition);
            camera.quaternion.copy(this.pureQuaternion);
        } else {
            // Initial placement if no pure state yet
            const back = new THREE.Vector3(0, 0, this.backDistance);
            camera.position.copy(target).add(back);
            camera.lookAt(target);
        }

        // 2. Update OrbitControls using the pure camera
        if (!this.isOrbiting) {
            this.controls.target.copy(target);
        }
        this.controls.update();

        // 3. Save new pure state
        this.purePosition.copy(camera.position);
        this.pureQuaternion.copy(camera.quaternion);

        // 4. Calculate rendering offset (Shoulder Offset)
        const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
        
        // Apply offset to real camera for this frame's render
        camera.position.add(right.multiplyScalar(this.shoulderOffset.x));
        
        // 5. Look ahead from pivot
        const lookTarget = target.clone().add(direction.multiplyScalar(-this.lookAheadDistance));
        camera.lookAt(lookTarget);
    }
}
