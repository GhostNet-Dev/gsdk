import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy, ICameraTrackTarget } from "./cameratypes";
import { Camera } from "./camera";

export default class SpaceWarCameraStrategy implements ICameraStrategy {
    private isOrbiting = false;
    private cooldownRemaining = 0;
    private readonly shipFollowRate = 6.0;
    private readonly fleetFollowRate = 3.1;
    private readonly postOrbitCooldownSec = 1.1;
    private readonly orbitRecoveryScale = 0.24;
    private readonly tmpPosition = new THREE.Vector3();
    private readonly tmpTarget = new THREE.Vector3();
    private readonly tmpLookTarget = new THREE.Vector3();
    private readonly tmpDelta = new THREE.Vector3();

    constructor(
        private readonly controls: OrbitControls,
        private readonly owner: Camera,
    ) {}

    init() {
        this.controls.enabled = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        this.controls.enableDamping = true;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI * 0.49;
        this.controls.minPolarAngle = Math.PI * 0.1;
    }

    uninit() {
        this.isOrbiting = false;
        this.cooldownRemaining = 0;
        this.controls.update()
    }

    orbitStart(): void {
        this.isOrbiting = true;
        this.cooldownRemaining = this.postOrbitCooldownSec;
    }

    orbitEnd(): void {
        this.isOrbiting = false;
        this.cooldownRemaining = this.postOrbitCooldownSec;
    }

    update(camera: THREE.Camera): void {
        const trackTarget = this.owner.getTrackTarget();
        if (!trackTarget) {
            this.controls.update();
            return;
        }

        const deltaSec = this.owner.getLastDeltaSec();
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaSec);
        }

        if (this.isOrbiting) {
            this.controls.update();
            return;
        }

        const followRate = this.resolveFollowRate(trackTarget);
        const followScale = this.cooldownRemaining > 0 ? this.orbitRecoveryScale : 1;
        const smoothing = (1 - Math.exp(-Math.max(0, deltaSec) * followRate)) * followScale;
        if (smoothing <= 0.0001) {
            this.controls.update();
            return;
        }

        trackTarget.getTrackPosition(this.tmpTarget);
        const currentTarget = this.controls.target;
        this.tmpDelta.copy(this.tmpTarget).sub(currentTarget);

        if (this.tmpDelta.lengthSq() > 0.0001) {
            this.tmpPosition.copy(camera.position).addScaledVector(this.tmpDelta, smoothing);
            camera.position.copy(this.tmpPosition);
            currentTarget.addScaledVector(this.tmpDelta, smoothing);
        }

        if (trackTarget.getTrackLookTarget) {
            trackTarget.getTrackLookTarget(this.tmpLookTarget);
            currentTarget.lerp(this.tmpLookTarget, smoothing * 0.6);
        }

        this.controls.update();
    }

    private resolveFollowRate(trackTarget: ICameraTrackTarget) {
        return trackTarget.getTrackKind?.() === "ship"
            ? this.shipFollowRate
            : this.fleetFollowRate;
    }
}
