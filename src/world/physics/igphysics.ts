import { IBuildingObject, IPhysicsObject } from "@Glibs/interface/iobject";

export interface IGPhysic {
    addPlayer(model: IPhysicsObject): void
    add(...models: IPhysicsObject[]): void
    Check(obj: IPhysicsObject): boolean
    addMeshBuilding(...models: IBuildingObject[]): void
    addBuilding(model: IBuildingObject, pos: THREE.Vector3, size: THREE.Vector3, rotation?: THREE.Euler): void
    addLand(obj: IPhysicsObject): void
}