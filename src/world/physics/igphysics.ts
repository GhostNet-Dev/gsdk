import { IBuildingObject, IPhysicsObject } from "@Glibs/interface/iobject";
import { PhysicBox } from "@Glibs/types/physicstypes";

export interface IGPhysic {
    addPlayer(model: IPhysicsObject): void
    add(...models: IPhysicsObject[]): void
    Check(obj: IPhysicsObject): boolean
    addMeshBuilding(...models: IBuildingObject[]): void
    addBuilding(model: IBuildingObject, pos: THREE.Vector3, size: THREE.Vector3, rotation?: THREE.Euler): void
    addLand(obj: THREE.Object3D): void
    GetCollisionBox(pos: THREE.Vector3, target: THREE.Box3): [PhysicBox | undefined, string[]]
    DeleteBox(keys: string[], b: IBuildingObject): void
    CheckBox(pos: THREE.Vector3, box: THREE.Box3): boolean
}