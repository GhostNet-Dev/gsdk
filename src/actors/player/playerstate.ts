import * as THREE from "three";
import { ActionType, Player } from "./player"
import { PlayerCtrl } from "./playerctrl";
import { KeyType } from "../../event/keycommand";
import { GPhysics } from "../../common/physics/gphysics";
import { AppMode } from "../../app";

export interface IPlayerAction {
    Init(): void
    Uninit(): void
    Update(delta: number, v: THREE.Vector3): IPlayerAction
}

export class State {
    constructor(
        protected playerCtrl: PlayerCtrl,
        protected player: Player,
        protected gphysic: GPhysics
    ) { }

    DefaultCheck(): IPlayerAction | undefined {
        const checkRun = this.CheckRun()
        if (checkRun != undefined) return checkRun

        const checkAtt = this.CheckAttack()
        if (checkAtt != undefined) return checkAtt

        const checkJump = this.CheckJump()
        if (checkJump != undefined) return checkJump

        const checkMagic = this.CheckMagic()
        if (checkMagic != undefined) return checkMagic

        const checkMagic2 = this.CheckMagic2()
        if (checkMagic2 != undefined) return checkMagic2
    }

    CheckRun() {
        if (this.playerCtrl.moveDirection.x || this.playerCtrl.moveDirection.z) {
            this.playerCtrl.RunSt.Init()
            return this.playerCtrl.RunSt
        }
    }
    CheckAttack() {
        if (this.playerCtrl.KeyState[KeyType.Action1]) {
            if (this.playerCtrl.mode == AppMode.Play) {
                this.playerCtrl.AttackSt.Init()
                return this.playerCtrl.AttackSt
            } else if(this.playerCtrl.mode == AppMode.Weapon) {
                this.playerCtrl.DeckSt.Init()
                return this.playerCtrl.DeckSt
            } else {
                this.playerCtrl.PlantASt.Init()
                return this.playerCtrl.PlantASt
            } 
        }
    }
    CheckMagic() {
        if (this.playerCtrl.KeyState[KeyType.Action2]) {
            if (this.playerCtrl.mode == AppMode.Play) {
                this.playerCtrl.MagicH1St.Init()
                return this.playerCtrl.MagicH1St
            } else {
                this.playerCtrl.WarteringSt.Init()
                return this.playerCtrl.WarteringSt
            }
        }
    }
    CheckMagic2(): IPlayerAction | undefined {
        if (this.playerCtrl.KeyState[KeyType.Action3]) {
            if (this.playerCtrl.mode == AppMode.Play) {
                this.playerCtrl.MagicH2St.Init()
                return this.playerCtrl.MagicH2St
            } else {
                this.playerCtrl.PickFruitTreeSt.Init()
                return this.playerCtrl.PickFruitTreeSt
            }
        }
    }
    CheckJump() {
        if (this.playerCtrl.KeyState[KeyType.Action0]) {
            this.playerCtrl.JumpSt.Init()
            return this.playerCtrl.JumpSt
        }
    }
    CheckGravity() {
        this.player.Meshs.position.y -= 0.3
        if (!this.gphysic.Check(this.player)) {
            this.player.Meshs.position.y += 0.3
            this.playerCtrl.JumpSt.Init()
            this.playerCtrl.JumpSt.velocity_y = 0
            console.log("going down!")
            return this.playerCtrl.JumpSt
        }
        this.player.Meshs.position.y += 0.3
    }
}

export class MagicH2State extends State implements IPlayerAction {
    keytimeout?:NodeJS.Timeout
    next: IPlayerAction = this

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: GPhysics) {
        super(playerPhy, player, gphysic)
    }
    Init(): void {
        console.log("Magic2!!")
        const duration = this.player.ChangeAction(ActionType.MagicH2) ?? 2
        this.next = this
        this.keytimeout = setTimeout(() => {
            this.Uninit()
            this.playerCtrl.AttackIdleSt.Init()
            this.next = this.playerCtrl.AttackIdleSt
        }, duration * 1000)
        this.playerCtrl.RunSt.PreviousState(this.playerCtrl.AttackIdleSt)
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if(d != undefined) {
            this.Uninit()
            return d
        }

        return this.next
    }
}
export class MagicH1State extends State implements IPlayerAction {
    keytimeout?:NodeJS.Timeout
    next: IPlayerAction = this

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: GPhysics) {
        super(playerPhy, player, gphysic)
    }
    Init(): void {
        console.log("Magic!!")
        const duration = this.player.ChangeAction(ActionType.MagicH1) ?? 2
        this.next = this
        this.keytimeout = setTimeout(() => {
            this.Uninit()
            this.playerCtrl.AttackIdleSt.Init()
            this.next = this.playerCtrl.AttackIdleSt
        }, duration * 1000)
        this.playerCtrl.RunSt.PreviousState(this.playerCtrl.AttackIdleSt)
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) {
            this.Uninit()
            return d
        }

        return this.next
    }
}

export class DeadState extends State implements IPlayerAction {
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: GPhysics) {
        super(playerPhy, player, gphysic)
        //this.Init()
    }
    Init(): void {
        this.player.ChangeAction(ActionType.Dying)
    }
    Uninit(): void {
        
    }
    Update(): IPlayerAction {
        return this
    }
}
export class IdleState extends State implements IPlayerAction {
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: GPhysics) {
        super(playerPhy, player, gphysic)
        this.Init()
    }
    Init(): void {
        this.player.ChangeAction(ActionType.Idle)
        this.playerCtrl.RunSt.PreviousState(this)
    }
    Uninit(): void {
        
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if(d != undefined) return d

        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        return this
    }
}
export class RunState extends State implements IPlayerAction {
    speed = 10
    previous: IPlayerAction = this.playerCtrl.IdleSt
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: GPhysics) {
        super(playerPhy, player, gphysic)
    }
    Init(): void {
        this.player.ChangeAction(ActionType.Run)
    }
    Uninit(): void { }

    PreviousState(state: IPlayerAction) {
        this.previous = state
    }

    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    Update(delta: number, v: THREE.Vector3): IPlayerAction {
        const checkAtt = this.CheckAttack()
        if (checkAtt != undefined) return checkAtt

        const checkJump = this.CheckJump()
        if (checkJump != undefined) return checkJump

        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        if (v.x == 0 && v.z == 0) {
            this.previous.Init()
            return this.previous
        }
        v.y = 0

        const movX = v.x * delta * this.speed
        const movZ = v.z * delta * this.speed
        this.player.Meshs.position.x += movX
        this.player.Meshs.position.z += movZ

        const mx = this.MX.lookAt(v, this.ZeroV, this.YV)
        const qt = this.QT.setFromRotationMatrix(mx)
        this.player.Meshs.quaternion.copy(qt)

        if (this.gphysic.Check(this.player)) {
            this.player.Meshs.position.y += 1 // 계단 체크
            if (this.gphysic.Check(this.player)) {
                this.player.Meshs.position.x -= movX
                this.player.Meshs.position.z -= movZ
                this.player.Meshs.position.y -= 1
            }
        }
        return this
    }
}
export class JumpState implements IPlayerAction {
    speed = 10
    velocity_y = 16
    dirV = new THREE.Vector3(0, 0, 0)
    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()

    constructor(private playerCtrl: PlayerCtrl, private player: Player, private gphysic: GPhysics) { }
    Init(): void {
        console.log("Jump Init!!")
        this.player.ChangeAction(ActionType.Jump)
        this.velocity_y = 16
        this.playerCtrl.RunSt.PreviousState(this.playerCtrl.IdleSt)
    }
    Uninit(): void {
        this.velocity_y = 16
    }
    Update(delta: number, v: THREE.Vector3): IPlayerAction {
        const movX = v.x * delta * this.speed
        const movZ = v.z * delta * this.speed
        const movY = this.velocity_y * delta

        this.player.Meshs.position.x += movX
        this.player.Meshs.position.z += movZ

        if (movX || movZ) {
            this.dirV.copy(v)
            this.dirV.y = 0
            const mx = this.MX.lookAt(this.dirV, this.ZeroV, this.YV)
            const qt = this.QT.setFromRotationMatrix(mx)
            this.player.Meshs.quaternion.copy(qt)
        }

        if (this.gphysic.Check(this.player)) {
            this.player.Meshs.position.x -= movX
            this.player.Meshs.position.z -= movZ
        }

        this.player.Meshs.position.y += movY

        if (this.gphysic.Check(this.player)) {
            this.player.Meshs.position.y -= movY

            this.Uninit()
            this.playerCtrl.IdleSt.Init()
            return this.playerCtrl.IdleSt
        }
        this.velocity_y -= 9.8 * 3 *delta

        return this
    }
}