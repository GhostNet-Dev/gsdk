import { GhostObject } from "@Glibs/interface/iobject";
import * as THREE from "three";


export class Brick extends GhostObject {
    get BoxPos() { return this.position }
    set Key(k: string[]) { this.key = k }
    get Key() { return this.key }
    key: string[] = []

    _geometry: THREE.BoxGeometry
    _material: THREE.MeshStandardMaterial
    constructor(pos: THREE.Vector3, size: THREE.Vector3, color: THREE.Color) {
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const material = new THREE.MeshStandardMaterial({ 
            //color: 0xD9AB61,
            transparent: true,
            color: color,
            emissiveIntensity: 0,
        })
        super(geometry, material)
        this.castShadow = true
        this.receiveShadow = true
        this.size = size
        this.scale.copy(size)
        this._geometry = geometry
        this._material = material

        this.Init(pos)
    }

    Init(pos: THREE.Vector3) { 
        this.position.copy(pos)
    }
    Dispose() {
        this._geometry.dispose()
        this._material.dispose()
    }
}
