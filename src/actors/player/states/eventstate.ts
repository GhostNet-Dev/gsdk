import * as THREE from "three";
import { IGPhysic } from "@Glibs/interface/igphysics"
import { Player } from "../player"
import { PlayerCtrl } from "../playerctrl"
import { IPlayerAction, State } from "./playerstate"
import { ActionType } from "@Glibs/types/playertypes"
import { KeyType } from "@Glibs/types/eventtypes"
import { Vector3 } from "three"
import IEventController from "@Glibs/interface/ievent"
import { EventTypes } from "@Glibs/types/globaltypes"
import { TriggerType } from "@Glibs/types/actiontypes"
import { BaseSpec } from "@Glibs/actors/battle/basespec"

export class EventActionState extends State implements IPlayerAction {
    TargetIntId: string =""
    triggerType: TriggerType = "onInteract"
    attackTime = 0
    modeTime = 0
    keytimeout?:NodeJS.Timeout

    constructor(
        playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, 
        private eventCtrl: IEventController, baseSpec: BaseSpec
    ) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    Init(): void {
        this.attackTime = 0
        this.player.ChangeAction(ActionType.EventAction)
    }
    Uninit(): void {
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
    }
    Update(delta: number, v: Vector3): IPlayerAction {
        const d = this.DefaultCheck({ attack: false, magic: false })
        if(d != undefined) {
            this.Uninit()
            return d
        }

        this.attackTime += delta

        const ratio = this.attackTime / this.modeTime
        if (ratio < 1) {
            this.eventCtrl.SendEventMessage(EventTypes.ShowProgress, ratio, "")
            return this
        }
        this.eventCtrl.SendEventMessage(EventTypes.ShowProgress, 1, "")
        console.log("Attack!! from character")
        this.eventCtrl.SendEventMessage(EventTypes.DoInteraction, this.TargetIntId, this.triggerType, this.player)

        this.Uninit()
        this.playerCtrl.EventIdleSt.Init()
        return this.playerCtrl.EventIdleSt
    }
}
export class EventIdleState extends State implements IPlayerAction {
    TargetIntId: string =""
    triggerType: TriggerType = "onInteract"
    modeTime = 0

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
        this.Init()
    }
    Init(): void {
        this.player.ChangeAction(ActionType.EventIdle)
    }
    Uninit(): void {
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck({ attack: false, magic: false })
        if(d != undefined) return d

        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        if (this.playerCtrl.KeyState[KeyType.Action1]) {
            this.playerCtrl.EventActSt.TargetIntId = this.TargetIntId
            this.playerCtrl.EventActSt.triggerType = this.triggerType
            this.playerCtrl.EventActSt.modeTime = this.modeTime
            this.playerCtrl.EventActSt.Init()
            return this.playerCtrl.EventActSt
        }
        return this
    }
}
