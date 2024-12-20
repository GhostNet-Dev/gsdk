import * as THREE from "three";
import { IProjectileModel } from "./projectile";
import { GhostObject } from "@Glibs/interface/iobject";

export class DefaultBall extends GhostObject implements IProjectileModel {
    get BoxPos() {
        const v = this.Pos
        return new THREE.Vector3(v.x, v.y, v.z)
    }
    constructor(
        size: number
    ) {
        const geometry = new THREE.SphereGeometry(size, 4, 2)
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
        })

        super(geometry, material)
    }
    create(position: THREE.Vector3): void {
       this.Pos.copy(position) 
       this.Visible = true
    }
    update(position: THREE.Vector3): void {
       this.Pos.copy(position) 
    }
    release(): void {
        this.Visible = false
    }
}