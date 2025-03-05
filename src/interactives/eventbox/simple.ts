import * as THREE from "three";
import { IAsset } from "@Glibs/interface/iasset"
import { IPhysicsObject } from "@Glibs/interface/iobject"
import { EventBox } from "./boxmgr"

export class SimpleEvent {
    get Meshs() { return this.mesh }
    get Size() { return this.asset.GetSize(this.mesh) }
    get Box() { return this.asset.GetBox(this.mesh) }
    get BoxPos() { return this.mesh.position }
    get EventBox() { return this.phybox }

    private phybox: EventBox

    key: string[] = []
    constructor(private asset: IAsset, private mesh: THREE.Group, id: number) { 
        const size = this.Size
        const geometry = new THREE.BoxGeometry(size.x * 2, size.y, size.z)
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            wireframe: true
        })
        this.phybox = new EventBox(id, "mon",  geometry, material)

    }
    Dispose() { }
    Collision(obj: IPhysicsObject): void { }
}

