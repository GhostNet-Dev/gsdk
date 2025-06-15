import * as THREE from "three";
import { Zombie } from "./zombie"
import { MonsterCtrl } from "./monctrl";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IEventController from "@Glibs/interface/ievent";
import { MonsterProperty } from "../monstertypes";
import { ActionType, AttackType } from "@Glibs/types/playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { IMonsterAction } from "../imonsters";

class State {
    attackDist = 3
    constructor(
        protected zCtrl: MonsterCtrl,
        protected zombie: Zombie,
        protected gphysic: IGPhysic
    ) { }

    CheckRun(v: THREE.Vector3) {
        if (v.x || v.z) {
            this.zCtrl.RunSt.Init()
            return this.zCtrl.RunSt
        }
    }
    CheckGravity() {
        this.zombie.Meshs.position.y -= 0.5
        if (!this.gphysic.Check(this.zombie)) {
            this.zombie.Meshs.position.y += 0.5
            this.zCtrl.JumpSt.Init()
            this.zCtrl.JumpSt.velocity_y = 0
            return this.zCtrl.JumpSt
        }
        this.zombie.Meshs.position.y += 0.5
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

    constructor(private ctrl: MonsterCtrl, private zombie: Zombie, private gphysic: IGPhysic) { }
    Init(): void {
        console.log("Jump Init!!")
        this.velocity_y = 16
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
export class AttackZState extends State implements IMonsterAction {
    keytimeout?:NodeJS.Timeout
    attackSpeed = this.property.attackSpeed
    attackProcess = false
    attackTime = 0
    attackDamageMax = this.property.damageMax
    attackDamageMin = this.property.damageMin

    constructor(zCtrl: MonsterCtrl, zombie: Zombie, gphysic: IGPhysic,
        private eventCtrl: IEventController, private property: MonsterProperty
    ) {
        super(zCtrl, zombie, gphysic)
    }
    Init(): void {
        const duration = this.zombie.ChangeAction(ActionType.Punch)
        if (duration != undefined) this.attackSpeed = duration * 0.8
        this.attackTime = this.attackSpeed
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }
    Update(delta: number, v: THREE.Vector3, dist: number): IMonsterAction {
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
            damage: THREE.MathUtils.randInt(this.attackDamageMin, this.attackDamageMax),
        }])

        this.attackProcess = false
    }
}

export class IdleZState extends State implements IMonsterAction {
    constructor(zCtrl: MonsterCtrl, zombie: Zombie, gphysic: IGPhysic) {
        super(zCtrl, zombie, gphysic)
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

        return this
    }
}
export class DyingZState extends State implements IMonsterAction {
    fadeMode = false
    fade = 1
    constructor(zCtrl: MonsterCtrl, zombie: Zombie, gphysic: IGPhysic, private eventCtrl: IEventController) {
        super(zCtrl, zombie, gphysic)
    }
    Init(): void {
        this.fadeMode = (this.zombie.dyingClip == undefined)
        this.fade = 1
        if (this.fadeMode) this.zombie.StopAnimation()
        else this.zombie.ChangeAction(ActionType.Dying)

        this.eventCtrl.SendEventMessage(EventTypes.Attack + "player", [{
            type: AttackType.Exp,
            damage: 20,
        }])
    }
    Uninit(): void {
        
    }
    Update(delta: number): IMonsterAction {
        if(this.fadeMode) {
            this.fade -= delta
            if (this.fade < 0) this.fade = 0
            this.zombie.SetOpacity(this.fade)
        }
        return this
    }
}
export class RunZState extends State implements IMonsterAction {
    speed = this.property.speed
    constructor(zCtrl: MonsterCtrl, zombie: Zombie, gphysic: IGPhysic, private property: MonsterProperty) {
        super(zCtrl, zombie, gphysic)
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

    Update(delta: number, v: THREE.Vector3, dist: number): IMonsterAction {
        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        if(dist < this.attackDist) {
            this.zCtrl.AttackSt.Init()
            return this.zCtrl.AttackSt
        }
        if (v.x == 0 && v.z == 0) {
            this.zCtrl.IdleSt.Init()
            return this.zCtrl.IdleSt
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
        const dis = this.gphysic.CheckDirection(this.zombie, v);
        const moveAmount = v.clone().multiplyScalar(delta * this.speed);
        const moveDis = moveAmount.length();

        if (moveDis < dis.distance) {
            this.zombie.Pos.add(moveAmount);
        } else if (dis.move) {
            this.zombie.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed));
        }

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
