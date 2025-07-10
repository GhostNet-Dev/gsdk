import { ActionDef, IActionComponent } from "@Glibs/types/actiontypes"


type ActionBuilder = (def: ActionDef) => IActionComponent

export class ActionRegistry {
  private static builders = new Map<string, ActionBuilder>()

  static register(type: string, builder: ActionBuilder) {
    this.builders.set(type, builder)
  }

  static create(def: ActionDef): IActionComponent {
    const builder = this.builders.get(def.type)
    if (!builder) throw new Error(`Unknown action type: ${def.type}`)
    return builder(def)
  }
}
