import * as THREE from "three";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { CameraInputPreset, OrbitControlsBroker, OrbitControlsHandle } from "./orbitbroker";

export default class GridViewCameraStrategy implements ICameraStrategy {
    private savedSettings: {
        enabled: boolean;
        enablePan: boolean;
        enableZoom: boolean;
        enableRotate: boolean;
        enableDamping: boolean;
        panSpeed: number;
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
            enabled: ctrl.enabled,
            enablePan: ctrl.enablePan,
            enableZoom: ctrl.enableZoom,
            enableRotate: ctrl.enableRotate,
            enableDamping: ctrl.enableDamping,
            panSpeed: ctrl.panSpeed,
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

        ctrl.enabled = true;
        ctrl.enablePan = true;
        ctrl.enableZoom = true;
        ctrl.enableDamping = false;
        ctrl.panSpeed = 1;
        ctrl.screenSpacePanning = false;
        ctrl.enableRotate = false;
        ctrl.minPolarAngle = fixedPolarAngle;
        ctrl.maxPolarAngle = fixedPolarAngle;
        ctrl.minAzimuthAngle = fixedAzimuthAngle;
        ctrl.maxAzimuthAngle = fixedAzimuthAngle;
        broker.setInputPreset(CameraInputPreset.RtsPan);

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

        ctrl.enabled = this.savedSettings.enabled;
        ctrl.enablePan = this.savedSettings.enablePan;
        ctrl.enableZoom = this.savedSettings.enableZoom;
        ctrl.enableDamping = this.savedSettings.enableDamping;
        ctrl.panSpeed = this.savedSettings.panSpeed;
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
