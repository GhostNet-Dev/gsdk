import * as THREE from "three";
import { Zombie } from "../zombie"
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { ActionType, AttackType } from "@Glibs/types/playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { IMonsterAction } from "../monstertypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";

type States = Record<string, IMonsterAction>

export function NewDefaultMonsterState(
    id: number,
    zombie: Zombie, 
    gphysic: IGPhysic,  
    eventCtrl: IEventController, 
    spec: BaseSpec): IMonsterAction 
{ 
    const defSt: States = {}
    defSt["IdleSt"] = new IdleZState(defSt, zombie, gphysic, spec)
    defSt["AttackSt"] = new AttackZState(defSt, zombie, gphysic, eventCtrl, spec)
    defSt["JumpSt"] = new JumpZState(defSt, zombie, gphysic)
    defSt["RunSt"] = new RunZState(defSt, zombie, gphysic, spec)
    defSt["DyingSt"] = new DyingZState(defSt, zombie, gphysic, eventCtrl, spec)

    return defSt.IdleSt
}

export abstract class MonState {
    attackDist = 3
    constructor(
        protected states: States,
        protected zombie: Zombie,
        protected gphysic: IGPhysic,
        protected spec: BaseSpec
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
        this.zombie.Meshs.position.y -= 0.5
        if (!this.gphysic.Check(this.zombie)) {
            this.zombie.Meshs.position.y += 0.5
            this.Uninit()
            this.states.JumpSt.Init(0);
            return this.states.JumpSt
        }
        this.zombie.Meshs.position.y += 0.5
    }
    CheckDying() {
        if (this.spec.Health <= 0) {
            this.Uninit()
            this.states.DyingSt.Init()
            return this.states.DyingSt
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
export class JumpZState implements IMonsterAction {
    speed = 10
    velocity_y = 16
    dirV = new THREE.Vector3(0, 0, 0)
    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    constructor(private ctrl: States, private zombie: Zombie, private gphysic: IGPhysic) { }
    Init(y?: number): void {
        console.log("Jump Init!!")
        this.velocity_y = y ?? 16
    }
    Uninit(): void {
        this.velocity_y = 16
    }
    Update(delta: number, v: THREE.Vector3): IMonsterAction {
        const movX = v.x * delta * this.speed
        const movZ = v.z * delta * this.speed
        const movY = this.velocity_y * delta

        this.zombie.Meshs.position.x += movX
        this.zombie.Meshs.position.z += movZ

        if (movX || movZ) {
            this.dirV.copy(v)
            this.dirV.y = 0
            const mx = this.MX.lookAt(this.dirV, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.zombie.Meshs.quaternion.copy(qt)
        }

        if (this.gphysic.Check(this.zombie)) {
            this.zombie.Meshs.position.x -= movX
            this.zombie.Meshs.position.z -= movZ
        }

        this.zombie.Meshs.position.y += movY

        if (this.gphysic.Check(this.zombie)) {
            this.zombie.Meshs.position.y -= movY

            this.Uninit()
            this.ctrl.IdleSt.Init()
            return this.ctrl.IdleSt
        }
        this.velocity_y -= 9.8 * 3 *delta

        return this
    }
}
export class AttackZState extends MonState implements IMonsterAction {
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

    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IMonsterAction {
        const dist = this.zombie.Pos.distanceTo(target.Pos)
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying
        if (dist > this.attackDist) {
            const checkRun = this.CheckRun(v)
            if (checkRun != undefined) return checkRun
        }

        const mx = this.MX.lookAt(v, this.ZeroV, this.YV)
        const qt = this.QT.setFromRotationMatrix(mx)
        this.zombie.Meshs.quaternion.copy(qt)


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

export class IdleZState extends MonState implements IMonsterAction {
    constructor(state: States, zombie: Zombie, gphysic: IGPhysic, spec: BaseSpec) {
        super(state, zombie, gphysic, spec)
        this.Init()
    }
    Init(): void {
        this.zombie.ChangeAction(ActionType.Idle)
    }
    Uninit(): void {
        
    }
    Update(_delta: number, v: THREE.Vector3): IMonsterAction {
        const checkRun = this.CheckRun(v)
        if (checkRun != undefined) return checkRun
        const checkDying = this.CheckDying()
        if (checkDying != undefined) return checkDying

        return this
    }
}
export class DyingZState extends MonState implements IMonsterAction {
    fadeMode = false
    fade = 1
    constructor(states: States, zombie: Zombie, gphysic: IGPhysic, private eventCtrl: IEventController, spec: BaseSpec) {
        super(states, zombie, gphysic, spec)
    }
    Init(): void {
        this.zombie.ChangeAction(ActionType.Dying)

        this.eventCtrl.SendEventMessage(EventTypes.Attack + "player", [{
            type: AttackType.Exp,
            damage: this.spec.stats.getStat("expBonus"),
        }])
    }
    Uninit(): void {
    }
    Update(delta: number): IMonsterAction {
        return this
    }
}
export class RunZState extends MonState implements IMonsterAction {
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

        // const movX = v.x * delta * this.speed
        // const movZ = v.z * delta * this.speed
        // this.zombie.Meshs.position.x += movX
        // this.zombie.Meshs.position.z += movZ

        const mx = this.MX.lookAt(v, this.ZeroV, this.YV)
        const qt = this.QT.setFromRotationMatrix(mx)
        this.zombie.Meshs.quaternion.copy(qt)

        // ✅ 이동 처리
        const dis = this.gphysic.CheckDirection(this.zombie, this.dir.copy(v));
        const moveAmount = v.clone().multiplyScalar(delta * this.speed);
        const moveDis = moveAmount.length();
        // console.log(moveDis, " / ", dis.distance, " / ", dis.move)

        if (dis.move) {
            this.zombie.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed));
        } else {
            this.zombie.Pos.add(moveAmount);
        }
        // if (moveDis < dis.distance) {
        //     this.zombie.Pos.add(moveAmount);
        // } else if (dis.move) {
        //     this.zombie.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed));
        // }

        // if (this.gphysic.Check(this.zombie)){
        //     this.zombie.Pos.y += 1 // 계단 체크 
        //     if (this.gphysic.Check(this.zombie)) {
        //         this.zombie.Pos.x -= movX
        //         this.zombie.Pos.z -= movZ
        //         this.zombie.Pos.y -= 1
        //     }
        // }
        return this
    }
}
