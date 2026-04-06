import { MonsterId } from "@Glibs/types/monstertypes"
import { ShipProjectileDef } from "../controllabletypes"

export const shipWeaponDefs = {
  ScoutLaser: {
    id: MonsterId.WarhamerTracer,
    name: "레이저",
    range: 45,
    hitscan: true,
    tracerLife: 1.18,
    useRaycast: true,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 0.55,
    energyCostPerSec: 10,
  },
  FighterAutocannon: {
    id: MonsterId.EnergyHoming,
    name: "호밍 레이저",
    range: 300,
    hitscan: false,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 0.65,
    energyCostPerSec: 15,
  },
  AllySupportGun: {
    id: MonsterId.DefaultBullet,
    name: "지원용 벌컨",
    range: 35,
    hitscan: false,
    muzzleOffset: { x: 0, y: 0.4, z: 2.2 },
    fireCooldownSec: 0.8,
    energyCostPerSec: 5,
  }
} satisfies Record<string, ShipProjectileDef>
