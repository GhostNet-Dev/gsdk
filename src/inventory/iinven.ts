import { AttackItemType, DeckType, InventorySlot, ItemType } from "@Glibs/inventory/inventypes";
import { ItemId, ItemProperty } from "@Glibs/inventory/items/itemdefs";
import { IActionComponent } from "@Glibs/types/actiontypes";
import { Bind } from "@Glibs/types/assettypes";

export default interface IInventory {
    EquipItem(item: IItem): void
    UnequipItem(bind: Bind): void
    GetItemSlot(id: ItemId): InventorySlot | undefined
    GetItemInfo(key: ItemId): ItemProperty
    NewItem(key: ItemId): Promise<IItem | undefined>
    GetNewItem(key: ItemId): Promise<IItem>
}

export interface IItem {
    get UniqId(): string
    get Id(): string
    get Name(): string
    get ItemType(): ItemType
    get AutoAttack(): boolean
    get Sound(): string | undefined
    get IconPath(): string
    get Bindable(): boolean
    get Bind(): Bind | undefined
    get Mesh(): THREE.Group | undefined
    get Actions(): readonly IActionComponent[] | undefined
    get AttackType(): AttackItemType | undefined
    get Stackable(): boolean
    get Stats(): Partial<Record<string, number>> | undefined
    get Enchantments(): Partial<Record<string, number>> | undefined
    get Description(): string
}