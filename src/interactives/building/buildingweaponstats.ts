import type { BaseSpec } from "@Glibs/actors/battle/basespec";
import type { ProjectileWeaponDef } from "@Glibs/actors/projectile/projectiletypes";
import type { StatKey } from "@Glibs/inventory/stat/stattypes";

export enum BuildingWeaponStatOverride {
  AttackRanged = "attackRanged",
  AttackRange = "attackRange",
  AttackSpeedRanged = "attackSpeedRanged",
}

type BuildingCombatStats = Partial<Record<StatKey, number>>;

const MIN_FIRE_COOLDOWN_SEC = 0.05;

export function resolveBuildingProjectileWeapon(
  weapon: ProjectileWeaponDef | undefined,
  stats: BuildingCombatStats | undefined,
  baseSpec: BaseSpec,
): ProjectileWeaponDef | undefined {
  if (!weapon) return undefined;

  const overrides = getBuildingWeaponStatOverrides(stats);
  if (overrides.length === 0) return weapon;

  const resolvedWeapon: ProjectileWeaponDef = { ...weapon };

  for (const override of overrides) {
    switch (override) {
      case BuildingWeaponStatOverride.AttackRanged:
        resolvedWeapon.damageMultiplier = 1;
        break;
      case BuildingWeaponStatOverride.AttackRange:
        resolvedWeapon.range = baseSpec.stats.getStat(override);
        break;
      case BuildingWeaponStatOverride.AttackSpeedRanged:
        resolvedWeapon.fireCooldownSec = Math.max(
          MIN_FIRE_COOLDOWN_SEC,
          baseSpec.stats.getStat(override),
        );
        break;
    }
  }

  return resolvedWeapon;
}

function getBuildingWeaponStatOverrides(
  stats: BuildingCombatStats | undefined,
): BuildingWeaponStatOverride[] {
  if (!stats) return [];

  const overrides: BuildingWeaponStatOverride[] = [];
  if (hasBuildingWeaponStatOverride(stats, BuildingWeaponStatOverride.AttackRanged)) {
    overrides.push(BuildingWeaponStatOverride.AttackRanged);
  }
  if (hasBuildingWeaponStatOverride(stats, BuildingWeaponStatOverride.AttackRange)) {
    overrides.push(BuildingWeaponStatOverride.AttackRange);
  }
  if (hasBuildingWeaponStatOverride(stats, BuildingWeaponStatOverride.AttackSpeedRanged)) {
    overrides.push(BuildingWeaponStatOverride.AttackSpeedRanged);
  }
  return overrides;
}

function hasBuildingWeaponStatOverride(
  stats: BuildingCombatStats,
  override: BuildingWeaponStatOverride,
): boolean {
  return stats[override] !== undefined;
}
