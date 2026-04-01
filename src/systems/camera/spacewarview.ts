import * as THREE from "three";
import { ICameraStrategy, ICameraTrackTarget } from "./cameratypes";
import { Camera } from "./camera";
import { OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";

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
    private handle: OrbitControlsHandle | null = null;

    constructor(private readonly owner: Camera) {}

    init(_camera: THREE.PerspectiveCamera, broker: OrbitControlsBroker) {
        this.handle = broker.acquire("SpaceWarCameraStrategy");
        const ctrl = this.handle.controls;
        ctrl.enabled = true;
        ctrl.enableZoom = true;
        ctrl.enableRotate = true;
        ctrl.enablePan = true;
        ctrl.enableDamping = true;
        ctrl.screenSpacePanning = false;
        ctrl.maxPolarAngle = Math.PI * 0.49;
        ctrl.minPolarAngle = Math.PI * 0.1;
    }

    uninit() {
        this.isOrbiting = false;
        this.cooldownRemaining = 0;
        if (this.handle?.isValid) this.handle.controls.update();
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
        if (!this.handle?.isValid) return;
        const ctrl = this.handle.controls;

        const trackTarget = this.owner.getTrackTarget();
        if (!trackTarget) {
            ctrl.update();
            return;
        }

        const deltaSec = this.owner.getLastDeltaSec();
        if (this.cooldownRemaining > 0) {
            this.cooldownRemaining = Math.max(0, this.cooldownRemaining - deltaSec);
        }

        if (this.isOrbiting) {
            ctrl.update();
            return;
        }

        const followRate = this.resolveFollowRate(trackTarget);
        const followScale = this.cooldownRemaining > 0 ? this.orbitRecoveryScale : 1;
        const smoothing = (1 - Math.exp(-Math.max(0, deltaSec) * followRate)) * followScale;
        if (smoothing <= 0.0001) {
            ctrl.update();
            return;
        }

        trackTarget.getTrackPosition(this.tmpTarget);
        const currentTarget = ctrl.target;
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

        ctrl.update();
    }

    private resolveFollowRate(trackTarget: ICameraTrackTarget) {
        return trackTarget.getTrackKind?.() === "ship"
            ? this.shipFollowRate
            : this.fleetFollowRate;
    }
}
