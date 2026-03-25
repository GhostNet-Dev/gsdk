import { ControllableDefinition } from "./controllabletypes"

export class ControllableDb {
  private readonly db = new Map<string, ControllableDefinition>()

  register(def: ControllableDefinition) {
    this.db.set(def.id, def)
  }

  get(id: string): ControllableDefinition {
    const found = this.db.get(id)
    if (!found) throw new Error(`unknown controllable id: ${id}`)
    return found
  }
}
