import { IBuildingObject } from "@Glibs/interface/iobject"

export type PhysicBox = {
    pos: THREE.Vector3,
    box: THREE.Box3,
    model: IBuildingObject
}