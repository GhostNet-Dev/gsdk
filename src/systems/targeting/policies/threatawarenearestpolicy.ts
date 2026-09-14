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
        this.opts = {
            switchMargin: opts.switchMargin ?? DEFAULT_OPTIONS.switchMargin,
            threatLeash: opts.threatLeash ?? DEFAULT_OPTIONS.threatLeash,
        }
    }

    selectTarget(ctx: TargetSelectionContext): TargetRecord | undefined {
        const current = ctx.currentTargetId ? ctx.registry.get(ctx.currentTargetId) : undefined
        const currentValid = current != undefined
            && this.isAllowed(ctx, current, ctx.maxDistance * this.opts.threatLeash)
        const excludedTargetId = ctx.currentTargetReachable === false ? current?.id : undefined
        const topThreat = this.resolveTopThreat(ctx, excludedTargetId)

        if (currentValid && ctx.currentTargetReachable !== false) {
            const currentThreat = this.getThreat(ctx, current.id)
            const shouldSwitch = topThreat != undefined
                && topThreat.id !== current.id
                && this.getThreat(ctx, topThreat.id) >= currentThreat * this.opts.switchMargin
            if (!shouldSwitch) return current
        }

        if (topThreat) return topThreat

        const nearest = this.findNearest(ctx, excludedTargetId)
        if (nearest) return nearest

        return ctx.fallbackTargetId && ctx.fallbackTargetId !== excludedTargetId
            ? ctx.registry.get(ctx.fallbackTargetId)
            : undefined
    }

    private resolveTopThreat(ctx: TargetSelectionContext, excludedTargetId?: string): TargetRecord | undefined {
        for (const threat of ctx.threats) {
            if (threat.targetId === excludedTargetId) continue
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

    private findNearest(ctx: TargetSelectionContext, excludedTargetId?: string): TargetRecord | undefined {
        if (!excludedTargetId) {
            return ctx.registry.findNearestHostile(ctx.selfId, ctx.maxDistance, ctx.query)
        }

        let nearest: TargetRecord | undefined
        let nearestDistance = ctx.maxDistance
        const mode = ctx.query?.distanceMode ?? TargetDistanceMode.Center
        for (const target of ctx.registry.getTargetsForTeam(ctx.selfTeamId ?? "", "enemy", ctx.query)) {
            if (target.id === ctx.selfId || target.id === excludedTargetId) continue
            const distance = ctx.registry.getDistanceToTarget(ctx.selfPos, target, mode)
            if (distance >= nearestDistance) continue
            nearest = target
            nearestDistance = distance
        }
        return nearest
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
