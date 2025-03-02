import { IAsset } from "@Glibs/interface/iasset"
import { IBuildingObject, IPhysicsObject, PhysicsObject } from "@Glibs/interface/iobject"

export class SimpleEvent implements IBuildingObject {
    get Meshs() { return this.mesh }
    get Size() { return this.asset.GetSize(this.mesh) }
    get Box() { return this.asset.GetBox(this.mesh) }
    get BoxPos() { return this.mesh.position }
    set Key(k: string[]) { this.key = k }
    get Key() { return this.key }

    key: string[] = []
    constructor(private asset: IAsset, private mesh: THREE.Group) { }
    Dispose() { }
    Collision(obj: IPhysicsObject): void { }
}

