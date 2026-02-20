import { PlayerCtrl } from "@Glibs/actors/player/playerctrl";
import IEventController from "@Glibs/interface/ievent";
import { itemDefs } from "@Glibs/inventory/items/itemdefs";
import { Buff } from "@Glibs/magical/buff/buff";
import { EventTypes } from "@Glibs/types/globaltypes";
import { MonDrop } from "@Glibs/types/monstertypes";
import { AttackOption } from "@Glibs/types/playertypes";
import { BuffStatus } from "@Glibs/ux/hud/soul/soulbuffstatus";
import { DefaultStatusBar } from "@Glibs/ux/hud/soul/soulstatusbar";
import { WideStatusBar } from "@Glibs/ux/hud/soul/soulstatuswidebar";
import { SkillSlotsOptions, SkillSlotsUX } from "@Glibs/ux/skillslots/skillslots";

export default class StatusCtrl {
    constructor(
        private eventCtrl: IEventController,
        private playerCtrl: PlayerCtrl,
        private heart: DefaultStatusBar,
        private mp: DefaultStatusBar,
        private exp: WideStatusBar,
        private buff: BuffStatus,
        skillSlotOptions?: Partial<SkillSlotsOptions>,
    ) {
        const skillSlots = new SkillSlotsUX(this.eventCtrl, skillSlotOptions)
        skillSlots.Show()

        this.heart.UpdateStatus(100)
        this.mp.UpdateStatus(100)
        this.exp.UpdateStatus(0)
        this.eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            setTimeout(() => {
                const maxH = this.playerCtrl.baseSpec.stats.getStat("hp")
                const curH = this.playerCtrl.baseSpec.status.health
                this.heart.UpdateStatus(Math.floor(curH / maxH * 100))
            })
        })
        this.eventCtrl.RegisterEventListener(EventTypes.Pickup, (drop: MonDrop) => {
            if(drop.itemId == itemDefs.Exp.id) {
                const exp = this.playerCtrl.baseSpec.status.maxExp
                const curH = this.playerCtrl.baseSpec.status.exp
                this.exp.UpdateStatus(Math.floor(curH / exp * 100))
            }
        })
        this.eventCtrl.RegisterEventListener(EventTypes.LevelUp, () => {
            const exp = this.playerCtrl.baseSpec.status.maxExp
            const curH = this.playerCtrl.baseSpec.status.exp
            this.exp.UpdateStatus(Math.floor(curH / exp * 100))
        })
        this.eventCtrl.RegisterEventListener(EventTypes.UpdateBuff + "player", (buff: Buff) => {
            this.buff.addBuff({
                id: buff.id,
                icon: buff.icon,
                name: buff.name,
                desc: buff.desc,
                duration: buff.duration,
            })
        })
    }
}