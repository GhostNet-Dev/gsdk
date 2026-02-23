import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { ICameraStrategy } from "./cameratypes";

export default class FreeCameraStrategy implements ICameraStrategy {
    constructor(private controls: OrbitControls) {
        this.init();
    }

    init() {
        this.controls.enabled = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;
        this.controls.enablePan = true;
        this.controls.enableDamping = true;
        this.controls.minDistance = 0;
        this.controls.maxDistance = Infinity;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI;
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (this.controls.enabled) this.controls.update()
    }
}
