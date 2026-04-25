import * as THREE from "three";
import { Zombie } from "../zombie"
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { ActionType, AttackType } from "@Glibs/types/playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
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

    constructor(states: States, zombie: Zombie, gphysic: IGPhysic,
        private eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(states, zombie, gphysic, spec)
    }
    Init(): void {
        this.attackTime = this.spec.AttackSpeed
        this.attackSpeed = this.spec.AttackSpeed
        this.attackDamageMax = this.spec.AttackDamageMax
        this.attackDamageMin = this.spec.AttackDamageMin
        this.attackTime = this.attackSpeed
        this.hitDelay = this.attackSpeed * 0.1
        this.zombie.ChangeAction(ActionType.MonBiteNeck, this.attackSpeed)
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }
    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IActorState {
        this.targetId = GetMonsterAttackTargetId(target)
        const checkHit = this.CheckHit(target)
        if (checkHit != undefined) return checkHit
        const dist = this.zombie.Pos.distanceTo(target.CenterPos)
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying
        if (dist > this.attackDist) {
            const checkRun = this.CheckRun(v)
            if (checkRun != undefined) return checkRun
        }
        this.attackTime += delta

        if( this.isAttacking) {
            this.hitDelay -= delta
            if(this.hitDelay <= 0) {
                this.attack()
                this.isAttacking = false
            }
            return this
        }

        if (this.attackTime < this.attackSpeed) {
            return this
        }
        this.attackTime -= this.attackSpeed

        this.isAttacking = true
        this.hitDelay = this.attackSpeed * 0.1
        this.zombie.ChangeAction(ActionType.MonBiteNeck, this.attackSpeed)
        return this
    }
    attack() {
        this.eventCtrl.SendEventMessage(EventTypes.Attack + this.targetId, [{
            type: AttackType.NormalSwing,
            spec: [this.spec],
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
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
        const dist = this.zombie.Pos.distanceTo(target.CenterPos)
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
