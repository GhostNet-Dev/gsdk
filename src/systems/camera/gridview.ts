import * as THREE from "three";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";

export default class GridViewCameraStrategy implements ICameraStrategy {
    private savedSettings: {
        enableRotate: boolean;
        minPolarAngle: number;
        maxPolarAngle: number;
        minAzimuthAngle: number;
        maxAzimuthAngle: number;
        fov: number;
        screenSpacePanning: boolean;
    } | null = null;
    private handle: OrbitControlsHandle | null = null;

    init(camera: THREE.PerspectiveCamera, broker: OrbitControlsBroker) {
        this.handle = broker.acquire("GridViewCameraStrategy");
        const ctrl = this.handle.controls;

        this.savedSettings = {
            enableRotate: ctrl.enableRotate,
            minPolarAngle: ctrl.minPolarAngle,
            maxPolarAngle: ctrl.maxPolarAngle,
            minAzimuthAngle: ctrl.minAzimuthAngle,
            maxAzimuthAngle: ctrl.maxAzimuthAngle,
            fov: camera.fov,
            screenSpacePanning: ctrl.screenSpacePanning
        };

        camera.fov = 30;
        camera.updateProjectionMatrix();

        const fixedPolarAngle = Math.PI / 8;
        const fixedAzimuthAngle = Math.PI / 4;
        const distance = 200;

        ctrl.screenSpacePanning = false;
        ctrl.enableRotate = false;
        ctrl.minPolarAngle = fixedPolarAngle;
        ctrl.maxPolarAngle = fixedPolarAngle;
        ctrl.minAzimuthAngle = fixedAzimuthAngle;
        ctrl.maxAzimuthAngle = fixedAzimuthAngle;

        const target = ctrl.target;
        const x = distance * Math.sin(fixedPolarAngle) * Math.sin(fixedAzimuthAngle);
        const y = distance * Math.cos(fixedPolarAngle);
        const z = distance * Math.sin(fixedPolarAngle) * Math.cos(fixedAzimuthAngle);

        camera.position.set(target.x + x, target.y + y, target.z + z);
        ctrl.update();
    }

    uninit(camera: THREE.PerspectiveCamera) {
        if (!this.handle?.isValid || !this.savedSettings) return;
        const ctrl = this.handle.controls;

        camera.fov = this.savedSettings.fov;
        camera.updateProjectionMatrix();

        ctrl.screenSpacePanning = this.savedSettings.screenSpacePanning;
        ctrl.enableRotate = this.savedSettings.enableRotate;
        ctrl.minPolarAngle = this.savedSettings.minPolarAngle;
        ctrl.maxPolarAngle = this.savedSettings.maxPolarAngle;
        ctrl.minAzimuthAngle = this.savedSettings.minAzimuthAngle;
        ctrl.maxAzimuthAngle = this.savedSettings.maxAzimuthAngle;

        ctrl.update();
        this.savedSettings = null;
    }

    update(_camera: THREE.Camera, _player?: IPhysicsObject) {
        // OrbitControls의 pan 기능에 위임
    }
}
