import { IGPhysic } from "@Glibs/interface/igphysics"
import { Player } from "../player"
import { PlayerCtrl } from "../playerctrl"
import { IPlayerAction, State } from "./playerstate"
import { ActionType } from "@Glibs/types/playertypes"


export class TreeIdleState extends State implements IPlayerAction {
    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic) {
        super(playerPhy, player, gphysic)
        this.Init()
    }
    Init(): void {
        this.player.ChangeAction(ActionType.TreeIdle)
        this.playerCtrl.RunSt.PreviousState(this)
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
