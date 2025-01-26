import { IBuildingObject, IPhysicsObject } from "@Glibs/interface/iobject";
import { IGPhysic } from "./igphysics";
import { Vector3, Euler, Box3 } from "three";
import { PhysicBox } from "@Glibs/types/physicstypes";

export default class GPhysicsRay implements IGPhysic {
    addPlayer(model: IPhysicsObject): void {
        
    }
    add(...models: IPhysicsObject[]): void {
        
    }
    addBuilding(model: IBuildingObject, pos: Vector3, size: Vector3, rotation?: Euler | undefined): void {
        
    }
    addLand(obj: IPhysicsObject): void {
        
    }
    addMeshBuilding(...models: IBuildingObject[]): void {
        
    }
    Check(obj: IPhysicsObject): boolean {
        return false
    }
    CheckBox(pos: Vector3, box: Box3): boolean {
        return false
    }
    GetCollisionBox(pos: Vector3, target: Box3): [PhysicBox | undefined, string[]] {
        return [undefined, []]
    }
    DeleteBox(keys: string[], b: IBuildingObject): void {
        
    }
}