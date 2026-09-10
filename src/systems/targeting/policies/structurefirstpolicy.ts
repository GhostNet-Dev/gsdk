import { TargetDistanceMode, TargetRecord } from "../targettypes"
import { TargetSelectionContext, TargetSelectionPolicy } from "../targetselectionpolicy"
import { NearestHostilePolicy } from "./nearesthostilepolicy"

export class StructureFirstPolicy implements TargetSelectionPolicy {
    constructor(private readonly inner: TargetSelectionPolicy = new NearestHostilePolicy()) { }

    selectTarget(ctx: TargetSelectionContext): TargetRecord | undefined {
        let best: TargetRecord | undefined
        let bestDistance = ctx.maxDistance
        const mode = ctx.query?.distanceMode ?? TargetDistanceMode.Center

        for (const target of ctx.registry.getTargetsForTeam(ctx.selfTeamId ?? "", "enemy", {
            ...ctx.query,
            kinds: ["structure"],
        })) {
            if (target.id === ctx.selfId) continue
            const distance = ctx.registry.getDistanceToTarget(ctx.selfPos, target, mode)
            if (distance >= bestDistance) continue
            best = target
            bestDistance = distance
        }

        return best ?? this.inner.selectTarget(ctx)
    }
}
