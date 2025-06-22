import { AttackItemType, DeckType, InventorySlot, ItemId, ItemProperty, ItemType } from "@Glibs/inventory/inventypes";
import { StatKey } from "@Glibs/inventory/stat/stattypes";
import { Bind } from "@Glibs/types/assettypes";

export default interface IInventory {
    GetItem(id: ItemId): InventorySlot | undefined
    GetItemInfo(key: ItemId): ItemProperty
    NewItem(key: ItemId): Promise<IItem | undefined>
    GetNewItem(key: string): Promise<IItem>
}

export interface IItem {
    get Id(): string
    get Name(): string
    get ItemType(): ItemType
    get AutoAttack(): boolean
    get Sound(): string | undefined
    get IconPath(): string
    get Bindable(): boolean
    get Bind(): Bind | undefined
    get Mesh(): THREE.Group | undefined
    get AttackType(): AttackItemType | undefined
    get Stackable(): boolean
    get Deck(): DeckType | undefined
    get Stats(): Partial<Record<string, number>> | undefined
    get Enchantments(): Partial<Record<string, number>> | undefined
}