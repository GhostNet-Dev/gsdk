import { Loader } from "@Glibs/loader/loader";
import { Inventory } from "./inventory";
import { Item } from "./items/item";
import IEventController from "@Glibs/interface/ievent";
import { itemDefs } from "./items/itemdefs";


export class InvenFactory {
    inven = new Inventory(this.event, this.loader)
    invenHouse = new Inventory(this.event, this.loader)

    get ItemDb() { return itemDefs }
    constructor(private loader: Loader, private event: IEventController) { }

    LoadItems(load: Inventory) {
        this.invenHouse = load
    }
    Merge() {
        const s = this.inven.data
        const d = this.invenHouse.data
        for (let i = 0; i < s.inventroySlot.length; i++ ) {
            const e = s.inventroySlot[i]
            const find = d.inventroySlot.find((slot) => slot.item.Id == e.item.Id)
            if(find) {
                find.count += e.count
                continue
            }
            d.inventroySlot.push(e)
        }
    }
}