import { ModeProfileMap } from "../controllabletypes"

export const sharedShipModeProfiles: ModeProfileMap = {
  navigation: {
    speedMultiplier: 1.18,
    turnSpeedMultiplier: 1.1,
    attackRangeMultiplier: 0.95,
    defenseMultiplier: 0.92,
  },
  attack: {
    damageMultiplier: 1.14,
    weaponCooldownMultiplier: 0.9,
    attackRangeMultiplier: 1.06,
  },
  defense: {
    speedMultiplier: 0.85,
    turnSpeedMultiplier: 0.9,
    defenseMultiplier: 1.25,
    energyRegenMultiplier: 1.2,
  },
  exploration: {
    speedMultiplier: 1.05,
    turnSpeedMultiplier: 1.06,
    attackRangeMultiplier: 1.12,
    energyRegenMultiplier: 1.15,
  },
}
