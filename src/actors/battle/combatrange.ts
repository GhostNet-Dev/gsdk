import { BaseSpec } from "./basespec"
import { GetMeleeAttackDistance } from "./meleecombat"

export const ATTACK_EXIT_HYSTERESIS = 1.2

/**
 * 연속 `NoPath` 이 이 횟수 이상이면 `currentTargetReachable = false` 로 판정한다.
 * `repathInterval` 0.35s 기준 약 1초 연속 실패. (설계 §5.7)
 */
export const REACHABLE_NOPATH_THRESHOLD = 3

export function GetEffectiveAttackRange(spec: BaseSpec, projectileRange?: number): number {
    if (projectileRange != undefined) return projectileRange
    return GetMeleeAttackDistance(spec)
}
