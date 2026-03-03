import { PlayerCtrl } from "@Glibs/actors/player/playerctrl";
import IEventController from "@Glibs/interface/ievent";
import { itemDefs } from "@Glibs/inventory/items/itemdefs";
import { Buff } from "@Glibs/magical/buff/buff";
import { EventTypes, ResourceChangedPayload } from "@Glibs/types/globaltypes";
import { MonDrop } from "@Glibs/types/monstertypes";
import { BuffStatus } from "@Glibs/ux/hud/soul/soulbuffstatus";
import { DefaultStatusBar } from "@Glibs/ux/hud/soul/soulstatusbar";
import { WideStatusBar } from "@Glibs/ux/hud/soul/soulstatuswidebar";

export default class StatusCtrl {
    constructor(
        private eventCtrl: IEventController,
        private playerCtrl: PlayerCtrl,
        private heart: DefaultStatusBar,
        private mp: DefaultStatusBar,
        private sp: DefaultStatusBar,
        private exp: WideStatusBar,
        private buff: BuffStatus,
    ) {
        const toPercent = (current: number, max: number) => {
            if (max <= 0) return 0
            return Math.max(0, Math.min(100, Math.floor((current / max) * 100)))
        }

        const hpMax = this.playerCtrl.baseSpec.stats.getStat("hp")
        const mpMax = this.playerCtrl.baseSpec.stats.getStat("mp")
        const spMax = this.playerCtrl.baseSpec.stats.getStat("stamina")
        const expMax = this.playerCtrl.baseSpec.status.maxExp
        this.heart.UpdateStatus(toPercent(this.playerCtrl.baseSpec.status.health, hpMax))
        this.mp.UpdateStatus(toPercent(this.playerCtrl.baseSpec.status.mana, mpMax))
        this.sp.UpdateStatus(toPercent(this.playerCtrl.baseSpec.status.stamina, spMax))
        this.exp.UpdateStatus(toPercent(this.playerCtrl.baseSpec.status.exp, expMax))

        this.eventCtrl.RegisterEventListener(EventTypes.ResourceChanged + "player", (e: ResourceChangedPayload) => {
            const max = e.max ?? 1
            const percent = toPercent(e.next, max)
            if (e.key == "hp") {
                this.heart.UpdateStatus(percent)
            } else if (e.key == "mp") {
                this.mp.UpdateStatus(percent)
            } else if (e.key == "stamina") {
                this.sp.UpdateStatus(percent)
            } else if (e.key == "exp") {
                this.exp.UpdateStatus(percent)
            }
        })

        // 공격 피격 등 기존 데미지 이벤트 기반 갱신은 호환을 위해 유지
        this.eventCtrl.RegisterEventListener(EventTypes.Attack + "player", () => {
            setTimeout(() => {
                const maxH = this.playerCtrl.baseSpec.stats.getStat("hp")
                const curH = this.playerCtrl.baseSpec.status.health
                this.heart.UpdateStatus(toPercent(curH, maxH))
            })
        })
        this.eventCtrl.RegisterEventListener(EventTypes.Pickup, (drop: MonDrop) => {
            if(drop.itemId == itemDefs.Exp.id) {
                const exp = this.playerCtrl.baseSpec.status.maxExp
                const curH = this.playerCtrl.baseSpec.status.exp
                this.exp.UpdateStatus(toPercent(curH, exp))
            }
        })
        this.eventCtrl.RegisterEventListener(EventTypes.LevelUp, () => {
            const exp = this.playerCtrl.baseSpec.status.maxExp
            const curH = this.playerCtrl.baseSpec.status.exp
            this.exp.UpdateStatus(toPercent(curH, exp))
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