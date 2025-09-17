import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IInventory from "@Glibs/interface/iinven";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { Npc } from "./npc";
import { BaseSpec } from "../battle/basespec";
import { DefaultStatus } from "@Glibs/types/playertypes";
import { StatKey } from "@Glibs/types/stattypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { Buff } from "@Glibs/magical/buff/buff";
import { IPlayerAction } from "../player/states/playerstate";

export class NpcCtrl implements ILoop, IActionUser {
    LoopId = 0
    baseSpec: BaseSpec
    currentState: IPlayerAction
    constructor(
        private npc: Npc,
        public inventory: IInventory,
        private gphysic: IGPhysic,
        private camera: THREE.Camera,
        private eventCtrl: IEventController,
        private state: IPlayerAction,
        { name = "npc"  } = {},
        private stat?: Partial<Record<StatKey, number>> ,
    ) {
        this.baseSpec = new BaseSpec(stat ?? DefaultStatus.stats, this)
        this.currentState = state

        eventCtrl.RegisterEventListener(EventTypes.UpdateBuff + name, (buff: Buff) => {
            this.baseSpec.Buff(buff)
        })
    }
    init() {
        this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }
    uninit() {
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
    }
    applyAction(action: IActionComponent, ctx?: ActionContext | undefined): void {
        action.apply?.(this)
        action.activate?.(this, ctx)
    }
    removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
        action.deactivate?.(this, context)
        action.remove?.(this)
    }

    update(delta: number): void {
        this.currentState = this.currentState.Update(delta)
        this.npc.Update(delta)
    }
}