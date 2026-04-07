import { MonsterId } from "@Glibs/types/monstertypes"
import { ShipProjectileDef } from "../controllabletypes"

export const shipWeaponDefs = {
  ScoutLaser: {
    id: MonsterId.WarhamerTracer,
    name: "정밀 레이저",
    damageMultiplier: 0.85,
    range: 220,
    hitscan: true,
    tracerLife: 0.62,
    useRaycast: true,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 1.1,
    energyCostPerSec: 7,
  },
  FighterAutocannon: {
    id: MonsterId.EnergyHoming,
    name: "호밍 오토캐논",
    damageMultiplier: 1.15,
    homing: true,
    range: 110,
    hitscan: false,
    tracerLife: 0.4,
    tracerRange: 120,
    useRaycast: false,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 0.48,
    energyCostPerSec: 12,
  },
  AllySupportGun: {
    id: MonsterId.DefaultBullet,
    name: "근접 벌컨",
    damageMultiplier: 1.55,
    range: 42,
    hitscan: false,
    tracerLife: 0.22,
    tracerRange: 48,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 0.18,
    energyCostPerSec: 18,
  },
} satisfies Record<string, ShipProjectileDef>
