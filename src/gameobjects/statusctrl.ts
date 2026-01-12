import { PlayerCtrl } from "@Glibs/actors/player/playerctrl";
import IEventController from "@Glibs/interface/ievent";
import { itemDefs } from "@Glibs/inventory/items/itemdefs";
import { EventTypes } from "@Glibs/types/globaltypes";
import { MonDrop } from "@Glibs/types/monstertypes";
import { AttackOption } from "@Glibs/types/playertypes";
import { DefaultStatusBar } from "@Glibs/ux/menuicons/soul/soulstatusbar";
import { WideStatusBar } from "@Glibs/ux/menuicons/soul/soulstatuswidebar";

export default class StatusCtrl {
    constructor(
        private eventCtrl: IEventController,
        private playerCtrl: PlayerCtrl,
        private heart: DefaultStatusBar,
        private mp: DefaultStatusBar,
        private exp: WideStatusBar,
    ) {
        this.heart.UpdateStatus(100)
        this.mp.UpdateStatus(100)
        this.exp.UpdateStatus(0)
        this.eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            setTimeout(() => {
                const maxH = this.playerCtrl.baseSpec.stats.getStat("hp")
                const curH = this.playerCtrl.baseSpec.status.health
                this.heart.UpdateStatus(curH / maxH * 100)
            })
        })
        this.eventCtrl.RegisterEventListener(EventTypes.Pickup, (drop: MonDrop) => {
            if(drop.itemId == itemDefs.Exp.id) {
                const exp = this.playerCtrl.baseSpec.stats.getStat("exp")
                const curH = this.playerCtrl.baseSpec.status.exp
                this.exp.UpdateStatus(curH / exp * 100) }
        })
    }
}