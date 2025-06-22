import * as THREE from "three";
import { Fly } from "./fly"
import { FlyCtrl } from "./flyctrl"
import { IMonsterAction } from "@Glibs/interface/imonsters";
import { MonsterId, MonsterProperty } from "@Glibs/types/monstertypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { ActionType } from "@Glibs/types/playertypes";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";


class State {
    protectDist = 5
    constructor(
        protected fCtrl: FlyCtrl,
        protected fly: Fly,
        protected gphysic: IGPhysic
    ) { }

    CheckRun(v: THREE.Vector3) {
        if (v.x || v.z) {
            this.fCtrl.RunSt.Init()
            return this.fCtrl.RunSt
        }
    }
}


export class IdleFState extends State implements IMonsterAction {
    raycast = new THREE.Raycaster()
    attackDir = new THREE.Vector3()
    attackDist = 5
    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()
    dir = new THREE.Vector3(0, 0, 0)
    time = 0
    watching = 2
    speed = 1

    constructor(zCtrl: FlyCtrl, zombie: Fly, private targetList: THREE.Object3D[], gphysic: IGPhysic) {
        super(zCtrl, zombie, gphysic)
        this.Init()
    }
    Init(): void {
        console.log("helper: Idle Init!!")
        this.fly.ChangeAction(ActionType.Idle)
        this.time = 0
    }
    Uninit(): void {
        
    }
    Update(delta: number, v: THREE.Vector3, dist: number): IMonsterAction {
        if(dist > this.protectDist) {
            const checkRun = this.CheckRun(v)
            if (checkRun != undefined) return checkRun
        }
        const attack = this.checkAttack()
        if (attack) return attack

        this.time += delta

        if (this.time > this.watching) {
            this.time = 0

            this.dir.x = THREE.MathUtils.randFloat(0, 1)
            this.dir.y = v.y
            this.dir.z = THREE.MathUtils.randFloat(0, 1)
        }
        if (dist > this.protectDist - 0.3) {
            this.time = 0
            this.dir.copy(v.multiplyScalar(1 / dist))
        }

        this.fly.Meshs.position.x += this.dir.x * delta * this.speed
        this.fly.Meshs.position.y += this.dir.y * delta * this.speed
        this.fly.Meshs.position.z += this.dir.z * delta * this.speed

        this.dir.y = 0
        const mx = this.MX.lookAt(this.dir, this.ZeroV, this.YV)
        const qt = this.QT.setFromRotationMatrix(mx)
        this.fly.Meshs.quaternion.copy(qt)
        return this
    }

    checkAttack() {
        this.fly.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.fly.Pos, this.attackDir.normalize())
    
        const intersects = this.raycast.intersectObjects(this.targetList)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            this.fCtrl.AttackSt.InitWithTarget(intersects[0].object as THREE.Mesh)
            return this.fCtrl.AttackSt
        }
    }
}
export class AttackFState extends State implements IMonsterAction {
    dirV = new THREE.Vector3(0, 0, 0)
    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()
    playDist = 20
    attackDist = 5
    attackDir = new THREE.Vector3()
    startPos = new THREE.Vector3()
    targetPos = new THREE.Vector3()
    keytimeout?:NodeJS.Timeout
    attackProcess = false
    attackTime = 0
    attackSpeed = this.spec.AttackSpeed
    speed = this.spec.Speed
    target?: THREE.Mesh

    constructor(
        zCtrl: FlyCtrl, 
        protected fly: Fly, 
        gphysic: IGPhysic, 
        private targetList: THREE.Object3D[],
        private eventCtrl: IEventController,
        private property: MonsterProperty,
        private spec: BaseSpec
    ) {
        super(zCtrl, fly, gphysic)
    }
    Init(): void {
        console.log("helper: Attack Init!!")
        const duration = this.fly.ChangeAction(ActionType.Punch)
        if (duration != undefined) this.attackSpeed = duration * 0.8
        this.attackTime = this.attackSpeed
        this.attackProcess = false
    }
    InitWithTarget(target: THREE.Mesh) {
        this.target = target
        this.Init()
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }
    Update(delta: number, v: THREE.Vector3, dist: number): IMonsterAction {
        if (dist > this.playDist) {
            const checkRun = this.CheckRun(v)
            if (checkRun != undefined) return checkRun
        }
        this.approach(delta)

        if(this.attackProcess) return this
        this.attackTime += delta
        if (this.attackTime / this.attackSpeed < 1) {
            return this
        }
        this.attackTime -= this.attackSpeed
        this.attackProcess = true
        if (!this.targetList.find(e => e == this.target)) {
            this.fCtrl.RunSt.Init()
            return this.fCtrl.RunSt
        }
        this.keytimeout = setTimeout(() => {
            this.attack()
        }, this.attackSpeed * 1000 * 0.4)

        return this
    }
    approach(delta: number) {
        if (!this.target) return
        this.attackDir.subVectors(this.target.position, this.fly.Pos)
        this.attackDir = this.attackDir.normalize()
        const dist = this.target.position.distanceTo(this.fly.Pos)
        if(dist > this.attackDist) {
            this.fly.Meshs.position.x += this.attackDir.x * delta * this.speed
            //this.fly.Meshs.position.y += this.attackDir.y * delta * this.speed
            this.fly.Meshs.position.z += this.attackDir.z * delta * this.speed
        }
    
        this.attackDir.y = 0
        const mx = this.MX.lookAt(this.attackDir, this.ZeroV, this.YV)
        const qt = this.QT.setFromRotationMatrix(mx)
        this.fly.Meshs.quaternion.copy(qt)
    }
    attack() {
        this.attackProcess = false

        if (!this.target) return
        this.startPos.copy(this.fly.Pos)
        this.startPos.y = this.fly.Asset.Info?.calY ?? this.fly.Pos.y
        this.targetPos.copy(this.target.position)
        this.targetPos.y += 2
        this.attackDir = this.attackDir.subVectors(this.targetPos, this.startPos).normalize()
        this.eventCtrl.SendEventMessage(EventTypes.Projectile, {
            id: MonsterId.DefaultBall, 
            ownerSpec: this.spec,
            damage: this.spec.Damage,
            src: this.startPos, 
            dir: this.attackDir
        })
    }
}

export class DyingFState extends State implements IMonsterAction {
    fadeMode = false
    fade = 1
    constructor(zCtrl: FlyCtrl, zombie: Fly, gphysic: IGPhysic) {
        super(zCtrl, zombie, gphysic)
    }
    Init(): void {
        this.fadeMode = (this.fly.dyingClip == undefined)
        this.fade = 1
        if (this.fadeMode) this.fly.StopAnimation()
        else this.fly.ChangeAction(ActionType.Dying)
    }
    Uninit(): void {
        
    }
    Update(): IMonsterAction {
        return this
    }
}
export class RunFState extends State implements IMonsterAction {
    speed = this.spec.Speed
    constructor(fCtrl: FlyCtrl, fly: Fly, gphysic: IGPhysic, private property: MonsterProperty, private spec: BaseSpec) {
        super(fCtrl, fly, gphysic)
    }
    Init(): void {
        this.fly.ChangeAction(ActionType.Run)
    }
    Uninit(): void {
        
    }

    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    Update(delta: number, v: THREE.Vector3, dist: number): IMonsterAction {

        if(dist < this.protectDist) {
            this.fCtrl.IdleSt.Init()
            return this.fCtrl.IdleSt
        }
        

        const movX = v.x * delta * this.speed
        const movY = v.y * delta * this.speed
        const movZ = v.z * delta * this.speed
        this.fly.Meshs.position.x += movX
        this.fly.Meshs.position.y += movY
        this.fly.Meshs.position.z += movZ

        v.y = 0
        const mx = this.MX.lookAt(v, this.ZeroV, this.YV)
        const qt = this.QT.setFromRotationMatrix(mx)
        this.fly.Meshs.quaternion.copy(qt)

        /*
        if (this.gphysic.Check(this.fly)){
            this.fly.Meshs.position.x -= movX
            this.fly.Meshs.position.z -= movZ
        }
        */
        return this
    }
}
