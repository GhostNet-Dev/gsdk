import { TargetSelectionContext, TargetSelectionPolicy } from "../targetselectionpolicy"

export class NearestHostilePolicy implements TargetSelectionPolicy {
    selectTarget(ctx: TargetSelectionContext) {
        const nearest = ctx.registry.findNearestHostile(ctx.selfId, ctx.maxDistance, ctx.query)
        if (nearest) return nearest
        return ctx.fallbackTargetId ? ctx.registry.get(ctx.fallbackTargetId) : undefined
    }
}
