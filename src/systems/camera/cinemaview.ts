import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";

export default class CinematicCameraStrategy implements ICameraStrategy {
    private path: THREE.Vector3[] = [];
    private target: THREE.Vector3 = new THREE.Vector3();
    private index = 0;
    private lerpFactor = 0.02;

    constructor(path: THREE.Vector3[], private controls?: OrbitControls) {
        this.path = path;
        this.init();
    }

    init() {
        if (this.controls) {
            this.controls.enabled = false;
        }
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (this.path.length === 0) return;

        const targetPos = this.path[this.index];
        camera.position.lerp(targetPos, this.lerpFactor);
        this.target.lerp(player?.Pos ?? new THREE.Vector3(), this.lerpFactor);
        (camera as THREE.PerspectiveCamera).lookAt(this.target);

        // 다음 지점으로 이동
        if (camera.position.distanceTo(targetPos) < 0.1 && this.index < this.path.length - 1) {
            this.index++;
        }
    }
}
