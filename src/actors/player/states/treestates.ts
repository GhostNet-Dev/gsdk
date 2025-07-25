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

export class CutDownTreeState extends State implements IPlayerAction {
    TargetIntId: string =""
    triggerType: TriggerType = "onInteract"

    constructor(
        playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, 
        private eventCtrl: IEventController, baseSpec: BaseSpec
    ) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    Init(): void {
        this.player.ChangeAction(ActionType.CutDownTree)
    }
    Uninit(): void {
        
    }
    Update(delta: number, v: Vector3): IPlayerAction {
        const d = this.DefaultCheck({ attack: false, magic: false })
        if(d != undefined) return d

        this.eventCtrl.SendEventMessage(EventTypes.DoInteraction, this.TargetIntId, this.triggerType)
        
        return this
    }
}

export class TreeIdleState extends State implements IPlayerAction {
    TargetIntId: string =""
    triggerType: TriggerType = "onInteract"

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
        this.Init()
    }
    Init(): void {
        this.player.ChangeAction(ActionType.TreeIdle)
    }
    Uninit(): void {
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck({ attack: false, magic: false })
        if(d != undefined) return d

        const checkGravity = this.CheckGravity()
        if (checkGravity != undefined) return checkGravity

        if (this.playerCtrl.KeyState[KeyType.Action1]) {
            this.playerCtrl.CutDownTreeSt.TargetIntId = this.TargetIntId
            this.playerCtrl.CutDownTreeSt.triggerType = this.triggerType
            this.playerCtrl.CutDownTreeSt.Init()
            return this.playerCtrl.CutDownTreeSt
        }
        return this
    }
}
