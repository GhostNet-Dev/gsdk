import { MonsterId } from "@Glibs/types/monstertypes"
import { ProjectileDamageType, ProjectileWeaponDef } from "./projectiletypes"

export const allyProjectileDefs = {
  ArcherKnife: {
    id: MonsterId.Knife,
    name: "Archer throwing knife",
    damageType: ProjectileDamageType.Physical,
    damageMultiplier: 1,
    range: 18,
    hitscan: false,
    homing: false,
    useRaycast: false,
    muzzleOffset: { x: 0, y: 1.2, z: 0.8 },
    fireCooldownSec: 1,
  },
  MageEnergyHoming: {
    id: MonsterId.EnergyHoming,
    name: "Mage energy bolt",
    damageType: ProjectileDamageType.Magic,
    damageMultiplier: 1,
    range: 22,
    hitscan: false,
    homing: true,
    useRaycast: false,
    muzzleOffset: { x: 0, y: 1.25, z: 0.8 },
    fireCooldownSec: 1.35,
  },
} satisfies Record<string, ProjectileWeaponDef>
