import * as THREE from "three";
import { IBuildingObject, IPhysicsObject } from "@Glibs/interface/iobject";
import { PhysicBox } from "@Glibs/types/physicstypes";

export type ObjectInfo = {
    obj: THREE.Object3D | undefined
    distance: number
    move?: THREE.Vector3
}

export interface IGPhysic {
    addPlayer(model: IPhysicsObject): void
    add(...models: IPhysicsObject[]): void
    GetObjects(): THREE.Object3D[]
    Check(obj: IPhysicsObject): boolean
    CheckDirection(obj: IPhysicsObject, dir: THREE.Vector3, number: number): ObjectInfo 
    CheckDown(obj: IPhysicsObject): number
    CheckBoxs(obj: IPhysicsObject): boolean
    CheckBox(pos: THREE.Vector3, box: THREE.Box3): boolean
    addBuilding(model: IBuildingObject, pos: THREE.Vector3, size: THREE.Vector3, rotation?: THREE.Euler): void
    addLand(obj: THREE.Object3D): void
    GetCollisionBox(pos: THREE.Vector3, target: THREE.Box3): [PhysicBox | undefined, string[]]
    DeleteBox(keys: string[], b: IBuildingObject): void
}