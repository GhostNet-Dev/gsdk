import { TargetDistanceMode, TargetRecord } from "../targettypes"
import { ScoredWeights, TargetSelectionContext, TargetSelectionPolicy } from "../targetselectionpolicy"

export class ScoredTargetSelectionPolicy implements TargetSelectionPolicy {
    constructor(
        private readonly weights: ScoredWeights = {},
        private readonly kindWeight: Partial<Record<TargetRecord["kind"], number>> = {},
    ) { }

    selectTarget(ctx: TargetSelectionContext): TargetRecord | undefined {
        const source = ctx.registry.get(ctx.selfId)
        if (!source) return undefined

        let best: TargetRecord | undefined
        let bestScore = Number.NEGATIVE_INFINITY
        const mode = ctx.query?.distanceMode ?? TargetDistanceMode.Center
        const maxThreat = Math.max(1, ...ctx.threats.map((entry) => entry.threat))

        for (const target of ctx.registry.getTargetsForTeam(source.teamId ?? "", "enemy", ctx.query)) {
            if (target.id === ctx.selfId) continue
            const distance = ctx.registry.getDistanceToTarget(ctx.selfPos, target, mode)
            if (distance > ctx.maxDistance) continue

            const threat = ctx.threats.find((entry) => entry.targetId === target.id)?.threat ?? 0
            const distanceScore = 1 - Math.min(1, distance / Math.max(1, ctx.maxDistance))
            const threatScore = threat / maxThreat
            const stickScore = target.id === ctx.currentTargetId ? 1 : 0
            const kindScore = this.kindWeight[target.kind] ?? 0
            const score =
                (this.weights.distance ?? 1) * distanceScore
                + (this.weights.threat ?? 1) * threatScore
                + (this.weights.stickiness ?? 0.25) * stickScore
                + (this.weights.kind ?? 1) * kindScore

            if (score <= bestScore) continue
            best = target
            bestScore = score
        }

        return best ?? (ctx.fallbackTargetId ? ctx.registry.get(ctx.fallbackTargetId) : undefined)
    }
}
