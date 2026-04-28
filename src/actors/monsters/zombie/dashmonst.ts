import * as THREE from "three";
import { Zombie } from "../zombie"
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { ActionType, AttackType } from "@Glibs/types/playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { MeleeValidationResult } from "@Glibs/actors/battle/meleecombat";
import { IActorState, MonsterProperty } from "../monstertypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { DyingZState, GetMonsterAttackTargetId, HurtZState, IdleZState, JumpZState, MonState } from "./monstate";
import { Buff } from "@Glibs/magical/buff/buff";
import { buffDefs } from "@Glibs/magical/buff/buffdefs";
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes";

type States = Record<string, IActorState>

export function NewDashMonsterState(
    id: number,
    zombie: Zombie, 
    prop: MonsterProperty,
    gphysic: IGPhysic,  
    eventCtrl: IEventController, 
    spec: BaseSpec): IActorState 
{ 
    const defSt: States = {}
    defSt["IdleSt"] = new IdleZState(defSt, zombie, gphysic, spec)
    defSt["AttackSt"] = new DashAttackState(defSt, zombie, gphysic, eventCtrl, spec)
    defSt["JumpSt"] = new JumpZState(defSt, zombie, gphysic, spec)
    defSt["RunSt"] =  new DashRunState(defSt, zombie, gphysic, spec)
    defSt["DashRunSt"] = new FastDashRunState(defSt, zombie, gphysic, spec)
    defSt["AgonizingSt"] = new DashAgonizingState(id, defSt, zombie, gphysic, eventCtrl, spec)
    defSt["DyingSt"] = new DyingZState(defSt, zombie, prop, gphysic, eventCtrl, spec)
    defSt["HurtSt"] = new HurtZState(defSt, zombie, gphysic, spec)

    return defSt.IdleSt
}

export class DashAttackState extends MonState implements IActorState {
    keytimeout?:NodeJS.Timeout
    attackTime = 0
    attackSpeed = this.spec.AttackSpeed
    attackDamageMax = this.spec.AttackDamageMax
    attackDamageMin = this.spec.AttackDamageMin
    isAttacking = false
    hitDelay = 0
    private targetId: string = TargetTeamId.Player
    private scheduledTargetId: string = TargetTeamId.Player
    private readonly scheduledLookDir = new THREE.Vector3()

    private readonly ZeroV = new THREE.Vector3(0, 0, 0)
    private readonly YV = new THREE.Vector3(0, 1, 0)
    private readonly MX = new THREE.Matrix4()
    private readonly QT = new THREE.Quaternion()

    constructor(states: States, zombie: Zombie, gphysic: IGPhysic,
        private eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(states, zombie, gphysic, spec)
    }
    Init(): void {
        this.attackSpeed = this.ChangeAttackAction(ActionType.MonBiteNeck)
        this.attackDamageMax = this.spec.AttackDamageMax
        this.attackDamageMin = this.spec.AttackDamageMin
        this.attackTime = this.attackSpeed
        this.hitDelay = this.attackSpeed * 0.1
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
        this.isAttacking = false
        this.scheduledTargetId = TargetTeamId.Player
        this.scheduledLookDir.set(0, 0, 0)
    }
    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        this.targetId = GetMonsterAttackTargetId(target)
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const dist = this.GetTargetDistance(target)
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying
        if (dist > this.GetAttackDistance()) {
            const checkRun = this.CheckRun(v)
            if (checkRun != undefined) return checkRun
        }
        this.attackTime += delta

        if( this.isAttacking) {
            this.applyLookDirection(this.scheduledLookDir)
            this.hitDelay -= delta
            if(this.hitDelay <= 0) {
                this.attack(target, this.scheduledTargetId)
                this.isAttacking = false
            }
            return this
        }

        if (this.attackTime < this.attackSpeed) {
            return this
        }
        this.attackTime -= this.attackSpeed

        this.isAttacking = true
        this.scheduledTargetId = this.targetId
        const attackDistance = this.GetAttackDistance()
        this.scheduledLookDir.copy(v)
        this.scheduledLookDir.y = 0
        if (this.scheduledLookDir.lengthSq() <= 0.0001) {
            this.scheduledLookDir.subVectors(target.CenterPos, this.zombie.CenterPos)
            this.scheduledLookDir.y = 0
        }
        this.applyLookDirection(this.scheduledLookDir)
        this.hitDelay = this.attackSpeed * 0.1
        this.zombie.ChangeAction(ActionType.MonBiteNeck, this.attackSpeed)
        console.log("[CombatDebug] AttackScheduled", {
            actor: "dash_monster",
            actorId: this.zombie.UUID,
            targetId: this.scheduledTargetId,
            currentTargetId: GetMonsterAttackTargetId(target),
            actorPos: {
                x: this.zombie.Pos.x,
                y: this.zombie.Pos.y,
                z: this.zombie.Pos.z,
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
        return this
    }
    private applyLookDirection(direction: THREE.Vector3) {
        const lookDir = direction.clone()
        lookDir.y = 0
        if (lookDir.lengthSq() > 0) {
            const mx = this.MX.lookAt(lookDir, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.zombie.Meshs.quaternion.copy(qt)
        }
    }
    attack(target: IPhysicsObject, expectedTargetId: string) {
        const currentTargetId = GetMonsterAttackTargetId(target)
        if (currentTargetId !== expectedTargetId) {
            console.log("[CombatDebug] AttackCanceled", {
                actor: "dash_monster",
                reason: "target_changed_hit",
                actorId: this.zombie.UUID,
                targetId: expectedTargetId,
                currentTargetId,
                actorPos: {
                    x: this.zombie.Pos.x,
                    y: this.zombie.Pos.y,
                    z: this.zombie.Pos.z,
                },
                targetPos: {
                    x: target.Pos.x,
                    y: target.Pos.y,
                    z: target.Pos.z,
                },
                distance: this.GetTargetDistance(target),
                attackRange: this.GetAttackDistance(),
                validation: MeleeValidationResult.InvalidTarget,
                boundsEmpty: target.Box.isEmpty(),
            })
            return
        }
        const attackDistance = this.GetAttackDistance()
        if (!this.ValidateTargetHit(target, attackDistance)) {
            const hitDistance = this.GetTargetDistance(target)
            console.log("[CombatDebug] AttackCanceled", {
                actor: "dash_monster",
                reason: "validator_failed",
                actorId: this.zombie.UUID,
                targetId: expectedTargetId,
                currentTargetId,
                actorPos: {
                    x: this.zombie.Pos.x,
                    y: this.zombie.Pos.y,
                    z: this.zombie.Pos.z,
                },
                targetPos: {
                    x: target.Pos.x,
                    y: target.Pos.y,
                    z: target.Pos.z,
                },
                distance: hitDistance,
                attackRange: attackDistance,
                validation: hitDistance > attackDistance
                    ? MeleeValidationResult.OutOfRange
                    : MeleeValidationResult.InvalidTarget,
                boundsEmpty: target.Box.isEmpty(),
            })
            return
        }

        this.eventCtrl.SendEventMessage(EventTypes.Attack + expectedTargetId, [{
            type: AttackType.NormalSwing,
            spec: this.spec,
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
            targetId: expectedTargetId,
            distance: attackDistance,
            attackerObjectId: this.zombie.UUID,
            obj: this.zombie.Meshs
        }])
    }
}

export class DashRunState extends MonState implements IActorState {
    speed = this.spec.Speed
    constructor(states: States, zombie: Zombie, gphysic: IGPhysic, spec: BaseSpec) {
        super(states, zombie, gphysic, spec)
    }
    Init(): void {
        this.zombie.ChangeAction(ActionType.Run)
    }
    Uninit(): void {
        
    }

    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()
    dir = new THREE.Vector3()

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        if (v.x == 0 && v.z == 0) {
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }
        v.y = 0

        const lookDir = v.clone();
        lookDir.y = 0;
        if (lookDir.lengthSq() > 0) {
            const mx = this.MX.lookAt(lookDir, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.zombie.Meshs.quaternion.copy(qt)
        }

        const dist = this.zombie.Pos.distanceTo(target.Pos)
        if(dist < 15) {
            this.states.DashRunSt.Init(v)
            return this.states.DashRunSt
        }

        // ✅ 이동 처리
        const dis = this.gphysic.CheckDirection(this.zombie, this.dir.copy(v), this.speed);
        const moveAmount = v.clone().multiplyScalar(delta * this.speed);
        const moveDis = moveAmount.length();
        // console.log(moveDis, " / ", dis.distance, " / ", dis.move)

        if (dis.move) {
            this.zombie.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed));
        } else {
            this.zombie.Pos.add(moveAmount);
        }
        return this
    }
}
export class DashAgonizingState extends MonState implements IActorState {
    runningTime = 5
    elapsedTime = 0
    buf = new Buff(buffDefs.StunStar)
    constructor(
        private id: number, state: States, zombie: Zombie, 
        gphysic: IGPhysic, private eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(state, zombie, gphysic, spec)
    }
    Init(): void {
        this.elapsedTime = 0
        this.zombie.ChangeAction(ActionType.MonAgonizing)
        this.eventCtrl.SendEventMessage(EventTypes.UpdateBuff + "mon" + this.id, this.buf)
    }
    Uninit(): void {
        this.eventCtrl.SendEventMessage(EventTypes.RemoveBuff + "mon" + this.id, this.buf)
    }
    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        this.elapsedTime += delta
        if(this.elapsedTime > this.runningTime) {
            this.Uninit()
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        return this
    }
}
export class FastDashRunState extends MonState implements IActorState {
    speed = this.spec.Speed
    runningTime = 5
    elapsedTime = 0
    v = new THREE.Vector3()
    constructor(states: States, zombie: Zombie, gphysic: IGPhysic, spec: BaseSpec) {
        super(states, zombie, gphysic, spec)
    }
    Init(v: THREE.Vector3): void {
        this.v.copy(v)
        this.elapsedTime = 0
        this.zombie.ChangeAction(ActionType.MonRunningCrawl)
    }
    Uninit(): void {
        
    }

    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()
    dir = new THREE.Vector3()

    Update(delta: number, _: THREE.Vector3, target: IPhysicsObject): IActorState {
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const dist = this.GetTargetDistance(target)
        const checkAttack = this.CheckAttack(dist)
        if(checkAttack != undefined) return checkAttack

        this.elapsedTime += delta
        if(this.elapsedTime > this.runningTime) {
            this.states.AgonizingSt.Init()
            return this.states.AgonizingSt
        }

        // ✅ 이동 처리
        const dis = this.gphysic.CheckDirection(this.zombie, this.dir.copy(this.v), this.speed);
        const moveAmount = this.v.clone().multiplyScalar(delta * this.speed * 10);

        if (dis.move) {
            this.zombie.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed * 10));
        } else {
            this.zombie.Pos.add(moveAmount);
        }
        return this
    }
}
