import * as THREE from "three";
import { AllyModel } from "../allymodel";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { ActionType, AttackType } from "@Glibs/types/playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { IActorState } from "../allytypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { AllyProperty } from "../allytypes";
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes";
import { ProjectileDamageType } from "@Glibs/actors/projectile/projectiletypes";
import {
    BuildKnockbackVector,
    GetHorizontalDistanceToBoxSurface,
    GetMeleeAttackDistance,
    GetMeleeTargetValidator,
    MeleeValidationResult,
} from "@Glibs/actors/battle/meleecombat";

type States = Record<string, IActorState>
type AllyAttackTarget = IPhysicsObject & { TargetId?: string, HasTarget?: boolean }
type RangedTargetValidator = {
    ValidateRangedAttackTarget?: (targetId: string, attackRange: number) => boolean
}

function HasAllyAttackTarget(target?: IPhysicsObject) {
    return (target as AllyAttackTarget | undefined)?.HasTarget !== false
}

export function GetAllyAttackTargetId(target?: IPhysicsObject) {
    return (target as AllyAttackTarget | undefined)?.TargetId ?? TargetTeamId.Monster
}

export function NewDefaultAllyState(
    id: number,
    allyModel: AllyModel,
    prop: AllyProperty,
    gphysic: IGPhysic,
    eventCtrl: IEventController,
    spec: BaseSpec,
): IActorState {
    const defSt: States = {}
    defSt["IdleSt"]   = new IdleAllyState(defSt, allyModel, prop, gphysic, spec)
    defSt["RunSt"]    = new RunAllyState(defSt, allyModel, prop, gphysic, spec)
    defSt["AttackSt"] = new AttackAllyState(defSt, allyModel, prop, gphysic, eventCtrl, spec)
    defSt["JumpSt"]   = new JumpAllyState(defSt, allyModel, prop, gphysic, spec)
    defSt["HurtSt"]   = new HurtAllyState(defSt, allyModel, prop, gphysic, spec)
    defSt["DyingSt"]  = new DyingAllyState(defSt, allyModel, prop, gphysic, eventCtrl, spec)
    return defSt.IdleSt
}

export abstract class AllyState {
    constructor(
        public states: States,
        protected allyModel: AllyModel,
        protected property: AllyProperty,
        protected gphysic: IGPhysic,
        protected spec: BaseSpec,
    ) { }

    abstract Uninit(): void

    protected GetAttackDistance() {
        if (this.property.projectileDef?.range != undefined) return this.property.projectileDef.range
        return GetMeleeAttackDistance(this.spec)
    }

    private _cp = new THREE.Vector3()
    protected GetTargetDistance(target: IPhysicsObject) {
        return GetHorizontalDistanceToBoxSurface(this.allyModel.Pos, target.Box, target.Pos, this._cp)
    }

    CheckRun(v: THREE.Vector3) {
        if (v.x || v.z) {
            this.Uninit()
            this.states.RunSt.Init()
            return this.states.RunSt
        }
    }

    perf = 0
    CheckGravity() {
        if (this.perf++ % 3 != 0) return
        this.allyModel.Meshs.position.y -= 0.5
        if (!this.gphysic.Check(this.allyModel)) {
            this.allyModel.Meshs.position.y += 0.5
            this.Uninit()
            this.states.JumpSt.Init(0)
            return this.states.JumpSt
        }
        this.allyModel.Meshs.position.y += 0.5
    }

    CheckDying() {
        if (this.spec.Health <= 0) {
            this.Uninit()
            this.states.DyingSt.Init()
            return this.states.DyingSt
        }
    }

    CheckHit(target: IPhysicsObject) {
        if (this.spec.Status.hit) {
            const ctrl = GetMeleeTargetValidator(this.spec.Owner)
            const attackRange = ctrl?.pendingAttackRange ?? 0
            const explicitKbDist = ctrl?.pendingKnockbackDist ?? 0
            const knockbackVector = BuildKnockbackVector(
                this.allyModel.Pos,
                target.Pos,
                attackRange,
                explicitKbDist,
            )

            if (ctrl) {
                ctrl.pendingAttackRange = 0
                ctrl.pendingKnockbackDist = 0
            }

            this.Uninit()
            this.states.HurtSt.Init(knockbackVector)
            return this.states.HurtSt
        }
    }

    CheckAttack(target: IPhysicsObject, dist: number) {
        if (!HasAllyAttackTarget(target)) return
        if (dist < this.GetAttackDistance()) {
            this.Uninit()
            this.states.AttackSt.Init()
            return this.states.AttackSt
        }
    }
}

export class HurtAllyState extends AllyState implements IActorState {
    hurtTime = 0
    hurtDuration = 0.5
    private readonly KNOCKBACK_SPEED = 15.0
    private knockbackDir?: THREE.Vector3
    private maxPushDistance = 0
    private currentPushedDistance = 0

    Init(knockbackVector?: THREE.Vector3): void {
        this.spec.Status.hit = false
        if (knockbackVector) {
            this.maxPushDistance = knockbackVector.length()
            this.knockbackDir = knockbackVector.clone().normalize()
        } else {
            this.maxPushDistance = 0
            this.knockbackDir = undefined
        }
        this.currentPushedDistance = 0
        const duration = this.allyModel.ChangeAction(ActionType.MonHurt2)
        if (duration != undefined) this.hurtDuration = duration
        this.hurtTime = 0
    }

    Uninit(): void {
        this.knockbackDir = undefined
        this.maxPushDistance = 0
    }

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        if (this.spec.Status.hit) {
            this.spec.Status.hit = false
        }

        if (this.knockbackDir && this.currentPushedDistance < this.maxPushDistance) {
            let moveDist = this.KNOCKBACK_SPEED * delta
            if (this.currentPushedDistance + moveDist > this.maxPushDistance) {
                moveDist = this.maxPushDistance - this.currentPushedDistance
            }
            const moveVec = this.knockbackDir.clone().multiplyScalar(moveDist)
            this.allyModel.Pos.add(moveVec)
            this.currentPushedDistance += moveDist
            if (this.gphysic.Check(this.allyModel)) {
                this.allyModel.Pos.sub(moveVec)
                this.currentPushedDistance = this.maxPushDistance
            }
        }

        this.hurtTime += delta
        if (this.hurtTime >= this.hurtDuration) {
            this.Uninit()
            if (v.x || v.z) {
                this.states.RunSt.Init()
                return this.states.RunSt
            }
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }
        return this
    }
}

export class JumpAllyState extends AllyState implements IActorState {
    speed = 10
    velocity_y = 16
    dirV = new THREE.Vector3()
    ZeroV = new THREE.Vector3()
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    Init(y?: number): void {
        this.velocity_y = y ?? 16
    }

    Uninit(): void {
        this.velocity_y = 16
    }

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit

        const movX = v.x * delta * this.speed
        const movZ = v.z * delta * this.speed
        const movY = this.velocity_y * delta

        this.allyModel.Meshs.position.x += movX
        this.allyModel.Meshs.position.z += movZ

        if (movX || movZ) {
            this.dirV.copy(v)
            this.dirV.y = 0
            if (this.dirV.lengthSq() > 0) {
                const mx = this.MX.lookAt(this.dirV, this.ZeroV, this.YV)
                const qt = this.QT.setFromRotationMatrix(mx)
                this.allyModel.Meshs.quaternion.copy(qt)
            }
        }

        if (this.gphysic.Check(this.allyModel)) {
            this.allyModel.Meshs.position.x -= movX
            this.allyModel.Meshs.position.z -= movZ
        }

        this.allyModel.Meshs.position.y += movY
        if (this.gphysic.Check(this.allyModel)) {
            this.allyModel.Meshs.position.y -= movY
            this.Uninit()
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }

        this.velocity_y -= 9.8 * 3 * delta
        return this
    }
}

export class AttackAllyState extends AllyState implements IActorState {
    keytimeout?: NodeJS.Timeout
    attackProcess = false
    attackTime = 0
    attackSpeed = this.spec.AttackSpeed
    attackDamageMax = this.spec.AttackDamageMax
    attackDamageMin = this.spec.AttackDamageMin
    private targetId: string = TargetTeamId.Monster
    private scheduledTargetId: string = TargetTeamId.Monster
    private scheduledAttackRange = 0
    private readonly scheduledLookDir = new THREE.Vector3()

    ZeroV = new THREE.Vector3()
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    constructor(
        states: States,
        allyModel: AllyModel,
        property: AllyProperty,
        gphysic: IGPhysic,
        private eventCtrl: IEventController,
        spec: BaseSpec,
    ) {
        super(states, allyModel, property, gphysic, spec)
    }

    Init(): void {
        this.attackProcess = false
        this.attackSpeed = this.spec.AttackSpeed
        this.attackTime = this.spec.AttackSpeed
        this.attackDamageMax = this.spec.AttackDamageMax
        this.attackDamageMin = this.spec.AttackDamageMin
        const duration = this.allyModel.ChangeAction(this.property.attackAction ?? ActionType.Punch)
        if (duration != undefined) this.attackSpeed = duration * 0.8
    }

    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
        this.keytimeout = undefined
        this.attackProcess = false
        this.scheduledTargetId = TargetTeamId.Monster
        this.scheduledAttackRange = 0
        this.scheduledLookDir.set(0, 0, 0)
    }

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        this.targetId = GetAllyAttackTargetId(target)
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        if (!HasAllyAttackTarget(target)) {
            console.log("[CombatDebug] AttackCanceled", {
                actor: "ally",
                reason: "no_target_update",
                actorId: this.allyModel.UUID,
                targetId: this.targetId,
                currentTargetId: GetAllyAttackTargetId(target),
                actorPos: {
                    x: this.allyModel.Pos.x,
                    y: this.allyModel.Pos.y,
                    z: this.allyModel.Pos.z,
                },
                targetPos: undefined,
                distance: undefined,
                attackRange: undefined,
                validation: MeleeValidationResult.InvalidTarget,
                boundsEmpty: undefined,
            })
            this.Uninit()
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }

        const dist = this.GetTargetDistance(target)
        const attackDistance = this.GetAttackDistance()
        if (dist > attackDistance) {
            const checkRun = this.CheckRun(v)
            if (checkRun != undefined) return checkRun
        }

        if (this.attackProcess) {
            this.applyLookDirection(this.scheduledLookDir)
            return this
        }

        this.applyLookDirection(v)
        this.attackTime += delta
        if (this.attackTime / this.attackSpeed < 1) return this
        this.attackTime -= this.attackSpeed
        this.attackProcess = true
        this.scheduledTargetId = this.targetId
        this.scheduledAttackRange = attackDistance
        this.scheduledLookDir.copy(v)
        this.scheduledLookDir.y = 0
        if (this.scheduledLookDir.lengthSq() <= 0.0001) {
            this.scheduledLookDir.subVectors(target.CenterPos, this.allyModel.CenterPos)
            this.scheduledLookDir.y = 0
        }
        this.applyLookDirection(this.scheduledLookDir)

        console.log("[CombatDebug] AttackScheduled", {
            actor: "ally",
            actorId: this.allyModel.UUID,
            targetId: this.scheduledTargetId,
            currentTargetId: GetAllyAttackTargetId(target),
            actorPos: {
                x: this.allyModel.Pos.x,
                y: this.allyModel.Pos.y,
                z: this.allyModel.Pos.z,
            },
            targetPos: {
                x: target.Pos.x,
                y: target.Pos.y,
                z: target.Pos.z,
            },
            distance: dist,
            attackRange: attackDistance,
            validation: undefined,
            boundsEmpty: target.Box.isEmpty(),
        })

        this.keytimeout = setTimeout(() => {
            this.keytimeout = undefined
            this.attack(this.scheduledTargetId, this.scheduledAttackRange, target)
        }, this.attackSpeed * 1000 * 0.4)

        return this
    }

    private applyLookDirection(direction: THREE.Vector3) {
        const lookDir = direction.clone()
        lookDir.y = 0
        if (lookDir.lengthSq() > 0) {
            const mx = this.MX.lookAt(lookDir, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.allyModel.Meshs.quaternion.copy(qt)
        }
    }

    private attack(targetId: string, attackDistance: number, target: IPhysicsObject) {
        if (!this.attackProcess) {
            console.log("[CombatDebug] AttackCanceled", {
                actor: "ally",
                reason: "stale_timeout",
                actorId: this.allyModel.UUID,
                targetId,
                currentTargetId: GetAllyAttackTargetId(target),
                actorPos: {
                    x: this.allyModel.Pos.x,
                    y: this.allyModel.Pos.y,
                    z: this.allyModel.Pos.z,
                },
                targetPos: {
                    x: target.Pos.x,
                    y: target.Pos.y,
                    z: target.Pos.z,
                },
                distance: this.GetTargetDistance(target),
                attackRange: attackDistance,
                validation: MeleeValidationResult.InvalidTarget,
                boundsEmpty: target.Box.isEmpty(),
            })
            return
        }
        if (!HasAllyAttackTarget(target)) {
            console.log("[CombatDebug] AttackCanceled", {
                actor: "ally",
                reason: "no_target_hit",
                actorId: this.allyModel.UUID,
                targetId,
                currentTargetId: GetAllyAttackTargetId(target),
                actorPos: {
                    x: this.allyModel.Pos.x,
                    y: this.allyModel.Pos.y,
                    z: this.allyModel.Pos.z,
                },
                targetPos: undefined,
                distance: undefined,
                attackRange: attackDistance,
                validation: MeleeValidationResult.InvalidTarget,
                boundsEmpty: undefined,
            })
            this.attackProcess = false
            return
        }
        const currentTargetId = GetAllyAttackTargetId(target)
        if (currentTargetId !== targetId) {
            console.log("[CombatDebug] AttackCanceled", {
                actor: "ally",
                reason: "target_changed_hit",
                actorId: this.allyModel.UUID,
                targetId,
                currentTargetId,
                actorPos: {
                    x: this.allyModel.Pos.x,
                    y: this.allyModel.Pos.y,
                    z: this.allyModel.Pos.z,
                },
                targetPos: {
                    x: target.Pos.x,
                    y: target.Pos.y,
                    z: target.Pos.z,
                },
                distance: this.GetTargetDistance(target),
                attackRange: attackDistance,
                validation: MeleeValidationResult.InvalidTarget,
                boundsEmpty: target.Box.isEmpty(),
            })
            this.attackProcess = false
            return
        }
        if (this.property.projectileDef) {
            this.rangedAttack(targetId, attackDistance, target)
            return
        }

        const validator = GetMeleeTargetValidator(this.spec.Owner)
        const validation = validator?.ValidateMeleeAttackTarget(targetId, attackDistance)
            ?? MeleeValidationResult.InvalidTarget
        if (validation !== MeleeValidationResult.InRange) {
            console.log("[CombatDebug] AttackCanceled", {
                actor: "ally",
                reason: "validator_failed",
                actorId: this.allyModel.UUID,
                targetId,
                currentTargetId,
                actorPos: {
                    x: this.allyModel.Pos.x,
                    y: this.allyModel.Pos.y,
                    z: this.allyModel.Pos.z,
                },
                targetPos: {
                    x: target.Pos.x,
                    y: target.Pos.y,
                    z: target.Pos.z,
                },
                distance: this.GetTargetDistance(target),
                attackRange: attackDistance,
                validation,
                boundsEmpty: target.Box.isEmpty(),
            })
            this.attackProcess = false
            return
        }

        this.eventCtrl.SendEventMessage(EventTypes.Attack + targetId, [{
            type: AttackType.NormalSwing,
            spec: this.spec,
            targetId,
            distance: attackDistance,
            attackerObjectId: this.allyModel.UUID,
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
            obj: this.allyModel.Meshs,
        }])
        this.attackProcess = false
    }

    private rangedAttack(targetId: string, attackDistance: number, target: IPhysicsObject) {
        const currentTargetId = GetAllyAttackTargetId(target)
        const validator = this.spec.Owner as RangedTargetValidator
        if (
            currentTargetId !== targetId ||
            validator.ValidateRangedAttackTarget?.(targetId, attackDistance) !== true
        ) {
            console.log("[CombatDebug] AttackCanceled", {
                actor: "ally",
                reason: currentTargetId !== targetId ? "target_changed_ranged" : "ranged_validator_failed",
                actorId: this.allyModel.UUID,
                targetId,
                currentTargetId,
                actorPos: {
                    x: this.allyModel.Pos.x,
                    y: this.allyModel.Pos.y,
                    z: this.allyModel.Pos.z,
                },
                targetPos: {
                    x: target.Pos.x,
                    y: target.Pos.y,
                    z: target.Pos.z,
                },
                distance: this.GetTargetDistance(target),
                attackRange: attackDistance,
                validation: undefined,
                boundsEmpty: target.Box.isEmpty(),
            })
            this.attackProcess = false
            return
        }

        const projectileDef = this.property.projectileDef!
        const muzzleOffset = projectileDef.muzzleOffset ?? { x: 0, y: 1.2, z: 0.8 }
        const src = new THREE.Vector3(muzzleOffset.x, muzzleOffset.y, muzzleOffset.z)
            .applyQuaternion(this.allyModel.Meshs.quaternion)
            .add(this.allyModel.Pos)
        const dir = target.CenterPos.clone().sub(src)
        if (dir.lengthSq() <= 0.0001) {
            this.attackProcess = false
            return
        }
        dir.normalize()

        const damageType = projectileDef.damageType ?? ProjectileDamageType.Physical
        const baseDamage = damageType === ProjectileDamageType.Magic
            ? this.spec.stats.getStat("magicAttack")
            : this.spec.DamageRanged

        this.eventCtrl.SendEventMessage(EventTypes.SpawnProjectile, {
            id: projectileDef.id,
            ownerSpec: this.spec,
            damage: baseDamage * (projectileDef.damageMultiplier ?? 1),
            damageType,
            src,
            dir,
            range: projectileDef.range ?? this.spec.AttackRange,
            homing: projectileDef.homing,
            hitscan: projectileDef.hitscan,
            tracerLife: projectileDef.tracerLife,
            tracerRange: projectileDef.tracerRange,
            useRaycast: projectileDef.useRaycast,
        })
        this.attackProcess = false
    }
}

export class IdleAllyState extends AllyState implements IActorState {
    constructor(state: States, allyModel: AllyModel, property: AllyProperty, gphysic: IGPhysic, spec: BaseSpec) {
        super(state, allyModel, property, gphysic, spec)
        this.Init()
    }

    Init(): void {
        this.allyModel.ChangeAction(ActionType.Idle)
    }

    Uninit(): void { }

    Update(_delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const checkRun = this.CheckRun(v)
        if (checkRun != undefined) return checkRun
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying
        return this
    }
}

export class DyingAllyState extends AllyState implements IActorState {
    constructor(
        states: States,
        allyModel: AllyModel,
        private prop: AllyProperty,
        gphysic: IGPhysic,
        private eventCtrl: IEventController,
        spec: BaseSpec,
    ) {
        super(states, allyModel, prop, gphysic, spec)
    }

    Init(): void {
        this.allyModel.ChangeAction(ActionType.Dying)
    }

    Uninit(): void { }

    Update(_delta: number, _v: THREE.Vector3, _target: IPhysicsObject): IActorState {
        return this
    }
}

export class RunAllyState extends AllyState implements IActorState {
    speed = this.spec.Speed

    ZeroV = new THREE.Vector3()
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()
    dir = new THREE.Vector3()

    Init(): void {
        this.allyModel.ChangeAction(ActionType.Run)
    }

    Uninit(): void { }

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        if (!HasAllyAttackTarget(target)) {
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }

        const dist = this.GetTargetDistance(target)
        const checkAttack = this.CheckAttack(target, dist)
        if (checkAttack != undefined) return checkAttack

        if (v.x == 0 && v.z == 0) {
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }
        v.y = 0

        const lookDir = v.clone()
        lookDir.y = 0
        if (lookDir.lengthSq() > 0) {
            const mx = this.MX.lookAt(lookDir, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.allyModel.Meshs.quaternion.copy(qt)
        }

        const dis = this.gphysic.CheckDirection(this.allyModel, this.dir.copy(v), this.speed)
        if (dis.move) {
            this.allyModel.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed))
        } else {
            this.allyModel.Pos.add(v.clone().multiplyScalar(delta * this.speed))
        }

        return this
    }
}
