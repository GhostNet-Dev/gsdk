import * as THREE from "three";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { EnvironmentProperty, EnvironmentType } from "./environmentdefs";

export enum StaticColliderKind {
  Environment = "environment",
  CityBuilding = "city-building",
}

export type StaticBoxColliderOptions = {
  id: string;
  kind: StaticColliderKind;
  position: THREE.Vector3;
  size: THREE.Vector3;
  raycastOn?: boolean;
};

export type StaticObjectColliderOptions = {
  id: string;
  kind: StaticColliderKind;
  object: THREE.Object3D;
  box: THREE.Box3;
  raycastOn?: boolean;
};

const GRID_SIZE = 4.0;
const DEFAULT_TREE_COLLISION_HEIGHT = 6;
const DEFAULT_RESOURCE_COLLISION_HEIGHT = 3;
const boxMaterial = new THREE.MeshBasicMaterial({
  visible: false,
  depthWrite: false,
  color: 0xffffff,
});

type StaticColliderRegistration = {
  object: THREE.Object3D;
  ownsObject: boolean;
};

export class StaticColliderRegistry {
  private readonly colliders = new Map<string, StaticColliderRegistration>();

  constructor(private readonly eventCtrl: IEventController) {}

  registerBoxCollider(options: StaticBoxColliderOptions): THREE.Object3D {
    this.unregister(options.id);

    const geometry = new THREE.BoxGeometry(options.size.x, options.size.y, options.size.z);
    const collider = new THREE.Mesh(geometry, boxMaterial);
    collider.name = `${options.kind}:${options.id}:collider`;
    collider.visible = false;
    collider.position.copy(options.position);
    collider.userData.staticColliderKind = options.kind;
    collider.userData.staticColliderId = options.id;
    collider.userData.excludeFromPhysicsTargets = true;

    const box = new THREE.Box3().setFromObject(collider);
    this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, collider, options.raycastOn === true, box);
    this.colliders.set(options.id, { object: collider, ownsObject: true });

    return collider;
  }

  registerObjectCollider(options: StaticObjectColliderOptions): THREE.Object3D {
    this.unregister(options.id);

    options.object.userData.staticColliderKind = options.kind;
    options.object.userData.staticColliderId = options.id;
    this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, options.object, options.raycastOn === true, options.box);
    this.colliders.set(options.id, { object: options.object, ownsObject: false });

    return options.object;
  }

  unregister(id: string): void {
    const collider = this.colliders.get(id);
    if (!collider) return;

    this.eventCtrl.SendEventMessage(EventTypes.DeregisterPhysic, collider.object);
    if (collider.ownsObject && collider.object instanceof THREE.Mesh) {
      collider.object.geometry.dispose();
    }
    this.colliders.delete(id);
  }

  clear(): void {
    for (const id of [...this.colliders.keys()]) {
      this.unregister(id);
    }
  }
}

export function isEnvironmentCollisionEnabled(prop: EnvironmentProperty): boolean {
  return prop.collision?.enabled !== false;
}

export function getEnvironmentCollisionHeight(prop: EnvironmentProperty): number {
  if (prop.collision?.height !== undefined) return prop.collision.height;
  return prop.type === EnvironmentType.Tree
    ? DEFAULT_TREE_COLLISION_HEIGHT
    : DEFAULT_RESOURCE_COLLISION_HEIGHT;
}

export function getEnvironmentCollisionFootprintScale(prop: EnvironmentProperty): number {
  return prop.collision?.footprintScale ?? 1;
}

export function getEnvironmentCollisionSize(
  prop: EnvironmentProperty,
  gridSize = GRID_SIZE,
  instanceScale = 1,
): THREE.Vector3 {
  const footprintScale = getEnvironmentCollisionFootprintScale(prop) * instanceScale;
  return new THREE.Vector3(
    prop.size.width * gridSize * footprintScale,
    getEnvironmentCollisionHeight(prop) * instanceScale,
    prop.size.depth * gridSize * footprintScale,
  );
}

export function getEnvironmentCollisionCenter(
  position: THREE.Vector3,
  prop: EnvironmentProperty,
  instanceScale = 1,
): THREE.Vector3 {
  return new THREE.Vector3(
    position.x,
    position.y + (getEnvironmentCollisionHeight(prop) * instanceScale * 0.5),
    position.z,
  );
}
