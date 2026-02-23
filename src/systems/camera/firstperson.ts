import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";

export default class FirstPersonCameraStrategy implements ICameraStrategy {
    offset = new THREE.Vector3(0, 1.6, 0); // 눈높이
    lerpFactor = 0.2;

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

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(player.Meshs.quaternion);
        const lookAtPos = targetPos.clone().add(forward);
        (camera as THREE.PerspectiveCamera).lookAt(lookAtPos);
    }
}
