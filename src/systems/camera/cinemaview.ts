import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { ICameraStrategy } from "./cameratypes";
import { OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";

export default class CinematicCameraStrategy implements ICameraStrategy {
    private path: THREE.Vector3[] = [];
    private target: THREE.Vector3 = new THREE.Vector3();
    private index = 0;
    private lerpFactor = 0.02;
    private handle: OrbitControlsHandle | null = null;

    constructor(path: THREE.Vector3[]) {
        this.path = path;
    }

    init(_camera: THREE.PerspectiveCamera, broker: OrbitControlsBroker) {
        this.handle = broker.acquire("CinematicCameraStrategy");
        this.handle.controls.enabled = false;
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (this.path.length === 0) return;

        const targetPos = this.path[this.index];
        camera.position.lerp(targetPos, this.lerpFactor);
        this.target.lerp(player?.Pos ?? new THREE.Vector3(), this.lerpFactor);
        (camera as THREE.PerspectiveCamera).lookAt(this.target);

        if (camera.position.distanceTo(targetPos) < 0.1 && this.index < this.path.length - 1) {
            this.index++;
        }
    }
}
