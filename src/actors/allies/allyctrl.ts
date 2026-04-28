import * as THREE from "three";
import { AllyModel } from "./allymodel";
import { IAllyCtrl, AllyBox, AllyId, AllyProperty, IActorState } from "./allytypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EffectType } from "@Glibs/types/effecttypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { StatKey } from "@Glibs/types/stattypes";
import { Buff } from "@Glibs/magical/buff/buff";
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem";
import { TargetDistanceMode, TargetRecord, TargetTeamId } from "@Glibs/systems/targeting/targettypes";
import { GetHorizontalDistanceToBoxSurface, MeleeValidationResult, PendingMeleeImpactContext } from "@Glibs/actors/battle/meleecombat";
import { WeaponMode } from "@Glibs/actors/projectile/projectiletypes";

// 타겟 레코드를 IPhysicsObject로 래핑하여 TargetId를 state machine에 전달
class AllyTargetAdapter implements IPhysicsObject {
    private static readonly fallbackBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1))
    private target?: TargetRecord
    private velocity = 0
    private readonly size = new THREE.Vector3(1, 1, 1)
    private readonly centerPos = new THREE.Vector3()
    private readonly headPos = new THREE.Vector3()
    private readonly box = new THREE.Box3()
    private isDirty = true

    // 플레이어 위치를 폴백으로 사용하지 않음: 아군은 타겟 없으면 제자리 대기
    private static readonly ZERO = new THREE.Vector3()

    get HasTarget() { return this.target != undefined }
    get TargetId() { return this.target?.id ?? TargetTeamId.Monster }

    set Target(record: TargetRecord | undefined) {
        if (this.target !== record) {
            this.target = record
            this.isDirty = true
        }
    }

    get Velocity() { return this.velocity }
    set Velocity(n: number) { this.velocity = n }

    get Size(): THREE.Vector3 {
        if (this.isDirty) this.updateCache()
        return this.size
    }
    get CBox(): THREE.Mesh { return AllyTargetAdapter.fallbackBoxMesh }
    get BoxPos(): THREE.Vector3 { return this.CenterPos }
    get Box(): THREE.Box3 {
        if (this.isDirty) this.updateCache()
        return this.box
    }
    get HeadPos(): THREE.Vector3 {
        this.headPos.copy(this.CenterPos)
        this.headPos.y += this.Size.y / 2
        return this.headPos
    }
    get CenterPos(): THREE.Vector3 {
        if (this.isDirty) this.updateCache()
        return this.centerPos
    }
    get Pos(): THREE.Vector3 {
        return this.target?.object.position ?? AllyTargetAdapter.ZERO
    }
    set Visible(flag: boolean) {
        const object = this.target?.object
        if (object) object.visible = flag
    }
    get Meshs(): THREE.Group | THREE.Mesh {
        const object = this.target?.object
        if (object instanceof THREE.Group || object instanceof THREE.Mesh) return object
        return AllyTargetAdapter.fallbackBoxMesh
    }
    get UUID(): string { return this.target?.object.uuid ?? "" }

    update() { this.isDirty = true }

    private updateCache() {
        const target = this.target
        const object = target?.object
        if (!object) {
            this.box.makeEmpty()
            this.size.set(1, 1, 1)
            this.centerPos.copy(AllyTargetAdapter.ZERO)
            this.isDirty = false
            return
        }
        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            this.box.copy(target.bounds)
        } else {
            this.box.setFromObject(object)
        }
        if (this.box.isEmpty()) {
            this.size.set(1, 1, 1)
            this.centerPos.copy(object.position)
        } else {
            this.box.getSize(this.size)
            this.box.getCenter(this.centerPos)
        }
        this.isDirty = false
    }
}

export class AllyCtrl implements ILoop, IAllyCtrl, IActionUser {
    LoopId = 0
    baseSpec: BaseSpec = new BaseSpec(this.stats, this)
    currentState: IActorState
    idleState: IActorState
    dir = new THREE.Vector3()
    moveDirection = new THREE.Vector3()
    public pendingAttackRange: PendingMeleeImpactContext["pendingAttackRange"] = 0
    public pendingKnockbackDist: PendingMeleeImpactContext["pendingKnockbackDist"] = 0

    private phybox: AllyBox
    private readonly targetId: string
    private readonly targetAdapter = new AllyTargetAdapter()
    private targetRegistry?: TargetRegistrySystem
    private currentTarget?: TargetRecord
    private disposed = false
    private updateBuffEvent = ""
    private removeBuffEvent = ""
    private readonly aggroRange = 60
    private lastSearchTime = 0
    private readonly searchInterval = 500
    private readonly _cp = new THREE.Vector3()
    private readonly targetBounds = new THREE.Box3()
    private loggedNoTarget = false

    private readonly setTargetRegistry = (targetRegistry?: TargetRegistrySystem) => {
        this.targetRegistry = targetRegistry
    }
    private readonly onUpdateBuff = (buff: Buff, level = 0) => {
        this.baseSpec.Buff(buff, level)
    }
    private readonly onRemoveBuff = (buff: Buff) => {
        this.baseSpec.RemoveBuff(buff)
    }

    get AllyBox() { return this.phybox }
    get Spec() { return this.baseSpec }
    get TargetId() { return this.targetId }
    get DeckLevel() { return this.deckLevel }
    get objs() { return this.allyModel.Meshs }

    constructor(
        id: number,
        private readonly deckLevel: number,
        private allyModel: AllyModel,
        private gphysic: IGPhysic,
        private eventCtrl: IEventController,
        private property: AllyProperty,
        private stats: Partial<Record<StatKey, number>>,
    ) {
        this.targetId = `ally:${property.id}:${id}`
        this.baseSpec.lastUsedWeaponMode = property.projectileDef ? WeaponMode.Ranged : WeaponMode.Melee

        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)

        const size = allyModel.Size
        const geometry = new THREE.BoxGeometry(size.x * 2, size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ color: 0x0000ff, wireframe: true })

        this.idleState = this.currentState = property.idleStates!(
            id, this.allyModel, this.property, this.gphysic, this.eventCtrl, this.baseSpec
        )

        this.phybox = new AllyBox(id, "ally", property.id, geometry, material)
        this.phybox.visible = false
        this.phybox.position.copy(this.allyModel.Pos)

        this.updateBuffEvent = EventTypes.UpdateBuff + "ally" + id
        this.removeBuffEvent = EventTypes.RemoveBuff + "ally" + id
        eventCtrl.RegisterEventListener(this.updateBuffEvent, this.onUpdateBuff)
        eventCtrl.RegisterEventListener(this.removeBuffEvent, this.onRemoveBuff)
        eventCtrl.RegisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry)
        eventCtrl.SendEventMessage(EventTypes.RequestTargetSystem)
    }

    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this, ctx)
        action.activate?.(this, ctx)
    }

    removeAction(action: IActionComponent, context?: ActionContext): void {
        action.deactivate?.(this, context)
        action.remove?.(this)
    }

    Dispose(): void {
        if (this.disposed) return
        this.disposed = true
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
        this.eventCtrl.DeregisterEventListener(this.updateBuffEvent, this.onUpdateBuff)
        this.eventCtrl.DeregisterEventListener(this.removeBuffEvent, this.onRemoveBuff)
        this.eventCtrl.DeregisterEventListener(EventTypes.RegisterTargetSystem, this.setTargetRegistry)
    }

    Summoned(): void {
        this.baseSpec.ResetStatus()
        this.allyModel.SetOpacity(1)
        this.currentState = this.idleState
        this.currentState.Init()
        this.AllyBox.position.copy(this.allyModel.Pos)
    }

    update(delta: number): void {
        if (!this.allyModel.Visible) return

        this.targetAdapter.update()
        const target = this.resolveTarget()

        if (this.Spec.Health > 0) {
            if (this.currentTarget) {
                this.loggedNoTarget = false
                this.dir.subVectors(target.CenterPos, this.allyModel.CenterPos)
                this.moveDirection.copy(this.dir.normalize())
            } else {
                if (!this.loggedNoTarget) {
                    console.log("[CombatDebug] NoTarget", {
                        actor: "ally",
                        actorId: this.targetId,
                        targetId: undefined,
                        currentTargetId: undefined,
                        actorPos: {
                            x: this.allyModel.Pos.x,
                            y: this.allyModel.Pos.y,
                            z: this.allyModel.Pos.z,
                        },
                        targetPos: undefined,
                        distance: undefined,
                        attackRange: undefined,
                        validation: undefined,
                        boundsEmpty: undefined,
                    })
                    this.loggedNoTarget = true
                }
                this.moveDirection.set(0, 0, 0)
            }
        } else {
            this.moveDirection.set(0, 0, 0)
        }

        this.currentState = this.currentState.Update(delta, this.moveDirection, target)
        this.allyModel.update(delta)

        this.phybox.position.copy(this.allyModel.Pos)
        this.phybox.rotation.copy(this.allyModel.Meshs.rotation)
        this.phybox.position.y += this.allyModel.Size.y / 2
    }

    ReceiveDemage(damage: number, effect?: EffectType, attackRange?: number, knockbackDist?: number): boolean {
        if (this.Spec.Health <= 0) return false
        this.allyModel.DamageEffect(damage, effect)
        this.pendingAttackRange = attackRange ?? 0
        this.pendingKnockbackDist = knockbackDist ?? 0
        this.Spec.ReceiveCalcDamage(damage)
        return this.Spec.Health > 0
    }

    ValidateMeleeAttackTarget(targetId: string, attackRange: number): MeleeValidationResult {
        const target = this.currentTarget
        if (!target || target.id !== targetId) return MeleeValidationResult.InvalidTarget
        if (!target.alive) return MeleeValidationResult.DeadTarget
        if (!target.targetable || !target.collidable) return MeleeValidationResult.InvalidTarget

        const dist = GetHorizontalDistanceToBoxSurface(this.allyModel.Pos, this.targetAdapter.Box, target.object.position, this._cp)
        if (dist > attackRange) return MeleeValidationResult.OutOfRange
        return MeleeValidationResult.InRange
    }

    ValidateRangedAttackTarget(targetId: string, attackRange: number): boolean {
        const target = this.currentTarget
        if (!target || target.id !== targetId) return false
        if (!target.alive || !target.targetable || !target.collidable) return false

        return GetHorizontalDistanceToBoxSurface(this.allyModel.Pos, this.targetAdapter.Box, target.object.position, this._cp) <= attackRange
    }

    private resolveTarget(): IPhysicsObject {
        const previousTargetId = this.currentTarget?.id
        this.currentTarget = this.findRegistryTarget()
        this.targetAdapter.Target = this.currentTarget
        const currentTargetId = this.currentTarget?.id
        if (previousTargetId !== currentTargetId) {
            console.log("[CombatDebug] TargetChanged", {
                actor: "ally",
                actorId: this.targetId,
                targetId: currentTargetId,
                currentTargetId,
                previousTargetId,
                actorPos: {
                    x: this.allyModel.Pos.x,
                    y: this.allyModel.Pos.y,
                    z: this.allyModel.Pos.z,
                },
                targetPos: this.currentTarget
                    ? {
                        x: this.currentTarget.object.position.x,
                        y: this.currentTarget.object.position.y,
                        z: this.currentTarget.object.position.z,
                    }
                    : undefined,
                distance: undefined,
                attackRange: undefined,
                validation: undefined,
                boundsEmpty: undefined,
            })
        }
        return this.targetAdapter
    }

    private findRegistryTarget(): TargetRecord | undefined {
        const registry = this.targetRegistry
        if (!registry) return undefined

        const now = Date.now()
        const current = this.currentTarget
        if (this.isValidTarget(current)) {
            if (now - this.lastSearchTime < this.searchInterval) return current
        }

        this.lastSearchTime = now
        return registry.findNearestHostile(this.targetId, this.aggroRange, {
            aliveOnly: true,
            targetableOnly: true,
            collidableOnly: true,
            kinds: ["unit", "structure"],
            distanceMode: TargetDistanceMode.BoundsSurface,
        })
    }

    private isValidTarget(target?: TargetRecord): target is TargetRecord {
        if (!target?.alive || !target.targetable || !target.collidable) return false
        if (GetHorizontalDistanceToBoxSurface(this.allyModel.Pos, this.getTargetBounds(target), target.object.position, this._cp) > this.aggroRange) return false
        return this.targetRegistry?.isHostile(this.targetId, target.id) ?? false
    }

    private getTargetBounds(target: TargetRecord): THREE.Box3 | undefined {
        if (target.kind === "structure" && target.bounds && !target.bounds.isEmpty()) {
            return target.bounds
        }

        this.targetBounds.setFromObject(target.object)
        return this.targetBounds.isEmpty() ? undefined : this.targetBounds
    }
}
