import * as THREE from "three";
import { Player } from "./player";
import { DeadState, IPlayerAction, IdleState, JumpState, MagicH1State, MagicH2State, RollState, RunState, SleepingIdleState } from "./states/playerstate";
import { AttackIdleState, AttackState } from "./states/attackstate";
import { BaseSpec } from "../battle/basespec";
import { BuildingState, DeleteState, PickFruitState, PickFruitTreeState, PlantAPlantState, WarteringState } from "./states/farmstate";
import { DeckState } from "./states/deckstate";
import { IBuffItem } from "@Glibs/interface/ibuff";
import { AppMode, EventTypes } from "@Glibs/types/globaltypes";
import IEventController, { IKeyCommand, ILoop } from "@Glibs/interface/ievent";
import { KeyType } from "@Glibs/types/eventtypes";
import { AttackOption, AttackType, DefaultStatus, PlayMode } from "./playertypes";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IInventory, { IItem } from "@Glibs/interface/iinven";
import { ItemId } from "@Glibs/inventory/items/itemdefs";
import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes";
import { CutDownTreeState, TreeIdleState } from "./states/treestates";
import { Item } from "@Glibs/inventory/items/item";
import { Buffdefs } from "@Glibs/magical/buff/buffdefs";
import { Buff } from "@Glibs/magical/buff/buff";
import { MeleeAttackIdleState, MeleeAttackState } from "./states/meleeattackst";
import { RangeAttackState } from "./states/rangeattackst";

export class PlayerCtrl implements ILoop, IActionUser {
    LoopId = 0
    mode: AppMode = AppMode.Play
    keyDownQueue: IKeyCommand[] = []
    keyUpQueue: IKeyCommand[] = []
    inputVQueue: THREE.Vector3[] = []
    targets: THREE.Object3D[] = []
    actions: IActionComponent[] = []

    contollerEnable = true
    inputMode = false
    moveDirection = new THREE.Vector3()
    playEnable = false
    playMode: PlayMode = "default"

    baseSpec: BaseSpec
    keyType: KeyType = KeyType.None

    MeleeAttackSt: MeleeAttackState
    RangeAttackSt: RangeAttackState
    MagicH1St: MagicH1State
    MagicH2St: MagicH2State
    AttackIdleSt: AttackIdleState
    MeleeAttackIdleSt: MeleeAttackIdleState
    RunSt: RunState
    JumpSt: JumpState
    IdleSt: IdleState
    RollSt: RollState
    DyingSt: DeadState
    PickFruitSt: PickFruitState
    PickFruitTreeSt: PickFruitTreeState
    PlantASt: PlantAPlantState
    DeckSt: DeckState
    WarteringSt: WarteringState
    BuildingSt: BuildingState
    DeleteSt: DeleteState
    SleepingIdleSt: SleepingIdleState

    currentState: IPlayerAction
    currentIdleState: IPlayerAction

    TreeIdleSt: TreeIdleState
    CutDownTreeSt: CutDownTreeState

    worker = new Worker(new URL('./player.worker.ts', import.meta.url))

    set Immortal(enable: boolean) { this.baseSpec.status.immortal = enable }
    get Health() { return this.baseSpec.Health }
    set Enable(mode: boolean) {
        this.playEnable = mode
        this.currentState.Uninit()
        this.currentState = this.IdleSt
        if (mode) this.currentState.Init()
    }
    get objs() { return this.player.Meshs }

    constructor(
        private player: Player,
        public inventory: IInventory,
        private gphysic: IGPhysic,
        private camera: THREE.Camera,
        private eventCtrl: IEventController,
    ) {
        this.baseSpec = new BaseSpec(DefaultStatus.stats, this)
        this.MeleeAttackSt = new MeleeAttackState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.RangeAttackSt = new RangeAttackState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.MagicH1St = new MagicH1State(this, this.player, this.gphysic, this.baseSpec)
        this.MagicH2St = new MagicH2State(this, this.player, this.gphysic, this.baseSpec)
        this.AttackIdleSt = new AttackIdleState(this, this.player, this.gphysic, this.baseSpec)
        this.MeleeAttackIdleSt = new MeleeAttackIdleState(this, this.player, this.gphysic, this.baseSpec)
        this.RunSt = new RunState(this, this.player, this.camera, this.gphysic, this.eventCtrl, this.baseSpec)
        this.JumpSt = new JumpState(this, this.player, this.camera, this.gphysic)
        this.IdleSt = new IdleState(this, this.player, this.gphysic, this.baseSpec)
        this.RollSt = new RollState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.DyingSt = new DeadState(this, this.player, this.gphysic, this.baseSpec)
        this.PickFruitSt = new PickFruitState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.PickFruitTreeSt = new PickFruitTreeState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.PlantASt = new PlantAPlantState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.DeckSt = new DeckState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.WarteringSt = new WarteringState(this, this.player, this.gphysic, this.inventory, this.eventCtrl, this.baseSpec)
        this.BuildingSt = new BuildingState(this, this.player, this.gphysic, this.inventory, this.eventCtrl, this.baseSpec)
        this.DeleteSt = new DeleteState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.SleepingIdleSt = new SleepingIdleState(this, this.player, this.gphysic, this.baseSpec)

        this.TreeIdleSt = new TreeIdleState(this, this.player, this.gphysic, this.baseSpec)
        this.CutDownTreeSt = new CutDownTreeState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)

        this.currentState = this.IdleSt
        this.currentIdleState = this.IdleSt
        this.worker.onmessage = (e: any) => { console.log(e) }

        eventCtrl.RegisterEventListener(EventTypes.ChangePlayerMode, (
            mode: PlayMode, interId: string, triggerType: TriggerType
        ) => {
            if (this.playMode == mode) return
            switch (mode) {
                case "tree":
                    this.TreeIdleSt.TargetIntId = interId
                    this.TreeIdleSt.triggerType = triggerType
                    this.currentIdleState = this.TreeIdleSt
                    break;
                default:
                    this.currentIdleState = this.IdleSt
            }
            this.playMode = mode
        })

        eventCtrl.RegisterEventListener(EventTypes.KeyDown, (keyCommand: IKeyCommand) => {
            if (!this.contollerEnable || !this.playEnable) return
            this.keyDownQueue.push(keyCommand)
        })
        eventCtrl.RegisterEventListener(EventTypes.KeyUp, (keyCommand: IKeyCommand) => {
            if (!this.contollerEnable || !this.playEnable) return
            this.keyUpQueue.push(keyCommand)
        })

        eventCtrl.RegisterEventListener(EventTypes.Input, (e: any, real: THREE.Vector3) => {
            if (!this.contollerEnable || !this.playEnable) return
            if (e.type == "move") {
                this.inputVQueue.push(new THREE.Vector3().copy(real))
                this.inputMode = true
            } else {
                this.inputMode = false
                this.reset()
            }
        })
        eventCtrl.RegisterEventListener(EventTypes.Equipment, (id: ItemId) => {
            const slot = this.inventory.GetItem(id)
            if (slot == undefined) throw new Error("item is undefined")
            if (slot.item.Bind) {
                const prevItem = this.baseSpec.GetBindItem(slot.item.Bind);
                if (prevItem) (prevItem as Item).deactivate()
            }
            this.baseSpec.Equip(slot.item);
            this.inventory.EquipItem(slot.item);
            (slot.item as Item).activate()
            this.currentState.Init()
        })
        eventCtrl.RegisterEventListener(EventTypes.Pickup, (id: ItemId) => {
            const info = this.inventory.GetItemInfo(id)
            this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, `${info.name}을 얻었습니다.`)
            this.inventory.NewItem(id)
        })
        eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            if (this.currentState != this.DyingSt && this.baseSpec.CheckDie()) {
                this.currentState = this.DyingSt
                this.currentState.Init()
            }
            
            if (!this.playEnable) return
            opts.forEach((opt) => {
                if (opt.obj) {
                    const ret = this.isObjectLookingAt(opt.obj, this.player.CenterPos, 90)
                    const dis = this.player.CenterPos.distanceTo(opt.obj.position)
                    if (!ret || dis > 3) {
                        console.log("out of range")
                        return
                    }
                }
                switch (opt.type) {
                    case AttackType.NormalSwing:
                    case AttackType.Magic0:
                        if(this.currentState == this.RollSt) break;
                        this.baseSpec.ReceiveCalcDamage(opt.damage)
                        this.player.DamageEffect(opt.damage)
                        break;
                    case AttackType.Exp:
                        this.baseSpec.ReceiveExp(opt.damage)
                        break;
                    case AttackType.Heal:
                        this.player.HealEffect(opt.damage)
                        this.baseSpec.ReceiveCalcHeal(opt.damage)
                        break;
                }
            })
            eventCtrl.SendEventMessage(EventTypes.PlayerStatus, this.baseSpec.Status)
        })
        eventCtrl.RegisterEventListener(EventTypes.AddInteractive, (...obj: THREE.Object3D[]) => {
            this.add(...obj)
        })
        eventCtrl.RegisterEventListener(EventTypes.DelInteractive, (obj: THREE.Object3D) => {
            this.remove(obj)
        })
        eventCtrl.RegisterEventListener(EventTypes.UpdateBuff + "player", (buff: Buff) => {
            this.baseSpec.Buff(buff)
        })
    }
    init() {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        this.eventCtrl.SendEventMessage(EventTypes.Outline, this.player.Meshs)
        this.playEnable = true
        this.baseSpec.ResetStatus()
        this.eventCtrl.SendEventMessage(EventTypes.PlayerStatus, this.baseSpec.Status)
        this.currentState = this.IdleSt
        this.currentState.Init()
    }
    uninit() {
        this.playEnable = false
        this.currentState.Uninit()
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    }
    add(...obj: THREE.Object3D[]) {
        this.targets.push(...obj)
    }
    remove(obj: THREE.Object3D) {
        const idx = this.targets.indexOf(obj)
        if (idx < 0) return
        this.targets.splice(idx, 1)
    }
    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this)
        action.activate?.(this, ctx)
    }
    updateInputVector() {
        const cmd = this.inputVQueue.shift()
        if (cmd == undefined) {
            return
        }
        this.moveDirection.x = cmd.x
        this.moveDirection.z = cmd.z
    }
    reset() {
        this.moveDirection.x = 0
        this.moveDirection.z = 0
        this.inputVQueue.length = 0
        this.currentState.Uninit()
        this.currentState = this.currentIdleState
        this.currentState.Init()
    }
    update(delta: number) {
        this.updateInputVector()
        this.updateDownKey()
        this.updateUpKey()

        if (!this.player.meshs.visible) return

        this.currentState = this.currentState.Update(delta, this.moveDirection)
        this.player.Update(delta)
        this.actionReset()
    }
    changeState(state: IPlayerAction) {
        this.currentState.Uninit()
        this.currentState = state
        this.currentState.Init()
    }
    actionReset() {
        for (let i = KeyType.Action0; i < KeyType.Count; i++) {
            this.KeyState[i] = false
        }
    }

    KeyState = new Array<boolean>(KeyType.Count)
    keytimeout?: NodeJS.Timeout

    updateDownKey() {
        let cmd = this.keyDownQueue.shift()
        if (cmd == undefined) {
            this.keyType = KeyType.None
            return
        }
        this.KeyState[cmd.Type] = true

        this.keyType = cmd.Type
        const position = cmd.ExecuteKeyDown()
        if (position.x != 0) { this.moveDirection.x = position.x }
        if (position.y != 0) { this.moveDirection.y = position.y }
        if (position.z != 0) { this.moveDirection.z = position.z }
    }

    updateUpKey() {
        let cmd = this.keyUpQueue.shift()
        if (cmd == undefined) {
            this.keyType = KeyType.None
            return
        }

        this.KeyState[cmd.Type] = false
        this.keyType = cmd.Type
        const position = cmd.ExecuteKeyUp()
        if (position.x == this.moveDirection.x) { this.moveDirection.x = 0 }
        if (position.y == this.moveDirection.y) { this.moveDirection.y = 0 }
        if (position.z == this.moveDirection.z) { this.moveDirection.z = 0 }
    }
    UpdateBuff(buff: IBuffItem[]) {
        console.log(buff)
    }
    isObjectLookingAt(object: THREE.Object3D, targetPosition: THREE.Vector3, fov: number): boolean {
        // 1. 객체의 정면 방향 벡터를 구합니다.
        const objectDirection = new THREE.Vector3();
        // getWorldDirection는 객체의 로컬 Z축 방향(정면)을 월드 좌표 기준으로 가져옵니다.
        object.getWorldDirection(objectDirection);
      
        // 2. 객체에서 목표 지점까지의 방향 벡터를 구합니다.
        const targetDirection = new THREE.Vector3();
        targetDirection.subVectors(targetPosition, object.position).normalize();
      
        // 3. 두 벡터 사이의 각도를 계산합니다 (라디안 단위).
        // 벡터 내적(dot product)을 사용하여 두 벡터 사이의 각도를 구합니다.
        const angle = Math.acos(objectDirection.dot(targetDirection));
      
        // 4. 시야각(fov)을 라디안으로 변환합니다.
        // fov는 전체 시야각이므로, 정면 방향을 기준으로 절반으로 나눕니다.
        const fovInRadians = THREE.MathUtils.degToRad(fov / 2);
      
        // 5. 계산된 각도가 시야각 범위 내에 있는지 확인합니다.
        return angle <= fovInRadians;
      }

}
