import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class AimThirdPersonCameraStrategy implements ICameraStrategy {
    private currentPosition = new THREE.Vector3();
    private currentLookAt = new THREE.Vector3();
    private spherical = new THREE.Spherical();

    private readonly shoulderOffset = new THREE.Vector3(0.9, 2.1, 0);
    private readonly backDistance = 5.2;
    private readonly lookAheadDistance = 30;
    private readonly lerpFactor = 0.25;

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
    ) {
        this.resetControls();
        this.spherical.setFromVector3(new THREE.Vector3(0, 0, this.backDistance));
    }

    private resetControls() {
        this.controls.enabled = true;
        this.controls.autoRotate = false;
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableZoom = true;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.minPolarAngle = 0.1;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.2;
    }

    orbitStart(): void {
        this.controls.enabled = true;
    }

    orbitEnd(): void {
        this.controls.enabled = true;
    }

    update(camera: THREE.Camera, player?: IPhysicsObject): void {
        if (!player) return;

        // 1. Target the player shoulder height
        const target = player.CenterPos.clone().add(new THREE.Vector3(0, this.shoulderOffset.y, 0));
        
        // 2. Update OrbitControls to get current user rotation
        this.controls.target.copy(target);
        this.controls.update();

        // 3. Get the "pure" camera direction (without shoulder offset)
        // We use the rotation from camera state that OrbitControls just set
        const pureOffset = new THREE.Vector3().subVectors(camera.position, target);
        const direction = pureOffset.clone().normalize();

        // 4. Calculate 'right' vector for shoulder offset
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
        
        // 5. Place camera at: target + (direction * backDistance) + (right * shoulderOffset.x)
        const desiredPos = target.clone()
            .add(direction.multiplyScalar(this.backDistance))
            .add(right.multiplyScalar(this.shoulderOffset.x));

        // 6. Set camera position immediately or lerp
        // Note: Using camera.position.copy directly prevents the "lag" that feeds back into OrbitControls
        camera.position.copy(desiredPos);

        // 7. Look ahead from the pure target
        const lookDir = direction.clone().multiplyScalar(-1);
        const lookTarget = target.clone().add(lookDir.multiplyScalar(this.lookAheadDistance));
        camera.lookAt(lookTarget);
    }
}
