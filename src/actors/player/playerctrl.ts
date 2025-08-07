import * as THREE from "three";
import { Player } from "./player";
import { DeadState, IPlayerAction, IdleState, JumpState, MagicH1State, MagicH2State, RunState } from "./states/playerstate";
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

export class PlayerCtrl implements ILoop, IActionUser {
    LoopId = 0
    mode: AppMode = AppMode.Play
    keyDownQueue: IKeyCommand[] = []
    keyUpQueue: IKeyCommand[] = []
    inputVQueue: THREE.Vector3[] = []
    targets: THREE.Object3D[] = []

    contollerEnable = true
    inputMode = false
    moveDirection = new THREE.Vector3()
    playEnable = false
    playMode: PlayMode = "default"

    baseSpec: BaseSpec
    keyType: KeyType = KeyType.None

    AttackSt: AttackState
    MagicH1St: MagicH1State
    MagicH2St: MagicH2State
    AttackIdleSt: AttackIdleState
    RunSt: RunState
    JumpSt: JumpState
    IdleSt: IdleState
    DyingSt: DeadState
    PickFruitSt: PickFruitState
    PickFruitTreeSt: PickFruitTreeState
    PlantASt: PlantAPlantState
    DeckSt: DeckState
    WarteringSt: WarteringState
    BuildingSt: BuildingState
    DeleteSt: DeleteState

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
        this.AttackSt = new AttackState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.MagicH1St = new MagicH1State(this, this.player, this.gphysic, this.baseSpec)
        this.MagicH2St = new MagicH2State(this, this.player, this.gphysic, this.baseSpec)
        this.AttackIdleSt = new AttackIdleState(this, this.player, this.gphysic, this.baseSpec)
        this.RunSt = new RunState(this, this.player, this.camera, this.gphysic, this.eventCtrl, this.baseSpec)
        this.JumpSt = new JumpState(this, this.player, this.camera, this.gphysic)
        this.IdleSt = new IdleState(this, this.player, this.gphysic, this.baseSpec)
        this.DyingSt = new DeadState(this, this.player, this.gphysic, this.baseSpec)
        this.PickFruitSt = new PickFruitState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.PickFruitTreeSt = new PickFruitTreeState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.PlantASt = new PlantAPlantState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.DeckSt = new DeckState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)
        this.WarteringSt = new WarteringState(this, this.player, this.gphysic, this.inventory, this.eventCtrl, this.baseSpec)
        this.BuildingSt = new BuildingState(this, this.player, this.gphysic, this.inventory, this.eventCtrl, this.baseSpec)
        this.DeleteSt = new DeleteState(this, this.player, this.gphysic, this.eventCtrl, this.baseSpec)

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
                switch (opt.type) {
                    case AttackType.NormalSwing:
                    case AttackType.Magic0:
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
        eventCtrl.RegisterEventListener(EventTypes.UpdateBuff, (buff: IBuffItem[]) => {
            this.UpdateBuff(buff)
        })
    }
    init() {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
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
}
