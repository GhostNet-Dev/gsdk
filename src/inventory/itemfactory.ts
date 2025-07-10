import { Item } from "./items/item"
import { itemDefs } from "./items/itemdefs"

export class ItemFactory {
  static createItem(id: keyof typeof itemDefs): Item {
    const def = itemDefs[id]
    return new Item(def)
  }
}
