import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes";
import { BuffProperty } from "./buffdefs";
import { ActionRegistry } from "@Glibs/actions/actionregistry";
import { BaseSpec } from "@Glibs/actors/battle/basespec";



export class Buff implements IActionUser {
    stats?: any
    actions: IActionComponent[] = []
    baseSpec: BaseSpec
    get id() { return this.def.id }
    get icon() { return this.def.icon }
    get name() { return this.def.name }
    get desc() { return this.def.descriptionKr }
    get duration() { return this.def.duration }
    constructor(
        private def: BuffProperty,
    ) {
        this.stats = ("stats" in def) ? def.stats : undefined
        this.baseSpec = new BaseSpec(this.stats, this)
        if ("actions" in def) {
            this.actions = def.actions.map((a: any) => ActionRegistry.create(a))
        }
    }
    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this, ctx)
        action.activate?.(this, ctx)
    }
    removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
        action.deactivate?.(this, context)
        action.remove?.(this)
    }
    activate(context?: ActionContext) {
        for (const action of this.actions) {
            action.activate?.(this, context)
        }
    }
    deactivate(context?: ActionContext) {
        for (const action of this.actions) {
            action.deactivate?.(this, context)
        }
    }
    trigger(triggerType: TriggerType, context?: ActionContext) {
        for (const action of this.actions) {
            action.trigger?.(this, triggerType, context)
        }
    }

    tick(target: IActionUser, delta: number): boolean {
        return true
    }
}