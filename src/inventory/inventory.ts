import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { InvenData, InventorySlot, ItemId } from "@Glibs/inventory/inventypes";
import { ItemDb } from "./items/itemdb";
import { Item } from "./items/item";
import IInventory, { IItem } from "@Glibs/interface/iinven";
import { Bind } from "@Glibs/types/assettypes";

const maxSlot = 15

export class Inventory implements IInventory {
    data: InvenData = {
        bodySlot: [],
        inventroySlot: []
    }

    constructor(private itemDb: ItemDb, private event: IEventController) {
    }
    InsertInventory(item: IItem) {
        const find = this.data.inventroySlot.find((slot) => slot.item.Id == item.Id)
        if (find && item.Stackable) {
           find.count++ 
           return
        }
        this.data.inventroySlot.push({ item: item, count: 1 })
    }
    GetItem(id: ItemId) {
        return this.data.inventroySlot.find(e => e.item.Id == id)
    }
    async NewItem(key: ItemId) {
        if(this.data.inventroySlot.length == maxSlot) {
            this.event.SendEventMessage(EventTypes.AlarmWarning, "인벤토리가 가득찼습니다.")
            return 
        }
        const item = new Item(this.itemDb.GetItem(key))
        await item.Loader()

        const find = this.data.inventroySlot.find((slot) => slot.item.Id == item.Id)
        if (find && find.item.Stackable) {
           find.count++ 
           return item
        }

        this.data.inventroySlot.push({ item: item, count: 1 })
        return item
    }
    MoveToInvenFromBindItem(pos: Bind) {
        const item = this.data.bodySlot[pos]
        const index = this.data.bodySlot.indexOf(item)
        if (index < 0) throw new Error("there is no item");
        this.data.bodySlot.splice(index, 1)

        this.data.inventroySlot.push({ item: item, count: 1 })
    }
    MoveToBindFromInvenItem(pos: Bind, item:IItem) {
        const find = this.data.inventroySlot.find((slot) => slot.item.Id == item.Id)
        if (find == undefined) throw new Error("there is no item");
        const index = this.data.inventroySlot.indexOf(find)
        this.data.inventroySlot.splice(index, 1)
        
        this.data.bodySlot[pos] = item
    }
    GetInventory(i: number): InventorySlot {
        return this.data.inventroySlot[i]
    }

    GetBindItem(pos: Bind) {
        return this.data.bodySlot[pos]
    }
    GetItemInfo(key: ItemId) {
        return this.itemDb.GetItem(key)
    }
    async GetNewItem(key: string) {
        const item = new Item(this.itemDb.GetItem(key))
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
                if(existItem) {
                    existItem.count += slot.count
                    inven.inventroySlot.splice(index, 1)
                } else {
                    data.inventroySlot.push({
                        item: new Item(this.itemDb.GetItem(id)),
                        count: slot.count
                    })
                }
            } else inven.inventroySlot.splice(index, 1)
            index --
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