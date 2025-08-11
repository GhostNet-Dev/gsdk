import { Item } from "./items/item"
import { itemDefs } from "./items/itemdefs"

export class ItemFactory {
  static createItem(id: keyof typeof itemDefs): Item {
    const def = itemDefs[id]
    return new Item(ItemFactory.generateUniqueId(), def)
  }
  static generateUniqueId(): string {
    const timestamp: number = Date.now();
    const randomPart: number = Math.floor(Math.random() * 10000);
    return `${timestamp}-${randomPart}`;
  }
}
