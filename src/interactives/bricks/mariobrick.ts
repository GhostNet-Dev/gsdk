import * as THREE from "three";
import { Loader } from "../../loader/loader";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { IAsset } from "@Glibs/interface/iasset";

export class MarioBrick extends PhysicsObject {
    constructor(private loader: Loader, asset: IAsset) {
        super(asset)
        this.meshs = new THREE.Group
        this.size = new THREE.Vector3()
    }

    async Init() { }

    async Loader(scale: number, position: THREE.Vector3) {
        return new Promise((resolve) => {
            this.loader.Load.load("assets/brick/mario_brick_block.glb", (gltf) => {
                this.meshs = gltf.scene
                this.meshs.scale.set(scale, scale, scale)
                this.meshs.position.set(position.x, position.y, position.z)
                this.meshs.castShadow = true
                this.meshs.receiveShadow = true
                this.meshs.traverse(child => { 
                    child.castShadow = true 
                    child.receiveShadow = true
                })
                const box = new THREE.Box3().setFromObject(this.meshs)
                this.size = box.getSize(new THREE.Vector3)
                resolve(gltf.scene)
            })
        })
    }
}