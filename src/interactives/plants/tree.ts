import * as THREE from "three";
import { IPhysicsObject } from "../models/iobject";
import { GhostModel } from "../models/ghostmodel";
import { IAsset } from "../../loader/assetmodel";

export class Tree extends GhostModel implements IPhysicsObject {
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