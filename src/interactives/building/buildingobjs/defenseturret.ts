import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from "@Glibs/ux/selectionpanel/selectionpanel";

export class DefenseTurret implements IBuildingObject {
    public readonly type = BuildingType.DefenseTurret;
    public level: number = 1;
    private target: THREE.Object3D | null = null;
    private attackTimer = 0;
    private readonly attackCooldown = 1.0; // 1초에 한 번 공격
    private readonly range = 15;
    private isAttacking = true;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        if (!this.isAttacking) return;
        
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

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc || "자동으로 적을 공격하는 방어 타워입니다.",
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            status: this.isAttacking ? "상태: 경계 중" : "상태: 정지",
            commands: [
                {
                    id: "attack",
                    name: "공격 시작",
                    icon: "⚔️",
                    onClick: () => { this.isAttacking = true; },
                    isDisabled: () => this.isAttacking
                },
                {
                    id: "stop",
                    name: "정지",
                    icon: "🛑",
                    onClick: () => { this.isAttacking = false; this.target = null; },
                    isDisabled: () => !this.isAttacking
                }
            ]
        };
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
