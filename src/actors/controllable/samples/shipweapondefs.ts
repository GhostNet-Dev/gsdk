import { MonsterId } from "@Glibs/types/monstertypes"
import { ShipProjectileDef } from "../controllabletypes"

export const shipWeaponDefs = {
  ScoutLaser: {
    id: MonsterId.WarhamerTracer,
    hitscan: true,
    tracerLife: 1.18,
    useRaycast: true,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 0.55,
    energyCostPerSec: 10,
  },
  FighterAutocannon: {
    id: MonsterId.WarhamerTracer,
    hitscan: true,
    tracerLife: 0.18,
    useRaycast: true,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 0.45,
    energyCostPerSec: 15,
  },
  AllySupportGun: {
    id: MonsterId.DefaultBullet,
    hitscan: false,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 0.8,
    energyCostPerSec: 5,
  }
} satisfies Record<string, ShipProjectileDef>
