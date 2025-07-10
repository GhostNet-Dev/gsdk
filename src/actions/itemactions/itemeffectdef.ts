import { StatKey } from "@Glibs/types/stattypes";

export type EffectDef =
  | { type: "statBoost"; stats: Partial<Record<StatKey, number>> }
  | { type: "bleed"; chance: number; dps: number }
  | { type: "knockback"; force: number }
  | { type: "grantSkill"; skillId: string; level: number }
