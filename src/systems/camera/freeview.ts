import { IPhysicsObject } from "@Glibs/interface/iobject";
import { ICameraStrategy } from "./cameratypes";
import { OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";
import * as THREE from "three";

export default class FreeCameraStrategy implements ICameraStrategy {
    private handle: OrbitControlsHandle | null = null;
    private lastEnabledState: boolean | null = null;

    init(_camera: THREE.PerspectiveCamera, broker: OrbitControlsBroker) {
        this.handle = broker.acquire("FreeCameraStrategy");
        const ctrl = this.handle.controls;
        ctrl.enabled = true;
        ctrl.enableZoom = true;
        ctrl.enableRotate = true;
        ctrl.enablePan = true;
        ctrl.enableDamping = true;
        ctrl.minDistance = 0;
        ctrl.maxDistance = Infinity;
        ctrl.minPolarAngle = 0;
        ctrl.maxPolarAngle = Math.PI;
    }

    update(_camera: THREE.Camera, _player?: IPhysicsObject) {
        if (!this.handle?.isValid) return;
        const ctrl = this.handle.controls;
        if (ctrl.enabled !== this.lastEnabledState) {
            console.debug(`[FreeCameraStrategy] controls.enabled 변경: ${this.lastEnabledState} → ${ctrl.enabled}`)
            this.lastEnabledState = ctrl.enabled;
        }
        if (ctrl.enabled) ctrl.update();
    }
}
