import * as THREE from "three";
import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";


export class BulletCasingAct implements IActionComponent, ILoop {
    LoopId = 0
    triggerType: TriggerType = "onFire"

    // === 탄피 관리를 위한 배열 ===
    shellCasings: THREE.Mesh[] = [];
    gravity = new THREE.Vector3(0, -9.8 * 0.1, 0); // 중력 (조정 가능)
    deltaTime = 8 / 60; // 초당 60프레임을 가정 (업데이트 주기)

    constructor(
        private eventCtrl: IEventController,
        private scene: THREE.Scene,
        private socket: string = "casingEjectionPoint", // 기본값
    ) {
    }
    activate(target: IActionUser, context?: ActionContext | undefined): void {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }
    trigger(user: IActionUser, triggerType: TriggerType, ctx?: ActionContext) {
        const obj = user.objs
        if (!obj || this.triggerType !== triggerType) return

        const position = obj.getObjectByName(this.socket)!.getWorldPosition(new THREE.Vector3())
        const direction = obj.getObjectByName(this.socket)!.getWorldDirection(new THREE.Vector3())
        const forwardDirection = ctx?.direction?.clone() ?? obj.getWorldDirection(new THREE.Vector3())
        this.spawnShellCasing(position, direction, forwardDirection)
    }

    // --- 탄피 생성 및 애니메이션 함수 ---
    spawnShellCasing(
        ejectorWorldPos: THREE.Vector3,
        ejectorWorldDir: THREE.Vector3,
        gunRight: THREE.Vector3
    ) {
        const casingGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8); // 탄피 크기 (조정 가능)
        const casingMaterial = new THREE.MeshStandardMaterial({ color: 0xF0E68C }); // 탄피 색상

        const casing = new THREE.Mesh(casingGeometry, casingMaterial);

        // 탄피 배출구의 월드 위치와 방향을 가져옵니다.
        // const ejectorWorldPos = this.shellEjector.getWorldPosition(new THREE.Vector3());
        // const ejectorWorldDir = this.shellEjector.getWorldDirection(new THREE.Vector3());

        // 탄피의 초기 위치를 배출구 위치로 설정
        casing.position.copy(ejectorWorldPos);

        // 탄피가 총기에서 옆으로 튀어나오는 방향 설정
        // 총기의 로컬 "오른쪽" 방향 (또는 배출구의 방향)을 계산합니다.
        gunRight.cross(new THREE.Vector3(0, 1, 0)).normalize(); // 총의 앞 방향과 월드 업 벡터의 외적 = 총의 옆 방향

        // 탄피의 초기 속도 설정
        // ejectorWorldDir를 사용하여 탄피가 배출되는 '정확한' 방향으로 밀어내고,
        // gunRight를 사용하여 옆으로 튀어나오는 힘을 추가합니다.
        const initialVelocity = new THREE.Vector3();
        initialVelocity.copy(ejectorWorldDir).multiplyScalar(-1); // 배출구 방향으로 초기 속도 (앞으로 살짝)
        initialVelocity.add(gunRight.multiplyScalar(0.2 + Math.random() * 2)); // 총의 옆으로 튀어나가는 힘
        initialVelocity.y += 0.1 + Math.random() * 2; // 위로 살짝 튀어 오르는 힘

        // 탄피의 물리 속성 추가
        casing.userData = {
            velocity: initialVelocity,
            angularVelocity: new THREE.Vector3(
                (Math.random() - 0.5) * 5, // X축 회전
                (Math.random() - 0.5) * 5, // Y축 회전
                (Math.random() - 0.5) * 5  // Z축 회전
            ),
            life: 0 // 바닥에 닿거나 일정 시간 후 제거하기 위한 변수
        };

        this.scene.add(casing);
        this.shellCasings.push(casing);
    }
    update() {
        // 탄피 애니메이션 업데이트
        for (let i = this.shellCasings.length - 1; i >= 0; i--) {
            const casing = this.shellCasings[i];
            const userData = casing.userData;

            // 속도에 중력 적용
            userData.velocity.add(this.gravity.clone().multiplyScalar(this.deltaTime));

            // 위치 업데이트
            casing.position.add(userData.velocity.clone().multiplyScalar(this.deltaTime));

            // 회전 업데이트
            casing.rotation.x += userData.angularVelocity.x * this.deltaTime;
            casing.rotation.y += userData.angularVelocity.y * this.deltaTime;
            casing.rotation.z += userData.angularVelocity.z * this.deltaTime;
            const height = ("parameters" in casing.geometry) ? (casing.geometry.parameters as any).height : 0
            // 바닥 충돌 및 제거 (간단한 구현)
            if (casing.position.y <= 0 + height / 2) {
                // 바닥에 닿으면 튀어 오르는 효과 추가 (선택 사항)
                // userData.velocity.y *= -0.3; // 탄력
                // userData.velocity.x *= 0.8; // 마찰
                // userData.velocity.z *= 0.8; // 마찰
                // casing.position.y = plane.position.y + casing.geometry.parameters.height / 2;

                // 일정 시간 후 제거 (바닥에 닿으면 바로 제거하거나, 더 현실적인 물리 시뮬레이션 후 제거)
                userData.life += this.deltaTime;
                if (userData.life > 0.5) { // 0.5초 후 제거
                    this.scene.remove(casing);
                    casing.geometry.dispose();
                    (casing.material as THREE.Material).dispose();
                    this.shellCasings.splice(i, 1);
                }
            }
        }
    }
}