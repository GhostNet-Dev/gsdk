import * as THREE from "three";
import { AreaAttack, AttackUp, Healing } from "./buffitem"
import { IBuffItem } from "@Glibs/interface/ibuff";
import { AttackOption, AttackType } from "@Glibs/types/playertypes";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { EventFlag } from "@Glibs/types/eventtypes";



export class Buff {
    buffItem: IBuffItem[] = [
        new AttackUp(),
        new AreaAttack(this.eventCtrl),
        new Healing(this.eventCtrl),
    ]
    userBuff: IBuffItem[] = []

    constructor(private eventCtrl: IEventController) {
        eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                switch(opt.type) {
                    case AttackType.Buff:
                        break;
                }
            })
        })
         eventCtrl.RegisterEventListener(EventTypes.AppMode, (e: EventFlag) => {
            switch (e) {
                case EventFlag.Start:
                    this.buffItem.forEach(b => {
                        b.lv = 0
                    })
                    this.userBuff.length = 0
                    break
                case EventFlag.End:
                    this.buffItem.forEach(b => {
                        b.lv = 0
                    })
                    this.userBuff.length = 0
                    break
            }
        })
    }

    GetRandomBuff() {
        const randBuff: IBuffItem[] = []
        const ticket = [...Array(this.buffItem.length).keys()]
        for (let i = 0; i < 3; i++) {
            const r = THREE.MathUtils.randInt(0, ticket.length - 1)
            const rbuff = ticket[r]
            ticket.splice(ticket.indexOf(rbuff), 1)
            randBuff.push(this.buffItem[rbuff])
        }
        return randBuff
    }
    SelectBuff(buff: IBuffItem) {
        const exist = this.userBuff.indexOf(buff)
        if(exist < 0) {
            this.userBuff.push(buff)
        }
        buff.IncreaseLv()
        this.eventCtrl.SendEventMessage(EventTypes.UpdateBuff, this.userBuff)
    }
    GetBuff() {
        return this.userBuff
    }
}