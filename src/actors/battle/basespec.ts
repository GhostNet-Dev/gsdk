import { IItem } from "@Glibs/interface/iinven"
import { Bind } from "@Glibs/types/assettypes"
import { Modifier } from "@Glibs/inventory/stat/modifier"
import { StatApplyMode, StatKey } from "@Glibs/inventory/stat/stattypes"
import { StatSystem } from "@Glibs/inventory/stat/statsystem"
import { CharacterStatus } from "./charstatus"
import { IActionUser } from "@Glibs/types/actiontypes"
import { Buffdefs } from "@Glibs/magical/buff/buffdefs"
import { Buff } from "@Glibs/magical/buff/buff"



export class BaseSpec {
    attackDamageMax = 1
    attackDamageMin = 1

    defence = 2


    stats: StatSystem
    equipment: Record<string, IItem | null> = {};
    attack = 1
    strength = 1
    skillMultiplier = 1
    status: CharacterStatus

    get AttackSpeed() { return this.stats.getStat("attackSpeed") }
    get AttackRange() { return this.stats.getStat("attackRange") }
    get Speed() { return this.stats.getStat("speed") }
    get Damage() {
        return this.stats.getStat("attack")
    }

    get AttackDamageMax() {
        let ret = this.attackDamageMax
        return ret
    }
    get AttackDamageMin() {
        return this.attackDamageMin
    }
    get Status() { return this.status}
    get Health() { return this.status.health }

    constructor( 
        stats: Partial<Record<StatKey, number>>,
        private owner: IActionUser,
    ) {
        this.stats = new StatSystem(stats);
        this.status = {
            level: 1,
            health: this.stats.getStat("hp"),
            mana: this.stats.getStat("mp"),
            stamina: this.stats.getStat("stamina"),
            maxExp: 100,
            exp: 0,
            immortal: false,
            stats,
        }
        this.ResetStatus()
    }

    ResetStatus() {
        this.status.level = 1
        this.status.health = this.stats.getStat("hp")
        this.status.mana = this.stats.getStat("mp")
        this.status.stamina = this.stats.getStat("stamina")
        this.status.maxExp = 100
        this.status.immortal = false
    }
    NextLevelUp() {
        this.status.level++
        this.HealthLevelUp()
    }
    DefaultLevelSpec() {
        this.attackDamageMax = 1 * this.status.level
        this.attackDamageMin = 1 * this.status.level
        this.defence = 1 * this.status.level * 10
    }
    HealthLevelUp() {
        this.status.maxExp += this.status.level * 50
        this.status.exp = 0
    }
    GetBindItem(slot: Bind) {
        return this.equipment[slot]
    }
    Buff(buff: Buff) {
        if ("actions" in buff && buff.actions && Array.isArray(buff.actions)) {
            for (const action of buff.actions) {
                // ❗ baseSpec은 IActionUser가 아님 → 위임 필요
                this.owner?.applyAction(action)
            }
        }
    }
    RemoveBuff(buff: Buff) {
        if ("actions" in buff && buff.actions && Array.isArray(buff.actions)) {
            for (const action of buff.actions) {
                this.owner?.removeAction(action)
            }
        }
    }
    Equip(item: IItem) {
        if (item.Bind == undefined) throw new Error("item bind is undefined")
        const prevItem = this.equipment[item.Bind];
        if (prevItem) {
            this.removeItemModifiers(prevItem);
        }
        // 🔥 핵심: ActionComponent 실행
        if (item.Actions) {
            for (const action of item.Actions) {
                // ❗ baseSpec은 IActionUser가 아님 → 위임 필요
                this.owner?.applyAction(action, { via: "item", source: item })
            }
        }

        this.equipment[item.Bind] = item;
        this.addItemModifiers(item);
    }

    Unequip(slot: string) {
        const item = this.equipment[slot];
        if (item) {
            this.removeItemModifiers(item);
            this.equipment[slot] = null;
        }
    }

    isEquipped(itemId: string): boolean {
        return Object.values(this.equipment).some(item => item?.Id === itemId);
    }

    getEquippedItems(): IItem[] {
        return Object.values(this.equipment).filter((item): item is IItem => !!item);
    }

    private addItemModifiers(item: IItem) {
        if (item.Stats) {
            Object.entries(item.Stats).forEach(([k, v]) => {
                const key = k as StatKey
                const apply = StatApplyMode[key] || 'add';
                this.stats.addModifier(new Modifier(key, v!, apply, `item:${item.Id}`));
            });
        }
        if (item.Enchantments) {
            Object.entries(item.Enchantments).forEach(([k, v]) => {
                const key = k as StatKey
                const apply = StatApplyMode[key] || 'add';
                this.stats.addModifier(new Modifier(key, v!, apply, `enchant:${item.Id}`));
            });
        }
    }

    private removeItemModifiers(item: IItem) {
        this.stats.removeModifierBySource(`item:${item.Id}`);
        this.stats.removeModifierBySource(`enchant:${item.Id}`);
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
        if(this.status.health >= this.stats.getStat("hp")) {
            this.status.health = this.stats.getStat("hp")
            return
        } 
        this.status.health +=  heal
    }
    CheckDie(): boolean {
        return (this.status.immortal == false && this.status.health <= 0)
    }
}