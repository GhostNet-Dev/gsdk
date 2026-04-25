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

type States = Record<string, IActorState>
type AllyAttackTarget = IPhysicsObject & { TargetId?: string }

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
    defSt["IdleSt"]   = new IdleAllyState(defSt, allyModel, gphysic, spec)
    defSt["RunSt"]    = new RunAllyState(defSt, allyModel, gphysic, spec)
    defSt["AttackSt"] = new AttackAllyState(defSt, allyModel, gphysic, eventCtrl, spec)
    defSt["JumpSt"]   = new JumpAllyState(defSt, allyModel, gphysic, spec)
    defSt["HurtSt"]   = new HurtAllyState(defSt, allyModel, gphysic, spec)
    defSt["DyingSt"]  = new DyingAllyState(defSt, allyModel, prop, gphysic, eventCtrl, spec)
    return defSt.IdleSt
}

export abstract class AllyState {
    attackDist = 3
    constructor(
        public states: States,
        protected allyModel: AllyModel,
        protected gphysic: IGPhysic,
        protected spec: BaseSpec,
    ) { }

    abstract Uninit(): void

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
            const ctrl = this.spec.Owner as any
            const attackRange = ctrl.pendingAttackRange as number
            const explicitKbDist = ctrl.pendingKnockbackDist as number
            let knockbackVector: THREE.Vector3 | undefined

            if (attackRange > 0) {
                const allyPos = this.allyModel.Pos.clone()
                const attPos = target.Pos.clone()
                allyPos.y = 0
                attPos.y = 0

                const currentDist = allyPos.distanceTo(attPos)
                let pushAmount = 0
                if (explicitKbDist > 0) {
                    pushAmount = explicitKbDist
                } else {
                    const desiredPush = Math.max(1.5, attackRange * 0.5)
                    pushAmount = Math.min(desiredPush, Math.max(0, (attackRange - 0.1) - currentDist))
                }

                if (pushAmount > 0) {
                    knockbackVector = new THREE.Vector3()
                        .subVectors(allyPos, attPos)
                        .normalize()
                    knockbackVector.y = 0
                    knockbackVector.multiplyScalar(pushAmount)
                }

                ctrl.pendingAttackRange = 0
                ctrl.pendingKnockbackDist = 0
            }

            this.Uninit()
            this.states.HurtSt.Init(knockbackVector)
            return this.states.HurtSt
        }
    }

    CheckAttack(dist: number) {
        if (dist < this.attackDist) {
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

    ZeroV = new THREE.Vector3()
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    constructor(
        states: States,
        allyModel: AllyModel,
        gphysic: IGPhysic,
        private eventCtrl: IEventController,
        spec: BaseSpec,
    ) {
        super(states, allyModel, gphysic, spec)
    }

    Init(): void {
        this.attackSpeed = this.spec.AttackSpeed
        this.attackTime = this.spec.AttackSpeed
        this.attackDamageMax = this.spec.AttackDamageMax
        this.attackDamageMin = this.spec.AttackDamageMin
        const duration = this.allyModel.ChangeAction(ActionType.Punch)
        if (duration != undefined) this.attackSpeed = duration * 0.8
    }

    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        this.targetId = GetAllyAttackTargetId(target)
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const dist = this.allyModel.Pos.distanceTo(target.Pos)
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying
        if (dist > this.attackDist) {
            const checkRun = this.CheckRun(v)
            if (checkRun != undefined) return checkRun
        }

        const lookDir = v.clone()
        lookDir.y = 0
        if (lookDir.lengthSq() > 0) {
            const mx = this.MX.lookAt(lookDir, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.allyModel.Meshs.quaternion.copy(qt)
        }

        if (this.attackProcess) return this
        this.attackTime += delta
        if (this.attackTime / this.attackSpeed < 1) return this
        this.attackTime -= this.attackSpeed
        this.attackProcess = true

        this.keytimeout = setTimeout(() => {
            this.attack()
        }, this.attackSpeed * 1000 * 0.4)

        return this
    }

    private attack() {
        this.eventCtrl.SendEventMessage(EventTypes.Attack + this.targetId, [{
            type: AttackType.NormalSwing,
            spec: this.spec,
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
            obj: this.allyModel.Meshs,
        }])
        this.attackProcess = false
    }
}

export class IdleAllyState extends AllyState implements IActorState {
    constructor(state: States, allyModel: AllyModel, gphysic: IGPhysic, spec: BaseSpec) {
        super(state, allyModel, gphysic, spec)
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
        super(states, allyModel, gphysic, spec)
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

        const dist = this.allyModel.Pos.distanceTo(target.Pos)
        const checkAttack = this.CheckAttack(dist)
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
