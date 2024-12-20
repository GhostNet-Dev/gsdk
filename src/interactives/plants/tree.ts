import { IAsset } from "@Glibs/interface/iasset";
import { PhysicsObject } from "@Glibs/interface/iobject";
import * as THREE from "three";

export class Tree extends PhysicsObject {
    constructor(asset: IAsset) {
        super(asset)
    }

    async Init() {
    }

    get BoxPos() {
        return this.asset.GetBoxPos(this.meshs)
    }
    async MassLoad(meshs:THREE.Group, scale: number, pos: THREE.Vector3) {
        this.meshs = meshs.clone()
        /*
        if(this.meshs instanceof THREE.Mesh) {
            this.meshs.material = this.meshs.material.clone()
        }
        */
        this.meshs.scale.set(scale, scale, scale)
        this.meshs.position.copy(pos)
        this.meshs.castShadow = true
        this.meshs.receiveShadow = true
        this.meshs.traverse(child => {
            child.castShadow = true
            child.receiveShadow = true
        })
        //this.gphysics.addMeshBuilding(this)
    }
}