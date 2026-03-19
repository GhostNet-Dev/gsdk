import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';

export class DefenseTurret implements IBuildingObject {
    public readonly type = BuildingType.DefenseTurret;
    private target: THREE.Object3D | null = null;
    private attackTimer = 0;
    private readonly attackCooldown = 1.0; // 1초에 한 번 공격
    private readonly range = 15;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        this.attackTimer += delta;

        // 타겟이 없거나 사거리 밖이면 새로운 타겟 검색 (실제 구현 시 적 리스트 필요)
        if (!this.target) {
            this.findTarget();
        }

        if (this.target) {
            // 타겟을 바라보게 함 (Y축 회전만)
            const lookPos = this.target.position.clone();
            lookPos.y = this.mesh.position.y;
            this.mesh.lookAt(lookPos);

            if (this.attackTimer >= this.attackCooldown) {
                this.shoot();
                this.attackTimer = 0;
            }
        }
    }

    private findTarget() {
        // TODO: 적 유닛 리스트에서 가장 가까운 적 탐색
        // console.log("[Turret] Searching for targets...");
    }

    private shoot() {
        console.log(`[Turret ${this.id}] Shooting at target!`);
        // TODO: 투사체 생성 또는 즉시 데미지 판정 로직
    }

    destroy(): void {
        console.log(`[Turret ${this.id}] Destroyed.`);
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }
    }
}
