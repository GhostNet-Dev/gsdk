import * as THREE from "three";
import { Zombie } from "../zombie"
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { ActionType, AttackType } from "@Glibs/types/playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { IMonsterAction } from "../monstertypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { DyingZState, IdleZState, JumpZState, MonState } from "./monstate";

type States = Record<string, IMonsterAction>
const defSt: States = {}

export function NewDashMonsterState(
    zombie: Zombie, 
    gphysic: IGPhysic,  
    eventCtrl: IEventController, 
    spec: BaseSpec): IMonsterAction 
{ 
    defSt["IdleSt"] = new IdleZState(defSt, zombie, gphysic, spec)
    defSt["AttackSt"] = new DashAttackState(defSt, zombie, gphysic, eventCtrl, spec)
    defSt["JumpSt"] = new JumpZState(defSt, zombie, gphysic)
    defSt["RunSt"] = new DashRunState(defSt, zombie, gphysic, spec)
    defSt["DyingSt"] = new DyingZState(defSt, zombie, gphysic, eventCtrl, spec)

    return defSt.IdleSt
}

export class DashAttackState extends MonState implements IMonsterAction {
    keytimeout?:NodeJS.Timeout
    attackProcess = false
    attackTime = 0
    attackSpeed = this.spec.AttackSpeed
    attackDamageMax = this.spec.AttackDamageMax
    attackDamageMin = this.spec.AttackDamageMin

    constructor(states: States, zombie: Zombie, gphysic: IGPhysic,
        private eventCtrl: IEventController, spec: BaseSpec
    ) {
        super(states, zombie, gphysic, spec)
    }
    Init(): void {
        this.attackSpeed = this.spec.AttackSpeed
        this.attackDamageMax = this.spec.AttackDamageMax
        this.attackDamageMin = this.spec.AttackDamageMin
        const duration = this.zombie.ChangeAction(ActionType.Punch)
        if (duration != undefined) this.attackSpeed = duration * 0.8
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }
    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IMonsterAction {
        const dist = this.zombie.Pos.distanceTo(target.Pos)
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying
        if (dist > this.attackDist) {
            const checkRun = this.CheckRun(v)
            if (checkRun != undefined) return checkRun
        }
        if(this.attackProcess) return this
        this.attackTime += delta
        if (this.attackTime / this.attackSpeed < 1) {
            return this
        }
        this.attackTime -= this.attackSpeed
        this.attackProcess = true

        this.keytimeout = setTimeout(() => {
            this.attack()
        }, this.attackSpeed * 1000 * 0.4)

        return this
    }
    attack() {
        this.eventCtrl.SendEventMessage(EventTypes.Attack + "player", [{
            type: AttackType.NormalSwing,
            spec: [this.spec],
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
            obj: this.zombie.Meshs
        }])

        this.attackProcess = false
    }
}

export class DashRunState extends MonState implements IMonsterAction {
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

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IMonsterAction {
        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        const dist = this.zombie.Pos.distanceTo(target.Pos)
        const checkAttack = this.CheckAttack(dist)
        if(checkAttack != undefined) return checkAttack

        if (v.x == 0 && v.z == 0) {
            this.states.IdleSt.Init()
            return this.states.IdleSt
        }
        v.y = 0

        const mx = this.MX.lookAt(v, this.ZeroV, this.YV)
        const qt = this.QT.setFromRotationMatrix(mx)
        this.zombie.Meshs.quaternion.copy(qt)

        // ✅ 이동 처리
        const dis = this.gphysic.CheckDirection(this.zombie, this.dir.copy(v));
        const moveAmount = v.clone().multiplyScalar(delta * this.speed);

        if (dis.move) {
            this.zombie.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed));
        } else {
            this.zombie.Pos.add(moveAmount);
        }
        return this
    }
}

