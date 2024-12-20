import { AttackItemType, DeckType, InventorySlot, ItemId, ItemProperty, ItemType } from "@Glibs/inventory/inventypes";
import { Bind } from "@Glibs/types/assettypes";

export default interface IInventory {
    GetItem(id: ItemId): InventorySlot | undefined
    GetItemInfo(key: ItemId): ItemProperty
    GetBindItem(pos: Bind): IItem
    NewItem(key: ItemId): Promise<IItem | undefined>
    GetNewItem(key: string): Promise<IItem>
}

export interface IItem {
    get Id(): string
    get Name(): string
    get DamageMin(): number
    get DamageMax(): number
    get ItemType(): ItemType
    get Speed(): number
    get IconPath(): string
    get Bindable(): boolean
    get Bind(): Bind | undefined
    get Mesh(): THREE.Group | undefined
    get AttackType(): AttackItemType | undefined
    get Stackable(): boolean
    get Deck(): DeckType | undefined
    MakeInformation(): Array<{k?: string, v: string}>
}