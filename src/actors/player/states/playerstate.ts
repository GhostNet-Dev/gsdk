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
    Update(delta: number, v?: THREE.Vector3): IPlayerAction
}

export class State {
    constructor(
        protected playerCtrl: PlayerCtrl,
        protected player: Player,
        protected gphysic: IGPhysic,
        protected baseSpec: BaseSpec
    ) { }

    DefaultCheck({ run = true, attack = true, jump = true, magic = true, roll = true } = {}): IPlayerAction | undefined {
        const checkRun = (run) ? this.CheckRun() : undefined
        if (checkRun != undefined) return checkRun

        const checkRoll = (roll) ? this.CheckRoll() : undefined
        if (checkRoll != undefined) return checkRoll

        const checkAtt = (attack) ? this.CheckAttack() : undefined
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
                const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R)
                const state = (handItem?.ItemType == "meleeattack") ?
                    this.playerCtrl.ComboMeleeSt : this.playerCtrl.RangeAttackSt
                state.Init()
                return state
            } else if (this.playerCtrl.mode == AppMode.Weapon) {
                this.playerCtrl.DeckSt.Init()
                return this.playerCtrl.DeckSt
            } else {
                this.playerCtrl.PlantASt.Init()
                return this.playerCtrl.PlantASt
            }
        }
    }
    CheckRoll() {
        if (this.playerCtrl.KeyState[KeyType.Action2]) {
            this.playerCtrl.RollSt.Init()
            return this.playerCtrl.RollSt
        }
    }
    CheckMagic() {
        if (this.playerCtrl.KeyState[KeyType.Action3]) {
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
        if (this.playerCtrl.KeyState[KeyType.Action4]) {
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
            const dis = this.player.CenterPos.distanceTo(v.position)
            if (attackRange > dis) {
                const handItem = this.playerCtrl.baseSpec.GetBindItem(Bind.Hands_R)
                const state = (handItem?.ItemType == "meleeattack") ?
                    this.playerCtrl.ComboMeleeSt : this.playerCtrl.RangeAttackSt
                state.Init()
                return state
            }
        }
    }
}
export class RollState extends State implements IPlayerAction {
    // 구르기 속도와 지속 시간 설정
    private rollSpeed = 10.5
    private rollDuration = 0.6 // 초 단위 (애니메이션 길이에 맞게 조절)
    private rollTimer = 0

    // 구르기 시작 시 방향을 저장할 벡터
    private rollDirection = new THREE.Vector3()

    constructor(
        playerPhy: PlayerCtrl,
        player: Player,
        gphysic: IGPhysic,
        eventCtrl: IEventController, // eventCtrl은 필요 없을 수 있지만 구조적 일관성을 위해 유지
        baseSpec: BaseSpec,
    ) {
        super(playerPhy, player, gphysic, baseSpec)
    }

    /**
     * 구르기 상태를 시작합니다.
     * @param v - 구르기를 시작할 때의 이동 입력 벡터 (이 방향으로 구릅니다)
     */
    Init(): void {
        this.rollTimer = 0
        this.rollDuration = this.player.ChangeAction(ActionType.Rolling) ?? 1

        // ✅ 구르기 방향 결정 및 고정
        // 입력이 있으면 해당 방향으로, 없으면 현재 바라보는 정면 방향으로 구르기
        this.player.Meshs.getWorldDirection(this.rollDirection)
    }

    Uninit(): void { }

    // 구르기 중에는 다른 상호작용이 불가능해야 하므로 주석 처리하거나 비워둡니다.
    // CheckInteraction() {}

    Update(delta: number): IPlayerAction {
        this.rollTimer += delta

        // ✅ 구르기 종료 체크
        if (this.rollTimer >= this.rollDuration) {
            this.Uninit()
            this.playerCtrl.IdleSt.Init()
            return this.playerCtrl.IdleSt
        }

        // 구르기 중에는 점프나 공격으로 상태를 변경할 수 없도록 관련 로직을 제거합니다.
        // 단, 중력은 계속 적용되어야 합니다.
        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        const skin = 0.02; // 살짝 여유
        const rollDir = this.rollDirection.clone().setY(0).normalize(); // 반드시 정규화
        const totalDist = this.rollSpeed * delta;

        // 스텝 크기: 반경/속도에 따라 자동 분할 (너무 크면 벽을 뚫을 수 있음)
        const radius = Math.max(this.player.Size.x, this.player.Size.z) * 0.5;
        const maxStep = Math.max(0.15, radius * 0.5); // 상황에 따라 조절
        const steps = Math.max(1, Math.ceil(totalDist / maxStep));
        const stepLen = totalDist / steps;

        for (let i = 0; i < steps; i++) {
            // 현재 스텝에서의 충돌 체크 (반드시 외부 speed를 전달)
            const dis = this.gphysic.CheckDirection(this.player, rollDir, this.rollSpeed);

            if (dis.move) {
                // 경사면: 면에 투영된 방향으로 굴리기
                this.player.Pos.add(dis.move.normalize().multiplyScalar(stepLen));
                continue;
            }

            if (dis.distance <= 0) {
                // 바로 앞이 막힘 → 정지(더 진행하지 않음)
                break;
            }

            // 해당 스텝에서 실제 이동 가능한 거리 (벽 직전까지만)
            const canMove = Math.min(stepLen, dis.distance - skin);
            if (canMove > 0) {
                this.player.Pos.add(rollDir.clone().multiplyScalar(canMove));
            } else {
                break;
            }
        }

        // 구르기 상태를 유지합니다.
        return this
    }
}
export class MagicH2State extends State implements IPlayerAction {
    keytimeout?: NodeJS.Timeout
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
        if (d != undefined) {
            this.Uninit()
            return d
        }

        return this.next
    }
}
export class MagicH1State extends State implements IPlayerAction {
    keytimeout?: NodeJS.Timeout
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
        if (d != undefined) return d

        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        const checkEnermy = this.CheckEnermyInRange()
        if (checkEnermy != undefined) return checkEnermy

        return this
    }
    getAnimationForItem(item: IItem): ActionType {
        switch (item.AttackType) {
            case AttackItemType.TwoHandSword:
            case AttackItemType.TwoHandAxe:
            case AttackItemType.TwoHandBlunt:
                return ActionType.TwoHandSwordIdle
            case AttackItemType.OneHandSword:
            case AttackItemType.OneHandAxe:
            case AttackItemType.OneHandBlunt:
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
        const d = this.DefaultCheck({ magic: false, run: false })
        if (d != undefined) {
            this.Uninit()
            return d
        }

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
        // 한 프레임 이동을 두 번으로 쪼개 간이 CCD
        const stepCount = 2;
        for (let i = 0; i < stepCount; i++) {
            const stepDir = worldDir.clone().normalize();
            const dis = this.gphysic.CheckDirection(this.player, stepDir, this.speed);

            const step = (delta * this.speed) / stepCount;
            if (dis.move) {
                this.player.Pos.add(dis.move.multiplyScalar(step));
            } else if (dis.distance > 0) {
                const canMove = Math.min(step, dis.distance - 0.01);
                if (canMove > 0) this.player.Pos.add(stepDir.multiplyScalar(canMove));
                else break;
            } else {
                // 막힘(-1) 또는 0 → 정지
                break;
            }
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
            case AttackItemType.TwoHandSword:
            case AttackItemType.TwoHandAxe:
            case AttackItemType.TwoHandBlunt:
                return ActionType.SwordRun
            case AttackItemType.OneHandSword:
            case AttackItemType.OneHandAxe:
            case AttackItemType.OneHandBlunt:
            case AttackItemType.OneHandGun:
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
        const dirdis = this.gphysic.CheckDirection(this.player, this.dir.copy(worldDir), this.speed);
        const moveAmount = worldDir.clone().multiplyScalar(delta * this.speed);
        const moveDis = moveAmount.length();

        // console.log("jump movedis ", moveDis, ", dist", dirdis.distance);

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
export class SleepingIdleState extends State implements IPlayerAction {
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
        this.Init()
    }
    Init(): void {
        this.player.ChangeAction(ActionType.SleepingIdle)
        console.log("Idle!!")
    }
    Uninit(): void {

    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) return d

        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        const checkEnermy = this.CheckEnermyInRange()
        if (checkEnermy != undefined) return checkEnermy

        return this
    }
}