import { PlayerCtrl } from "@Glibs/actors/player/playerctrl";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { AttackOption } from "@Glibs/types/playertypes";
import StatusBar from "@Glibs/ux/menuicons/statusbar";

export default class StatusCtrl {
    constructor(
        private eventCtrl: IEventController,
        private playerCtrl: PlayerCtrl,
        private heart: StatusBar,
    ) {
        this.heart.UpdateStatus(100)
        this.eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            setTimeout(() => {
                const maxH = this.playerCtrl.baseSpec.stats.getStat("hp")
                const curH = this.playerCtrl.baseSpec.status.health
                this.heart.UpdateStatus(curH / maxH * 100)
            })
        })
    }
}