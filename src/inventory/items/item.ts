import { IItem } from "@Glibs/interface/iinven"
import { AttackItemType, ItemProperty, ItemType } from "@Glibs/inventory/inventypes"


export class Item implements IItem {
    get Id() { return this.property.id }
    get DamageMin() { return (this.property.damageMin == undefined) ? 0 : this.property.damageMin }
    get DamageMax() { return (this.property.damageMax == undefined) ? 0 : this.property.damageMax }
    get ItemType() { return this.property.type }
    get Speed() { return (this.property.speed == undefined) ? 0 : this.property.speed }
    get IconPath() { return this.property.icon }
    get Bindable() { return this.property.binding }
    get Bind() { return this.property.bind }
    get Mesh() { return this.property.meshs }
    get Name() { return this.property.name }
    get AttackType() { return this.property.weapon }
    get AttackRange() { return this.property.attackRange ?? 1 }
    get AutoAttack() { return this.property.autoAttack ?? false }
    get Stackable() { return this.property.stackable }
    get Deck() { return this.property.deck }
    get Sound() {return this.property.sound}
    constructor(public property: ItemProperty) {}

    MakeInformation() {
        const infos = new Array<{k?: string, v: string}>()
        const p = this.property
        infos.push({v: p.name})
        switch(p.type) {
            case ItemType.Attack: 
                switch (p.weapon) {
                    case AttackItemType.Blunt:  infos.push({ k: "Weapon", v: "Blunt" }); break;
                    case AttackItemType.Axe:    infos.push({ k: "Weapon", v: "Axe" }); break;
                    case AttackItemType.Bow:    infos.push({ k: "Weapon", v: "Bow" }); break;
                    case AttackItemType.Gun:    infos.push({ k: "Weapon", v: "Gun" }); break;
                    case AttackItemType.Knife:  infos.push({ k: "Weapon", v: "Knife" }); break;
                    case AttackItemType.Sword:  infos.push({ k: "Weapon", v: "Sword" }); break;
                    case AttackItemType.Wand:   infos.push({ k: "Weapon", v: "Wand" }); break;
                }
                break;
            case ItemType.Shield:   infos.push({v: "Shield"}); break;
            case ItemType.Armor:    infos.push({v: "Armor"}); break;
            case ItemType.Potion:   infos.push({v: "Potion"}); break;
            case ItemType.Material: infos.push({v: "Material"}); break;
        }
        if (p.damageMax != undefined) {
            infos.push({ k:"공격력",  v: p.damageMin + " ~ " + p.damageMax })
        }
        if (p.speed != undefined) {
            infos.push({ k: "공속", v: p.speed.toString() })
        }
        return infos
    }
    async Loader() {
        const asset = this.property.asset
        if (asset == undefined) return
        //const [meshs, _exist] = await asset.UniqModel(this.property.name)
        const meshs = await asset.CloneModel()
        this.property.meshs = meshs
    }
}
