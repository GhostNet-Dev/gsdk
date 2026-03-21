import { Loader } from "@Glibs/loader/loader";
import { Inventory } from "./inventory";
import { Item } from "./items/item";
import IEventController from "@Glibs/interface/ievent";
import { itemDefs } from "./items/itemdefs";
import { WalletManager } from "./wallet";


export class InvenFactory {
    inven: Inventory;
    invenHouse: Inventory;

    get ItemDb() { return itemDefs }
    constructor(private loader: Loader, private event: IEventController, private wallet: WalletManager) {
        this.inven = new Inventory(this.event, this.loader, this.wallet);
        this.invenHouse = new Inventory(this.event, this.loader, this.wallet);
    }

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