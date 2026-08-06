import * as THREE from "three";
import { StaticColliderKind } from "@Glibs/interactives/environment/staticcolliderregistry";
import { TargetRegistrySystem } from "@Glibs/systems/targeting/targetregistrysystem";
import { TargetKind } from "@Glibs/systems/targeting/targettypes";

export type CombatObstacleUserData = {
  bounds?: THREE.Box3;
  staticColliderId?: string;
  staticColliderKind?: StaticColliderKind;
  buildingId?: string;
  targetMeta?: {
    id?: string;
    kind?: TargetKind;
  };
};

export function isCombatObstacle(object: THREE.Object3D, targetRegistry?: TargetRegistrySystem): boolean {
  const record = targetRegistry?.getByObject(object);
  if (record?.kind === "structure") return true;

  let current: THREE.Object3D | null = object;
  while (current) {
    const userData = current.userData as CombatObstacleUserData;
    if (userData.staticColliderKind === StaticColliderKind.CityBuilding) return true;
    if (userData.targetMeta?.kind === "structure") return true;
    current = current.parent;
  }

  return false;
}

export function getCombatObstacleBounds(
  object: THREE.Object3D,
  scratchBox: THREE.Box3,
  targetRegistry?: TargetRegistrySystem,
): THREE.Box3 {
  const record = targetRegistry?.getByObject(object);
  if (record?.kind === "structure" && record.bounds && !record.bounds.isEmpty()) {
    return record.bounds;
  }

  let current: THREE.Object3D | null = object;
  while (current) {
    const userData = current.userData as CombatObstacleUserData;
    if (userData.bounds && !userData.bounds.isEmpty()) {
      return userData.bounds;
    }
    current = current.parent;
  }

  return scratchBox.setFromObject(object);
}
