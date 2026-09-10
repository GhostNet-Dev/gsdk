import { TargetPolicyConfig, TargetPolicyId, TargetSelectionPolicy } from "../targetselectionpolicy"
import { NearestHostilePolicy } from "./nearesthostilepolicy"
import { ScoredTargetSelectionPolicy } from "./scoredtargetselectionpolicy"
import { StructureFirstPolicy } from "./structurefirstpolicy"
import { ThreatAwareNearestPolicy } from "./threatawarenearestpolicy"

export function createTargetPolicy(config: TargetPolicyConfig): TargetSelectionPolicy {
    switch (config.id) {
        case TargetPolicyId.NearestHostile:
            return new NearestHostilePolicy()
        case TargetPolicyId.ThreatAwareNearest:
            return new ThreatAwareNearestPolicy({
                switchMargin: config.switchMargin,
                threatLeash: config.threatLeash,
            })
        case TargetPolicyId.StructureFirst:
            return new StructureFirstPolicy(config.inner ? createTargetPolicy(config.inner) : undefined)
        case TargetPolicyId.Scored:
            return new ScoredTargetSelectionPolicy(config.weights, config.kindWeight)
    }
}
