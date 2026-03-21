import * as THREE from 'three';
import { IBuildingObject, BuildingType } from '../ibuildingobj';
import { BuildingProperty } from '../buildingdefs';
import { ISelectionData } from '@Glibs/ux/selectionpanel/selectionpanel';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

export class DefenseTurret implements IBuildingObject {
    public readonly type = BuildingType.DefenseTurret;
    public level: number = 1;
    private target: THREE.Object3D | null = null;
    private attackTimer = 0;
    private readonly attackCooldown = 1.0;
    private isAttacking = true;

    constructor(
        public readonly id: string,
        public readonly property: BuildingProperty,
        public readonly position: THREE.Vector3,
        public readonly mesh: THREE.Object3D,
        public readonly eventCtrl: IEventController
    ) {
        this.mesh.position.copy(position);
    }

    update(delta: number): void {
        if (!this.isAttacking) return;
        this.attackTimer += delta;

        if (!this.target) {
            this.findTarget();
        }

        if (this.target) {
            const lookPos = this.target.position.clone();
            lookPos.y = this.mesh.position.y;
            this.mesh.lookAt(lookPos);

            if (this.attackTimer >= this.attackCooldown) {
                this.shoot();
                this.attackTimer = 0;
            }
        }
    }

    private findTarget() { }
    private shoot() {
        console.log(`[Turret ${this.id}] Shooting!`);
    }

    startProduction(targetId?: string) {
        console.log(`[Turret ${this.id}] Turret does not support production: ${targetId}`);
    }

    repair() {
        console.log(`[Turret ${this.id}] Repairing...`);
    }

    destroy(): void {
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
    }

    getSelectionData(): ISelectionData {
        return {
            title: this.property.name,
            description: this.property.desc,
            level: this.level,
            hp: { current: this.property.hp, max: this.property.hp },
            status: this.isAttacking ? (this.target ? "교전 중" : "경계 중") : "정지됨",
            progress: (this.isAttacking && this.target) ? (this.attackTimer / this.attackCooldown) : undefined,
            commands: (this.property.commands || []).map(t => ({
                ...t,
                onClick: () => {
                    if (t.type === 'research') {
                        this.eventCtrl.SendEventMessage(EventTypes.RequestUpgrade, t.targetId);
                    } else if (t.type === 'produce') {
                        this.startProduction(t.targetId);
                    } else if (t.type === 'action') {
                        if (t.id === "attack") this.isAttacking = true;
                        if (t.id === "stop") { this.isAttacking = false; this.target = null; }
                        if (t.id === "repair") this.repair();
                    }
                },
                isDisabled: () => {
                    if (t.id === "attack") return this.isAttacking;
                    if (t.id === "stop") return !this.isAttacking;
                    return false;
                }
            }))
        };
    }
}
