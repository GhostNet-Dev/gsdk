import { TargetSelectionContext, TargetSelectionPolicy } from "../targetselectionpolicy"

export class CompositeTargetPolicy implements TargetSelectionPolicy {
    constructor(private readonly policies: readonly TargetSelectionPolicy[]) { }

    selectTarget(ctx: TargetSelectionContext) {
        for (const policy of this.policies) {
            const target = policy.selectTarget(ctx)
            if (target) return target
        }
        return undefined
    }
}
