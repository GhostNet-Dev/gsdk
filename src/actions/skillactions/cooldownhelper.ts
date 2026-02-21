import { IActionUser } from "@Glibs/types/actiontypes"

const MIN_COOLDOWN_MULTIPLIER = 0.1
const MAX_COOLDOWN_REDUCTION = 0.8

export function getCooldownReduction(user: IActionUser): number {
  const raw = user.baseSpec.stats.getStat("cooldownReduction")
  return Math.max(0, Math.min(MAX_COOLDOWN_REDUCTION, raw))
}

export function getEffectiveCooldownMs(baseCooldownMs: number, user: IActionUser): number {
  const reduction = getCooldownReduction(user)
  const multiplier = Math.max(MIN_COOLDOWN_MULTIPLIER, 1 - reduction)
  return baseCooldownMs * multiplier
}

export function isCooldownReady(lastUsedAt: number, baseCooldownMs: number, user: IActionUser, now = performance.now()): boolean {
  const effectiveCooldown = getEffectiveCooldownMs(baseCooldownMs, user)
  return now - lastUsedAt >= effectiveCooldown
}
