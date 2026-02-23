import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

export default class ThirdPersonFollowCameraStrategy implements ICameraStrategy {
    private isFreeView = false;
    private dragTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly dragTimeoutMs = 2000;
    private readonly backwardIgnoreThreshold = -0.15;
    private readonly cameraApproachIgnoreThreshold = 0.35;
    
    private prevPlayerPos = new THREE.Vector3();
    private raycaster = new THREE.Raycaster();

    constructor(
        private controls: OrbitControls,
        private camera: THREE.Camera,
        private obstacles: THREE.Object3D[],
    ) {
        // No init here
    }

    init() {
        this.controls.enabled = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; 
        this.controls.minDistance = 2.0;
        this.controls.maxDistance = 20.0;
        
        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;
    }

    uninit() {
        this.controls.minDistance = 0;
        this.controls.maxDistance = Infinity;
        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;
        this.controls.maxPolarAngle = Math.PI;
        // Keep enabled=true for next strategy
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
        if (!player) return;

        const moveDelta = new THREE.Vector3().subVectors(player.CenterPos, this.prevPlayerPos);
        const isMoving = moveDelta.lengthSq() > 0.0001;
        this.prevPlayerPos.copy(player.CenterPos);

        // Sync Controls Target
        this.controls.target.copy(player.CenterPos);

        // Auto-Follow Logic: Manipulate OrbitControls Limits to force rotation
        if (!this.isFreeView && isMoving) {
            const offset = new THREE.Vector3().subVectors(camera.position, player.CenterPos);
            const playerForward = new THREE.Vector3(0, 0, 1).applyQuaternion(player.Meshs.quaternion);
            const moveDir = moveDelta.normalize();
            const moveForwardness = moveDir.dot(playerForward);
            const cameraApproachness = moveDir.dot(offset.clone().normalize());

            // When moving backwards or directly toward the camera, keep heading stable
            // to prevent unwanted yaw corrections.
            const shouldIgnoreAutoFollow =
                moveForwardness < this.backwardIgnoreThreshold ||
                cameraApproachness > this.cameraApproachIgnoreThreshold;

            if (shouldIgnoreAutoFollow) {
                this.controls.update();
                this.controls.minAzimuthAngle = -Infinity;
                this.controls.maxAzimuthAngle = Infinity;
            } else {
                const offsetDir = offset.clone().normalize();
                
                const dot = playerForward.dot(offsetDir);
            
            // Only rotate if player is facing away (Zelda style)
                if (dot < -0.1) {
                    const backDir = playerForward.clone().multiplyScalar(-1);
                    const targetTheta = Math.atan2(backDir.x, backDir.z);
                    const currentTheta = this.controls.getAzimuthalAngle();
                    
                    let diff = targetTheta - currentTheta;
                    while (diff > Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;
                    
                    const newTheta = currentTheta + diff * 0.04; // Smooth turn speed
                    
                    this.controls.minAzimuthAngle = newTheta;
                    this.controls.maxAzimuthAngle = newTheta;
                }

                this.controls.update();
            }
        } else {
            this.controls.update();
        }

        // Release Azimuth Lock immediately so user can rotate next frame if they want
        this.controls.minAzimuthAngle = -Infinity;
        this.controls.maxAzimuthAngle = Infinity;

        // Collision Check (Visual Clamping)
        const idealPos = camera.position.clone();
        const direction = new THREE.Vector3().subVectors(idealPos, player.CenterPos);
        const distance = direction.length();
        direction.normalize();

        this.raycaster.set(player.CenterPos, direction);
        this.raycaster.far = distance;

        const hits = this.raycaster.intersectObjects(this.obstacles, true);
        
        if (hits.length > 0) {
            const hitDist = hits[0].distance;
            // Prevent getting too close
            if (hitDist > 0.5) {
                const hitPos = hits[0].point;
                // Move camera slightly in front of wall
                camera.position.copy(hitPos.add(direction.multiplyScalar(-0.2)));
            }
        }
    }
}
