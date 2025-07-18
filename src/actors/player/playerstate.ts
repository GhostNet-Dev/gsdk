import * as THREE from "three";
import { PlayerCtrl } from "./playerctrl";
import { Player } from "./player";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { KeyType } from "@Glibs/types/eventtypes";
import { AppMode, EventTypes } from "@Glibs/types/globaltypes";
import { ActionType } from "./playertypes";
import { Bind } from "@Glibs/types/assettypes";
import IEventController from "@Glibs/interface/ievent";

export interface IPlayerAction {
    Init(): void
    Uninit(): void
    Update(delta: number, v: THREE.Vector3): IPlayerAction
}

export class State {
    constructor(
        protected playerCtrl: PlayerCtrl,
        protected player: Player,
        protected gphysic: IGPhysic
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
        const distance = this.gphysic.CheckDown(this.player)
        if (distance > 1) {
            this.playerCtrl.JumpSt.Init()
            this.playerCtrl.JumpSt.velocity_y = 0
            console.log("raycast going down! : ", distance)
            return this.playerCtrl.JumpSt
        } else {
            this.player.Pos.y += -distance
        } 
    }
    CheckEnermyInRange() {
        const attackRange = this.playerCtrl.baseSpec.stats.getStat("attackRange")
        for (const v of this.playerCtrl.targets) {
            const dis = this.player.Pos.distanceTo(v.position)
            if(attackRange > dis) {
                this.playerCtrl.AttackSt.Init()
                return this.playerCtrl.AttackSt
            }
        }
    }
}

export class MagicH2State extends State implements IPlayerAction {
    keytimeout?:NodeJS.Timeout
    next: IPlayerAction = this

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic) {
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

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic) {
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
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic) {
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
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic) {
        super(playerPhy, player, gphysic)
        this.Init()
    }
    Init(): void {
        this.player.ChangeAction(ActionType.Idle)
        this.playerCtrl.RunSt.PreviousState(this)
        console.log("Idle!!")
    }
    Uninit(): void {
        
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if(d != undefined) return d

        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        const checkEnermy = this.CheckEnermyInRange()
        if (checkEnermy != undefined) return checkEnermy

        return this
    }
}
export class RunState extends State implements IPlayerAction {
    speed = 7
    previous: IPlayerAction = this.playerCtrl.IdleSt
    constructor(
        playerPhy: PlayerCtrl, 
        player: Player, 
        private camera: THREE.Camera, 
        gphysic: IGPhysic, 
        private eventCtrl: IEventController
    ) {
        super(playerPhy, player, gphysic)
    }
    Init(): void {
        this.player.ChangeAction(ActionType.Run)
    }
    Uninit(): void { }
    CheckInteraction() {
        this.eventCtrl.SendEventMessage(EventTypes.CheckInteraction, this.player)
    }

    PreviousState(state: IPlayerAction) {
        this.previous = state
    }

    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()
    dir = new THREE.Vector3()

    Update(delta: number, v: THREE.Vector3): IPlayerAction {
        const checkAtt = this.CheckAttack()
        if (checkAtt != undefined) return checkAtt

        const checkJump = this.CheckJump()
        if (checkJump != undefined) return checkJump

        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        this.CheckInteraction()

        if (v.x == 0 && v.z == 0) {
            this.previous.Init();
            return this.previous;
        }

        // ✅ 카메라 기준 방향으로 변환
        const camForward = new THREE.Vector3();
        this.camera.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();

        const camRight = new THREE.Vector3();
        camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

        // 입력 벡터를 카메라 기준 방향으로 변환
        const worldDir = new THREE.Vector3()
            .addScaledVector(camForward, -v.z)
            .addScaledVector(camRight, v.x)
            .normalize();

        worldDir.y = 0;

        // ✅ 회전 처리 (lookAt → Quaternion)
        const mx = this.MX.lookAt(worldDir, this.ZeroV, this.YV);
        const qt = this.QT.setFromRotationMatrix(mx);
        this.player.Meshs.quaternion.copy(qt);

        // ✅ 이동 처리
        const dis = this.gphysic.CheckDirection(this.player, this.dir.copy(worldDir));
        const moveAmount = worldDir.clone().multiplyScalar(delta * this.speed);
        const moveDis = moveAmount.length();

        if (moveDis < dis.distance) {
            this.player.Pos.add(moveAmount);
        } else if (dis.move) {
            this.player.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed));
        } else {
            // this.player.Meshs.position.y += 1 // 계단 체크
            // const dis = this.gphysic.CheckDirection(this.player, this.dir.set(v.x, 0, v.z))
            // if (moveDis > dis.distance) {
            //     this.player.Pos.add(moveAmount)
            //     console.log("계단 ", moveAmount)
            //     // this.player.Meshs.position.x -= movX
            //     // this.player.Meshs.position.z -= movZ
            // } else {
            //     this.player.Meshs.position.y -= 1
            // }
        }
        return this
    }
}
export class JumpState implements IPlayerAction {
    speed = 5
    velocity_y = 16
    dirV = new THREE.Vector3(0, 0, 0)
    ZeroV = new THREE.Vector3(0, 0, 0)
    YV = new THREE.Vector3(0, 1, 0)
    MX = new THREE.Matrix4()
    QT = new THREE.Quaternion()
    dir = new THREE.Vector3()

    constructor(private playerCtrl: PlayerCtrl, private player: Player, private camera: THREE.Camera, private gphysic: IGPhysic) { }
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
        const movY = this.velocity_y * delta

        // ✅ 카메라 기준 방향으로 변환
        const camForward = new THREE.Vector3();
        this.camera.getWorldDirection(camForward);
        camForward.y = 0;
        camForward.normalize();

        const camRight = new THREE.Vector3();
        camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

        const worldDir = new THREE.Vector3()
            .addScaledVector(camForward, -v.z)
            .addScaledVector(camRight, v.x)
            .normalize();

        worldDir.y = 0;

        // ✅ 방향 회전 처리
        if (v.x || v.z) {
            const mx = this.MX.lookAt(worldDir, this.ZeroV, this.YV);
            const qt = this.QT.setFromRotationMatrix(mx);
            this.player.Meshs.quaternion.copy(qt);
        }

        // ✅ 이동 처리 (카메라 기준 방향 적용)
        const dirdis = this.gphysic.CheckDirection(this.player, this.dir.copy(worldDir));
        const moveAmount = worldDir.clone().multiplyScalar(delta * this.speed);
        const moveDis = moveAmount.length();

        console.log("jump movedis ", moveDis, ", dist", dirdis.distance);

        if (moveDis < dirdis.distance) {
            this.player.Pos.add(moveAmount);
        } else if (dirdis.move) {
            this.player.Pos.add(dirdis.move.normalize().multiplyScalar(delta * this.speed));
        }

        // ✅ 점프/낙하 처리
        const dis = this.gphysic.CheckDown(this.player);

        if (movY > 0 || dis > Math.abs(movY)) {
            this.player.Meshs.position.y += movY;
        } else {
            this.player.Meshs.position.y += -dis;

            this.Uninit();
            this.playerCtrl.IdleSt.Init();
            return this.playerCtrl.IdleSt;
        }

        // ✅ 중력 적용
        this.velocity_y -= 9.8 * 3 * delta;

        return this
    }
}