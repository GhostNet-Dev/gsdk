import { IBuffItem } from "../../buff/buff";
import { Inventory } from "../../inventory/inventory";
import { Bind } from "../../loader/assetmodel";
import { PlayerStatus } from "./playerctrl";
const defaultStatus: PlayerStatus = {
    level: 1,
    maxHealth: 100,
    health: 100,
    maxMana: 100,
    mana: 100,
    maxExp: 100,
    exp: 0,
}

export class PlayerSpec {
    attackSpeed = 2
    attackDamageMax = 1
    attackDamageMin = 1

    defence = 1

    status: PlayerStatus = { ...defaultStatus }
    buff?:IBuffItem[]

    get AttackSpeed() {
        let ret = this.attackSpeed
        if(this.buff != undefined) {
            this.buff.forEach((b) => {
                ret *= b.GetAttackSpeed()
            })
        }
        return ret
    }
    get AttackDamageMax() {
        let ret = this.attackDamageMax
        if(this.buff != undefined) {
            this.buff.forEach((b) => {
                ret *= b.GetDamageMax()
            })
        }
        return ret
    }
    get AttackDamageMin() {
        return this.attackDamageMin
    }
    get Status() { return this.status}
    get Health() { return this.status.health }

    constructor(private inven: Inventory) { }

    SetBuff(buff: IBuffItem[]) {
        this.buff = buff
    }
    
    ResetStatus() {
        this.status = { ...defaultStatus }
    }
    NextLevelUp() {
        this.status.level++
        this.ItemUpdate()
        this.HealthLevelUp()
    }
    DefaultLevelSpec() {
        this.attackSpeed = 2 
        this.attackDamageMax = 1 * this.status.level
        this.attackDamageMin = 1 * this.status.level
        this.defence = 1 * this.status.level * 10
    }
    HealthLevelUp() {
        /*
        const h = this.status.maxHealth 
        this.status.maxHealth += this.status.level * 100 
        this.status.health += this.status.maxHealth - h

        this.status.maxMana += this.status.level * 100
        this.status.mana = this.status.maxMana
        */
        this.status.maxExp += this.status.level * 50
        this.status.exp = 0
    }
    ItemUpdate () {
        this.DefaultLevelSpec()
        const handItem = this.inven.GetBindItem(Bind.Hands_R)
        if (handItem != undefined) {
            this.attackSpeed = handItem.Speed
            this.attackDamageMax += handItem.DamageMax
            this.attackDamageMin += handItem.DamageMin
        }
    }
    ReceiveExp(exp: number) {
        this.status.exp += exp
        if (this.status.exp > this.status.maxExp) {
            this.NextLevelUp()
        }
    }
    ReceiveCalcDamage(damage: number) {
        this.status.health -= Math.round((5500 / (5500 + this.defence)) * damage)
    }
    ReceiveCalcHeal(heal: number) {
        if(this.status.health >= this.status.maxHealth) {
            this.status.health = this.status.maxHealth
            return
        } 
        this.status.health +=  heal
    }
    CheckDie(): boolean {
        return (this.status.health <= 0)
    }
    Update(delta: number) {
        this.buff?.forEach((b) => {
            b.Update(delta, this.status)
        })
    }
}