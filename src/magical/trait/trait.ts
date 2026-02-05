import { ActionContext, IActionComponent, IActionUser, TriggerType } from "@Glibs/types/actiontypes";
import { ActionRegistry } from "@Glibs/actions/actionregistry";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { TraitProperty } from "./traitdefs";



export class Trait implements IActionUser {
    stats?: any
    actions: IActionComponent[] = []
    baseSpec: BaseSpec
    get id() { return this.def.id }
    get icon() { return this.def.icon }
    get name() { return this.def.name }
    get desc() { return this.def.descriptionKr }
    constructor(
        private def: TraitProperty,
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
    tick(target: IActionUser, delta: number): boolean {
        return true
    }
}