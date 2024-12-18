import * as THREE from "three";
import { GhostModel2 } from "@Models/ghostmodel";
import { IProjectileModel } from "./projectile";

export class DefaultBall extends GhostModel2 implements IProjectileModel {
    get BoxPos() {
        const v = this.CannonPos
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
       this.CannonPos.copy(position) 
       this.Visible = true
    }
    update(position: THREE.Vector3): void {
       this.CannonPos.copy(position) 
    }
    release(): void {
        this.Visible = false
    }
}