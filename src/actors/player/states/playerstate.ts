import * as THREE from "three";
import { PlayerCtrl } from "../playerctrl";
import { Player } from "../player";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { KeyType } from "@Glibs/types/eventtypes";
import { AppMode, EventTypes } from "@Glibs/types/globaltypes";
import { ActionType } from "../playertypes";
import { Bind } from "@Glibs/types/assettypes";
import IEventController from "@Glibs/interface/ievent";
import { IItem } from "@Glibs/interface/iinven";
import { AttackItemType } from "@Glibs/types/inventypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";

export interface IPlayerAction {
    Init(): void
    Uninit(): void
    Update(delta: number, v: THREE.Vector3): IPlayerAction
}

export class State {
    constructor(
        protected playerCtrl: PlayerCtrl,
        protected player: Player,
        protected gphysic: IGPhysic,
        protected baseSpec: BaseSpec
    ) { }

    DefaultCheck({ run = true, attack = true, jump = true, magic = true } = {}): IPlayerAction | undefined {
        const checkRun = (run) ? this.CheckRun() : undefined
        if (checkRun != undefined) return checkRun

        const checkAtt = (attack) ? this.CheckAttack(): undefined
        if (checkAtt != undefined) return checkAtt

        const checkJump = (jump) ? this.CheckJump() : undefined
        if (checkJump != undefined) return checkJump

        const checkMagic = (magic) ? this.CheckMagic() : undefined
        if (checkMagic != undefined) return checkMagic

        const checkMagic2 = (magic) ? this.CheckMagic2() : undefined
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

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
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

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
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
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
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
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
        this.Init()
    }
    Init(): void {
        const handItem = this.baseSpec.GetBindItem(Bind.Hands_R)
        const action = (!handItem) ? ActionType.Idle : this.getAnimationForItem(handItem)
        this.player.ChangeAction(action)
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
    getAnimationForItem(item: IItem): ActionType {
        switch (item.AttackType) {
            case AttackItemType.Sword:
            case AttackItemType.Axe:
            case AttackItemType.Blunt:
            case AttackItemType.OneHandGun:
                return ActionType.Idle
            case AttackItemType.TwoHandGun:
                return ActionType.RifleIdle
            default:
                return ActionType.Idle
        }
    }
}
export class RunState extends State implements IPlayerAction {
    speed = 7
    constructor(
        playerPhy: PlayerCtrl, 
        player: Player, 
        private camera: THREE.Camera, 
        gphysic: IGPhysic, 
        private eventCtrl: IEventController,
        baseSpec: BaseSpec,
    ) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    Init(): void {
        const handItem = this.baseSpec.GetBindItem(Bind.Hands_R)
        const action = (!handItem) ? ActionType.Run : this.getAnimationForItem(handItem)
        this.player.ChangeAction(action)
    }
    Uninit(): void { }
    CheckInteraction() {
        this.eventCtrl.SendEventMessage(EventTypes.CheckInteraction, this.player)
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
            this.playerCtrl.currentIdleState.Init();
            return this.playerCtrl.currentIdleState;
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

        if (dis.move) {
            this.player.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed));
        } else {
            this.player.Pos.add(moveAmount);
        }
        // if (moveDis < dis.distance) {
        //     this.player.Pos.add(moveAmount);
        // } else if (dis.move) {
        //     this.player.Pos.add(dis.move.normalize().multiplyScalar(delta * this.speed));
        // } else {
        //     // this.player.Meshs.position.y += 1 // 계단 체크
            // const dis = this.gphysic.CheckDirection(this.player, this.dir.set(v.x, 0, v.z))
            // if (moveDis > dis.distance) {
            //     this.player.Pos.add(moveAmount)
            //     console.log("계단 ", moveAmount)
            //     // this.player.Meshs.position.x -= movX
            //     // this.player.Meshs.position.z -= movZ
            // } else {
            //     this.player.Meshs.position.y -= 1
            // }
        // }
        return this
    }
    getAnimationForItem(item: IItem): ActionType {
        switch (item.AttackType) {
            case AttackItemType.Sword:
                return ActionType.SwordRun
            case AttackItemType.Axe:
                return ActionType.AxeRun
            case AttackItemType.TwoHandGun:
                return ActionType.RifleRun
            default:
                return ActionType.Run
        }
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
            this.playerCtrl.currentIdleState.Init();
            return this.playerCtrl.currentIdleState;
        }

        // ✅ 중력 적용
        this.velocity_y -= 9.8 * 3 * delta;

        return this
    }
}