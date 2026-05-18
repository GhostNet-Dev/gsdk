import * as THREE from 'three';
import { BaseBuilding } from './basebuilding';
import { BuildingType } from '../ibuildingobj';
import { ICommand } from '@Glibs/ux/selectionpanel/selectionpanel';
import { EventTypes } from '@Glibs/types/globaltypes';
import { BuildingProperty, BuildingRotationMode } from '../buildingdefs';
import IEventController from '@Glibs/interface/ievent';
import { TargetRecord } from '@Glibs/systems/targeting/targettypes';
import { TargetRegistrySystem } from '@Glibs/systems/targeting/targetregistrysystem';
import { ProjectileWeaponController } from '@Glibs/actors/controllable/projectileweaponcontroller';
import { CombatDebugInfo, CombatDebugTeam } from '@Glibs/systems/debugger/combatdebugtypes';

type DebugBoxMesh = THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;

export class DefenseTurret extends BaseBuilding {
    private target: TargetRecord | null = null;
    private isAttacking = true;
    private targetRegistry?: TargetRegistrySystem;
    private readonly weaponController = new ProjectileWeaponController();
    private debugBox?: DebugBoxMesh;
    private readonly debugBoxSize = new THREE.Vector3();
    private readonly tempDebugBoxSize = new THREE.Vector3();
    private readonly tempDebugBoxCenter = new THREE.Vector3();

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
            if (this.shouldTrackTarget()) {
                const lookPos = this.target.object.position.clone();
                lookPos.y = this.mesh.position.y;
                this.mesh.lookAt(lookPos);
            }
            this.shoot();
        }
    }

    destroy(): void {
        this.disposeDebugBox();
        this.eventCtrl.DeregisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry);
        super.destroy();
    }

    GetDebugInfo(): CombatDebugInfo | undefined {
        const weapon = this.property.combat?.weapons?.[0];
        if (this.isDestroyed || !this.mesh.parent || !this.isAttacking || !weapon) return undefined;

        const box = this.getDebugBounds();
        if (box.isEmpty()) return undefined;

        const damageBox = this.getOrCreateDebugBox(box);
        damageBox.position.copy(box.getCenter(this.tempDebugBoxCenter));

        const targetBounds = this.getDebugTargetBounds(this.target);
        const targetCenter = targetBounds
            ? targetBounds.getCenter(new THREE.Vector3())
            : this.target?.object.position.clone();

        return {
            team: CombatDebugTeam.Ally,
            targetId: this.id,
            damageBox,
            box,
            centerPos: this.mesh.position.clone(),
            moveDirection: new THREE.Vector3(0, 0, 0),
            attackRange: this.getAttackRange(),
            currentTargetId: this.target?.id,
            currentTargetBounds: targetBounds,
            currentTargetCenter: targetCenter,
        };
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

    private shouldTrackTarget(): boolean {
        return (this.property.combat?.rotationMode ?? BuildingRotationMode.TrackTarget) === BuildingRotationMode.TrackTarget;
    }

    private getDebugBounds(): THREE.Box3 {
        const registeredBounds = this.targetRegistry?.get(this.id)?.bounds;
        if (registeredBounds && !registeredBounds.isEmpty()) return registeredBounds.clone();

        const userDataBounds = this.mesh.userData.bounds;
        if (userDataBounds instanceof THREE.Box3 && !userDataBounds.isEmpty()) return userDataBounds.clone();

        this.mesh.updateWorldMatrix(true, true);
        return new THREE.Box3().setFromObject(this.mesh);
    }

    private getOrCreateDebugBox(bounds: THREE.Box3): DebugBoxMesh {
        const size = bounds.getSize(this.tempDebugBoxSize);
        const needsCreate = !this.debugBox || !this.debugBoxSize.equals(size);

        if (needsCreate) {
            this.disposeDebugBox();
            const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            const material = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
                depthTest: false,
            });
            this.debugBox = new THREE.Mesh(geometry, material);
            this.debugBox.visible = false;
            this.debugBox.renderOrder = 1000;
            this.debugBoxSize.copy(size);
        }

        const debugBox = this.debugBox;
        if (!debugBox) {
            throw new Error("DefenseTurret debug box was not created.");
        }

        if (this.mesh.parent && debugBox.parent !== this.mesh.parent) {
            this.mesh.parent.add(debugBox);
        }

        return debugBox;
    }

    private disposeDebugBox(): void {
        if (!this.debugBox) return;

        this.debugBox.geometry.dispose();
        this.debugBox.material.dispose();
        this.debugBox.removeFromParent();
        this.debugBox = undefined;
        this.debugBoxSize.set(0, 0, 0);
    }

    private getDebugTargetBounds(target: TargetRecord | null): THREE.Box3 | undefined {
        if (!target) return undefined;
        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            return target.bounds.clone();
        }

        const bounds = new THREE.Box3().setFromObject(target.object);
        return bounds.isEmpty() ? undefined : bounds;
    }

    private isValidTarget(target: TargetRecord | null): target is TargetRecord {
        if (!target?.alive || !target.targetable || !target.collidable) return false;
        if (this.mesh.position.distanceToSquared(target.object.position) > this.getAttackRange() ** 2) return false;
        return this.targetRegistry?.isHostile(this.id, target.id) ?? false;
    }
}
