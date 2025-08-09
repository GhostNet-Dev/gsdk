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

export class CutDownTreeState extends State implements IPlayerAction {
    TargetIntId: string =""
    triggerType: TriggerType = "onInteract"
    attackProcess = false
    attackTime = 0
    attackSpeed = 2
    keytimeout?:NodeJS.Timeout

    constructor(
        playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, 
        private eventCtrl: IEventController, baseSpec: BaseSpec
    ) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    Init(): void {
        this.attackSpeed = this.baseSpec.AttackSpeed
        this.attackTime = this.attackSpeed
        this.player.ChangeAction(ActionType.CutDownTree, this.attackSpeed)
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
        if(this.attackProcess) return this
        if(this.attackTime / this.attackSpeed < 1) {
            return this
        }
        this.attackTime -= this.attackSpeed

        this.attackProcess = true
        this.keytimeout = setTimeout(() => {
            console.log("Attack!! from character")
            this.eventCtrl.SendEventMessage(EventTypes.DoInteraction, this.TargetIntId, this.triggerType)
            this.eventCtrl.SendEventMessage(EventTypes.Attack + this.TargetIntId)
            this.attackProcess = false
        }, this.attackSpeed * 1000 * 0.5)
        
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
