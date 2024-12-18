import * as THREE from "three";

export interface IObject {
    get Meshs(): THREE.Mesh
}

export interface IPhysicsObject {
    get Velocity(): number
    set Velocity(n: number)
    get Size() : THREE.Vector3
    get BoxPos() : THREE.Vector3
    get Box(): THREE.Box3
    get CenterPos(): THREE.Vector3
    get CannonPos(): THREE.Vector3
    set CannonPos(v: THREE.Vector3)
    set Visible(flag: boolean)
    get Meshs(): THREE.Group | THREE.Mesh
    get UUID(): string
    update?(delta?: number):void
}
export interface IBuildingObject {
    get Size() : THREE.Vector3
    get BoxPos() : THREE.Vector3
    get Key(): string[]
    set Key(k: string[])
}

export interface ICtrlObject {
    PostStep(): void
}