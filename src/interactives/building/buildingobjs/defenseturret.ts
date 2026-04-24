import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';
import { BuildingProperty } from '../buildingdefs';
import IEventController from '@Glibs/interface/ievent';
import { TargetRecord } from '@Glibs/systems/targeting/targettypes';
import { TargetRegistrySystem } from '@Glibs/systems/targeting/targetregistrysystem';
import { ProjectileWeaponController } from '@Glibs/actors/controllable/projectileweaponcontroller';

export class DefenseTurret extends BaseBuilding {
    private target: TargetRecord | null = null;
    private isAttacking = true;
    private targetRegistry?: TargetRegistrySystem;
    private readonly weaponController = new ProjectileWeaponController();

    constructor(
        id: string,
        property: BuildingProperty,
        position: THREE.Vector3,
        mesh: THREE.Object3D,
        eventCtrl: IEventController
    ) {
        super(id, BuildingType.DefenseTurret, property, position, mesh, eventCtrl);
        this.weaponController.configure({
            eventEmitter: (msg) => this.eventCtrl.SendEventMessage(EventTypes.SpawnProjectile, msg),
            ownerSpec: this.baseSpec,
            ownerObject: this.mesh,
        });
        this.eventCtrl.RegisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry);
        this.eventCtrl.SendEventMessage(EventTypes.RequestTargetSystem);
    }

    protected onUpdate(delta: number): void {
        if (this.isUpgrading || !this.isAttacking) return;
        this.weaponController.update(delta);

        if (!this.isValidTarget(this.target)) {
            this.findTarget();
        }

        if (this.target) {
            const lookPos = this.target.object.position.clone();
            lookPos.y = this.mesh.position.y;
            this.mesh.lookAt(lookPos);
            this.shoot();
        }
    }

    destroy(): void {
        this.eventCtrl.DeregisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry);
        super.destroy();
    }

    private setTargetRegistry = (targetRegistry?: TargetRegistrySystem) => {
        if (!targetRegistry) return;
        this.targetRegistry = targetRegistry;
    };

    private findTarget() {
        const registry = this.targetRegistry;
        const weapon = this.property.combat?.weapons?.[0];
        if (!registry || !weapon) {
            this.target = null;
            return;
        }

        this.target = registry.findNearestHostile(this.id, this.getAttackRange(), {
            aliveOnly: true,
            targetableOnly: true,
            collidableOnly: true,
            kinds: this.property.combat?.targetKinds ?? ["ship", "unit"],
        }) ?? null;
    }

    private shoot() {
        if (!this.target) return;
        const weapon = this.property.combat?.weapons?.[0];
        this.weaponController.fireAtTarget(this.target.object, weapon, {
            defaultRange: this.baseSpec.AttackRange,
        });
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
        const weapon = this.property.combat?.weapons?.[0];
        return (this.isAttacking && this.target)
            ? this.weaponController.getCooldownProgress(weapon)
            : undefined;
    }

    private getAttackRange(): number {
        const weapon = this.property.combat?.weapons?.[0];
        return this.weaponController.getEffectiveRange(weapon, this.baseSpec.AttackRange);
    }

    private isValidTarget(target: TargetRecord | null): target is TargetRecord {
        if (!target?.alive || !target.targetable || !target.collidable) return false;
        if (this.mesh.position.distanceToSquared(target.object.position) > this.getAttackRange() ** 2) return false;
        return this.targetRegistry?.isHostile(this.id, target.id) ?? false;
    }
}
