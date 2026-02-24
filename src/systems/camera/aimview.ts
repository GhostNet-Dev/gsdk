import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class AimThirdPersonCameraStrategy implements ICameraStrategy {
    private dummyCamera = new THREE.PerspectiveCamera();
    private currentLookAt = new THREE.Vector3();

    private readonly shoulderOffset = new THREE.Vector3(0.7, 1.6, 0);
    private readonly lookAheadDistance = 100;
    private readonly lerpFactor = 0.5;

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
    ) {
        // No init here, wait for setMode
    }

    init() {
        this.resetControls();
        
        // Sync dummy camera to real camera to avoid jumps
        this.dummyCamera.position.copy(this.camera.position);
        this.dummyCamera.quaternion.copy(this.camera.quaternion);

        // 🌟 Fix: Initialize currentLookAt to the camera's current forward point 
        // to avoid snapping from (0,0,0) to the target on first frame.
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        this.currentLookAt.copy(this.camera.position).add(forward.multiplyScalar(this.lookAheadDistance));
        
        // Hijack OrbitControls to control our dummy camera
        this.controls.object = this.dummyCamera;
    }

    uninit() {
        // Restore OrbitControls to control the real camera
        this.controls.object = this.camera;
        this.controls.enabled = true;
        
        // Better to just ensure standard settings:
        this.controls.minDistance = 0;
        this.controls.maxDistance = Infinity;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI;
        this.controls.enableDamping = true;
    }

    private resetControls() {
        this.controls.enabled = true;
        this.controls.enableZoom = true; 
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = false; // Crisp aiming
        
        this.controls.minDistance = 0.5;
        this.controls.maxDistance = 6.0; 
        
        this.controls.minPolarAngle = 0.1;
        this.controls.maxPolarAngle = Math.PI - 0.1;
    }

    orbitStart(): void { }
    orbitEnd(): void { }

    update(camera: THREE.Camera, player?: IPhysicsObject): void {
        if (!player) return;

        // 1. Target the player shoulder height
        const target = player.CenterPos.clone().add(new THREE.Vector3(0, this.shoulderOffset.y, 0));
        this.controls.target.copy(target);
        this.controls.update();

        // 2. Calculate rendering position from dummyCamera (which Controls is moving)
        const direction = new THREE.Vector3().subVectors(this.dummyCamera.position, target).normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction).normalize();
        
        // 3. Apply shoulder offset
        const desiredPos = this.dummyCamera.position.clone().add(right.multiplyScalar(this.shoulderOffset.x));

        // 4. Move real camera
        // Using a slightly lower lerp factor during the first frames could make it even smoother,
        // but 0.15~0.2 is usually a good balance for responsiveness and smoothness.
        camera.position.lerp(desiredPos, 0.15);

        // 5. Look ahead
        const lookTarget = target.clone().add(direction.multiplyScalar(-this.lookAheadDistance));
        this.currentLookAt.lerp(lookTarget, 0.15);
        camera.lookAt(this.currentLookAt);
    }
}
