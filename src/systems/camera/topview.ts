import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";

export default class TopViewCameraStrategy implements ICameraStrategy {
    offset = new THREE.Vector3(10, 15, 10)
    lerpFactor = 0.1
    target = new THREE.Vector3()

    constructor(private controls?: OrbitControls) {
        this.init();
    }

    init() {
        if (this.controls) {
            this.controls.enabled = false;
        }
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (!player) return;

        const targetPos = player.Pos.clone().add(this.offset);
        camera.position.lerp(targetPos, this.lerpFactor);
        this.target.lerp(player.Pos, this.lerpFactor);
        (camera as THREE.PerspectiveCamera).lookAt(this.target);
    }
}
