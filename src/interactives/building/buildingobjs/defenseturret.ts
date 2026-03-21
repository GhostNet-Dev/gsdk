import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';

export class DefenseTurret extends BaseBuilding {
    private target: THREE.Object3D | null = null;
    private attackTimer = 0;
    private readonly attackCooldown = 1.0;
    private isAttacking = true;

    constructor(
        id: string,
        property: any,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: any
    ) {
        super(id, BuildingType.DefenseTurret, property, position, mesh, eventCtrl);
    }

    protected onUpdate(delta: number): void {
        if (this.isUpgrading || !this.isAttacking) return;
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

    protected getSpecificCommands(): ICommand[] {
        return (this.property.commands || []).map(t => ({
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
                if (this.isUpgrading) return true;
                if (t.id === "attack") return this.isAttacking;
                if (t.id === "stop") return !this.isAttacking;
                return false;
            }
        }));
    }

    protected getStatusText(): string {
        return this.isAttacking ? (this.target ? "교전 중" : "경계 중") : "정지됨";
    }

    protected getSpecificProgress(): number | undefined {
        return (this.isAttacking && this.target) ? (this.attackTimer / this.attackCooldown) : undefined;
    }
}
