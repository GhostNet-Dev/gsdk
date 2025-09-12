import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import IInventory from "@Glibs/interface/iinven";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { Npc } from "./npc";
import { BaseSpec } from "../battle/basespec";
import { DefaultStatus } from "@Glibs/types/playertypes";

export class NpcCtrl implements ILoop, IActionUser {
    LoopId = 0
    baseSpec: BaseSpec
    constructor(
        private npc: Npc,
        public inventory: IInventory,
        private gphysic: IGPhysic,
        private camera: THREE.Camera,
        private eventCtrl: IEventController,
    ) {
        this.baseSpec = new BaseSpec(DefaultStatus.stats, this)
    }
    applyAction(action: IActionComponent, context?: ActionContext | undefined): void {

    }

    update(delta: number): void {

    }
}