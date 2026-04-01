import * as THREE from "three";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";

export default class ThirdPersonCameraStrategy implements ICameraStrategy {
    private offset = new THREE.Vector3(10, 15, 10)
    private isFreeView = false;
    private targetPosition = new THREE.Vector3();
    private raycaster = new THREE.Raycaster();
    target = new THREE.Vector3()
    private followDistance = 6;
    lerpFactor = 0.5
    private handle: OrbitControlsHandle | null = null;

    constructor(
        private camera: THREE.Camera,
        private obstacles: THREE.Object3D[],
    ) {}

    init(_camera: THREE.PerspectiveCamera, broker: OrbitControlsBroker) {
        this.handle = broker.acquire("ThirdPersonCameraStrategy");
        const ctrl = this.handle.controls;
        ctrl.enableZoom = true;
        ctrl.enableRotate = true;
        ctrl.enablePan = false;
        ctrl.enableDamping = true;
        ctrl.minDistance = 2.0;
        ctrl.maxDistance = 20.0;
        ctrl.maxPolarAngle = Math.PI - 0.1;
    }

    uninit(_camera: THREE.PerspectiveCamera) {
        if (!this.handle?.isValid) return;
        const ctrl = this.handle.controls;
        ctrl.minDistance = 0;
        ctrl.maxDistance = Infinity;
        ctrl.maxPolarAngle = Math.PI;
    }

    orbitStart(): void {
        this.isFreeView = true;
    }

    orbitEnd(): void {
        if (!this.handle?.isValid) return;
        const ctrl = this.handle.controls;
        const camToTarget = new THREE.Vector3().subVectors(this.camera.position, ctrl.target);
        this.offset.copy(camToTarget);
        this.isFreeView = false;
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        if (!player || !this.handle?.isValid) return;
        const ctrl = this.handle.controls;

        ctrl.target.copy(player.CenterPos);
        ctrl.update();

        if (this.isFreeView) {
            this.offset.subVectors(this.camera.position, ctrl.target);
        }

        const intendedCameraPos = this.isFreeView
            ? this.camera.position.clone()
            : player.CenterPos.clone().add(this.offset);

        this.targetPosition.copy(intendedCameraPos);

        if (this.isFreeView) {
            camera.position.copy(this.targetPosition);
        } else {
            camera.position.lerp(this.targetPosition, this.lerpFactor);
        }

        this.target.lerp(player.CenterPos, this.lerpFactor);
        camera.lookAt(this.target);
    }
}
