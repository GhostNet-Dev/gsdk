import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { ICameraStrategy } from "./cameratypes";
import { OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";

export default class FirstPersonCameraStrategy implements ICameraStrategy {
    offset = new THREE.Vector3(0, 1.6, 0);
    lerpFactor = 0.2;
    private handle: OrbitControlsHandle | null = null;

    init(_camera: THREE.PerspectiveCamera, broker: OrbitControlsBroker) {
        this.handle = broker.acquire("FirstPersonCameraStrategy");
        this.handle.controls.enabled = false;
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
