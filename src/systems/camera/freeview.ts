import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { ICameraStrategy } from "./cameratypes";

export default class FreeCameraStrategy implements ICameraStrategy {
    constructor(private controls: OrbitControls) { }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (this.controls.enabled) this.controls.update()
    }
}
