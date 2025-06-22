import { IItem } from "@Glibs/interface/iinven"
import { AttackItemType, ItemProperty, ItemType } from "@Glibs/inventory/inventypes"


export class Item implements IItem {
    get Id() { return this.property.id }
    get ItemType() { return this.property.type }
    get IconPath() { return this.property.icon }
    get Bindable() { return this.property.binding }
    get Bind() { return this.property.bind }
    get Mesh() { return this.property.meshs }
    get Name() { return this.property.name }
    get AttackType() { return this.property.weapon }
    get AutoAttack() { return this.property.autoAttack ?? false }
    get Stackable() { return this.property.stackable }
    get Deck() { return this.property.deck }
    get Sound() {return this.property.sound}
    get Stats() { return this.property.stats }
    get Enchantments() { return this.property.enchantments }
    constructor(public property: ItemProperty) {}

    async Loader() {
        const asset = this.property.asset
        if (asset == undefined) return
        //const [meshs, _exist] = await asset.UniqModel(this.property.name)
        const meshs = await asset.CloneModel()
        this.property.meshs = meshs
    }
}
