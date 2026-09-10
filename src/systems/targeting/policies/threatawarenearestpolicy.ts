import { TargetDistanceMode, TargetRecord } from "../targettypes"
import { TargetSelectionContext, TargetSelectionPolicy } from "../targetselectionpolicy"

export type ThreatAwareNearestPolicyOptions = {
    switchMargin: number
    threatLeash: number
}

const DEFAULT_OPTIONS: ThreatAwareNearestPolicyOptions = {
    switchMargin: 1.5,
    threatLeash: 1.4,
}

export class ThreatAwareNearestPolicy implements TargetSelectionPolicy {
    private readonly opts: ThreatAwareNearestPolicyOptions

    constructor(opts: Partial<ThreatAwareNearestPolicyOptions> = {}) {
        this.opts = { ...DEFAULT_OPTIONS, ...opts }
    }

    selectTarget(ctx: TargetSelectionContext): TargetRecord | undefined {
        const current = ctx.currentTargetId ? ctx.registry.get(ctx.currentTargetId) : undefined
        const currentValid = current != undefined
            && this.isAllowed(ctx, current, ctx.maxDistance * this.opts.threatLeash)
        const topThreat = this.resolveTopThreat(ctx)

        if (currentValid && ctx.currentTargetReachable !== false) {
            const currentThreat = ctx.threats.find((entry) => entry.targetId === current.id)?.threat ?? 1
            const shouldSwitch = topThreat != undefined
                && topThreat.id !== current.id
                && this.getThreat(ctx, topThreat.id) >= currentThreat * this.opts.switchMargin
            if (!shouldSwitch) return current
        }

        if (topThreat) return topThreat

        const nearest = ctx.registry.findNearestHostile(ctx.selfId, ctx.maxDistance, ctx.query)
        if (nearest) return nearest

        return ctx.fallbackTargetId ? ctx.registry.get(ctx.fallbackTargetId) : undefined
    }

    private resolveTopThreat(ctx: TargetSelectionContext): TargetRecord | undefined {
        for (const threat of ctx.threats) {
            const target = ctx.registry.get(threat.targetId)
            if (target && this.isAllowed(ctx, target, ctx.maxDistance * this.opts.threatLeash)) {
                return target
            }
        }
        return undefined
    }

    private getThreat(ctx: TargetSelectionContext, targetId: string): number {
        return ctx.threats.find((entry) => entry.targetId === targetId)?.threat ?? 0
    }

    private isAllowed(ctx: TargetSelectionContext, target: TargetRecord, maxDistance: number): boolean {
        if (target.id === ctx.selfId) return false
        if (!target.alive || !target.targetable || !target.collidable) return false
        if (ctx.query?.kinds && !ctx.query.kinds.includes(target.kind)) return false
        if (!ctx.registry.isHostile(ctx.selfId, target.id)) return false
        const mode = ctx.query?.distanceMode ?? TargetDistanceMode.Center
        return ctx.registry.getDistanceToTarget(ctx.selfPos, target, mode) <= maxDistance
    }
}
