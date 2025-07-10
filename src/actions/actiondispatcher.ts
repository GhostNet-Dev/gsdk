import { ActionContext, ActionDef, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes"

export class ActionDispatcher {
  static dispatch(
    actions: IActionComponent[],
    defs: ActionDef[],
    trigger: TriggerType,
    target: IActionUser,
    context?: ActionContext
  ) {
    defs.forEach((def, i) => {
      if (def.trigger === trigger) {
        const action = actions[i]
        if (action.isAvailable?.(context)) {
          action.activate?.(target, context)
        }
      }
    })
  }
}
