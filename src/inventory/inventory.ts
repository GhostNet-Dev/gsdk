import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { InvenData, InventorySlot } from "@Glibs/inventory/inventypes";
import { Item } from "./items/item";
import IInventory, { IItem } from "@Glibs/interface/iinven";
import { ItemId, itemDefs } from "./items/itemdefs";
import { Loader } from "@Glibs/loader/loader";
import { Bind } from "@Glibs/types/assettypes";
import { ItemFactory } from "./itemfactory";


export class Inventory implements IInventory {
    data: InvenData = {
        bodySlot: [],
        inventroySlot: []
    }
    MaxSlot = 0
    bodySlot = new Map<string, IItem>()

    constructor(
        private event: IEventController,
        private loader: Loader,
        { maxSlot = 15 } = {},
    ) {
        this.MaxSlot = maxSlot
        this.event.RegisterEventListener(EventTypes.UseItem, (id: ItemId, count: number) => {
            const find = this.data.inventroySlot.find((slot) => slot.item.Id == id)
            if(find && find.count >= count) {
                console.log("use item: ", id, count)
                find.count -= count
                if(find.count == 0) this.data.inventroySlot.splice(this.data.inventroySlot.indexOf(find), 1)
            }
        })
        this.event.RegisterEventListener(EventTypes.DiscardItem, (id: ItemId) => {
            const find = this.data.inventroySlot.find((slot) => slot.item.Id == id)
            if (find) {
                console.log("discard item: ", id)
                this.data.inventroySlot.splice(this.data.inventroySlot.indexOf(find), 1)
            }
        })
    }
    EquipItem(item: IItem) {
        let bind = item.Bind;
        if (!bind) throw new Error("item bind is undefined");

        // Logic override for UI/Inventory purposes
        if (item.ItemType === "rangeattack") {
            bind = Bind.Weapon_Ranged;
        } else if (item.ItemType === "meleeattack") {
            bind = Bind.Hands_R;
        }

        const prevItem = this.bodySlot.get(bind)
        if (prevItem) this.InsertInventory(prevItem)

        const index = this.data.inventroySlot.findIndex(slot => slot.item.UniqId === item.UniqId);
        if (index > -1) {
            this.data.inventroySlot.splice(index, 1);
        }
        this.bodySlot.set(bind, item)
    }
    UnequipItem(bind: Bind): void {
        const prevItem = this.bodySlot.get(bind)
        if (prevItem) this.InsertInventory(prevItem)
        this.bodySlot.delete(bind)
    }
    GetBindingItem(bind: Bind) {
        return this.bodySlot.get(bind)
    }
    InsertInventory(item: IItem) {
        const find = this.data.inventroySlot.find((slot) => slot.item.Id == item.Id)
        if (find && item.Stackable) {
            find.count++
            return
        }
        this.data.inventroySlot.push({ item: item, count: 1 })
    }
    GetItemSlot(id: ItemId) {
        return this.data.inventroySlot.find(e => e.item.Id == id)
    }
    private getAsset(key: ItemId) {
        const itemProperty = itemDefs[key]
        return ("assetKey" in itemProperty) ? this.loader.GetAssets(itemProperty.assetKey) : undefined
    }
    async NewItem(key: ItemId) {
        if (this.data.inventroySlot.length == this.MaxSlot) {
            this.event.SendEventMessage(EventTypes.AlarmWarning, "인벤토리가 가득찼습니다.")
            return
        }
        const item = new Item(ItemFactory.generateUniqueId(), itemDefs[key], this.getAsset(key))
        await item.Loader()

        const find = this.data.inventroySlot.find((slot) => slot.item.Id == item.Id)
        if (find && find.item.Stackable) {
            find.count++
            return item
        }

        this.data.inventroySlot.push({ item: item, count: 1 })
        return item
    }
    // MoveToInvenFromBindItem(pos: Bind) {
    //     const item = this.data.bodySlot[pos]
    //     const index = this.data.bodySlot.indexOf(item)
    //     if (index < 0) throw new Error("there is no item");
    //     this.data.bodySlot.splice(index, 1)

    //     this.data.inventroySlot.push({ item: item, count: 1 })
    // }
    // MoveToBindFromInvenItem(pos: Bind, item:IItem) {
    //     const find = this.data.inventroySlot.find((slot) => slot.item.Id == item.Id)
    //     if (find == undefined) throw new Error("there is no item");
    //     const index = this.data.inventroySlot.indexOf(find)
    //     this.data.inventroySlot.splice(index, 1)

    //     this.data.bodySlot[pos] = item
    // }
    GetInventory(i: number): InventorySlot {
        return this.data.inventroySlot[i]
    }
    GetInventories(): InventorySlot[] {
        return this.data.inventroySlot
    }

    // GetBindItem(pos: Bind) {
    //     return this.data.bodySlot[pos]
    // }
    GetItemInfo(key: ItemId) {
        return itemDefs[key]
    }
    async GetNewItem(key: ItemId) {
        const item = new Item(ItemFactory.generateUniqueId(), itemDefs[key], this.getAsset(key))
        await item.Loader()
        return item
    }
    Copy(inven: InvenData) {
        const data: InvenData = { bodySlot: [], inventroySlot: [] }

        let index = inven.inventroySlot.length - 1
        while (index >= 0) {
            const slot = inven.inventroySlot[index]
            const id = (slot.item as Item).property.id
            if (id) {
                const existItem = data.inventroySlot.find((e) => e.item.Id == id)
                if (existItem) {
                    existItem.count += slot.count
                    inven.inventroySlot.splice(index, 1)
                } else {
                    data.inventroySlot.push({
                        item: new Item(ItemFactory.generateUniqueId(), itemDefs[id]),
                        count: slot.count
                    })
                }
            } else inven.inventroySlot.splice(index, 1)
            index--
        }
        inven.inventroySlot.length = 0
        inven.inventroySlot.push(...data.inventroySlot)
        this.data = inven
    }
    Clear() {
        this.data.bodySlot.length = 0
        this.data.inventroySlot.length = 0
    }

}
