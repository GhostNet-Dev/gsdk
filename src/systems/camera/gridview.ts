import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { ICameraStrategy } from "./cameratypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

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

    constructor(private controls: OrbitControls) {}

    init(camera: THREE.PerspectiveCamera) {
        if (!this.controls || !camera) return;

        // 현재 설정 저장
        this.savedSettings = {
            enableRotate: this.controls.enableRotate,
            minPolarAngle: this.controls.minPolarAngle,
            maxPolarAngle: this.controls.maxPolarAngle,
            minAzimuthAngle: this.controls.minAzimuthAngle,
            maxAzimuthAngle: this.controls.maxAzimuthAngle,
            fov: camera.fov,
            screenSpacePanning: this.controls.screenSpacePanning
        };

        // Grid 모드 설정: 원근감을 줄이기 위해 낮은 FOV 사용
        camera.fov = 30;
        camera.updateProjectionMatrix();

        // [쿼터뷰 설정] 
        const fixedPolarAngle = Math.PI / 8;    // 상하 45도 (더 위에서 내려다보는 각도)
        const fixedAzimuthAngle = Math.PI / 4;  // 좌우 45도 (대각선 뷰)
        const distance = 200; // 각도가 세워지면 화면이 좁아보일 수 있으므로 거리를 약간 더 늘림

        // [평면 이동 설정] 지면(XZ)을 따라 동서남북으로만 이동하게 함
        this.controls.screenSpacePanning = false;
        this.controls.enableRotate = false;
        
        // 상하/좌우 각도 고정
        this.controls.minPolarAngle = fixedPolarAngle;
        this.controls.maxPolarAngle = fixedPolarAngle;
        this.controls.minAzimuthAngle = fixedAzimuthAngle;
        this.controls.maxAzimuthAngle = fixedAzimuthAngle;

        // [핵심] 타겟 기준 45도 대각선 위치 계산 및 카메라 강제 이동
        const target = this.controls.target;
        
        // 구면 좌표계를 직교 좌표계로 변환 (r, phi, theta)
        // x = r * sin(phi) * sin(theta)
        // y = r * cos(phi)
        // z = r * sin(phi) * cos(theta)
        const x = distance * Math.sin(fixedPolarAngle) * Math.sin(fixedAzimuthAngle);
        const y = distance * Math.cos(fixedPolarAngle);
        const z = distance * Math.sin(fixedPolarAngle) * Math.cos(fixedAzimuthAngle);

        camera.position.set(target.x + x, target.y + y, target.z + z);

        // 변경된 카메라 위치를 컨트롤에 반영
        this.controls.update();
    }

    uninit(camera: THREE.PerspectiveCamera) {
        if (!this.controls || !this.savedSettings || !camera) return;

        // FOV 복구
        camera.fov = this.savedSettings.fov;
        camera.updateProjectionMatrix();

        // 이전 설정 복구
        this.controls.screenSpacePanning = this.savedSettings.screenSpacePanning;
        this.controls.enableRotate = this.savedSettings.enableRotate;
        this.controls.minPolarAngle = this.savedSettings.minPolarAngle;
        this.controls.maxPolarAngle = this.savedSettings.maxPolarAngle;
        this.controls.minAzimuthAngle = this.savedSettings.minAzimuthAngle;
        this.controls.maxAzimuthAngle = this.savedSettings.maxAzimuthAngle;
        
        this.controls.update();
        this.savedSettings = null;
    }

    update(camera: THREE.Camera, player?: IPhysicsObject) {
        // 플레이어가 있다면 플레이어를 따라가거나, 
        // 혹은 자유롭게 이동하며 건설할 수 있도록 OrbitControls의 기본 기능에 맡깁니다.
        if (player && this.controls) {
            // 필요 시 플레이어 위치로 부드럽게 타겟 이동
            // this.controls.target.lerp(player.Pos, 0.1);
        }
    }
}
