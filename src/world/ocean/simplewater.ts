import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector'


export class SimpleWater {
    meshs = new THREE.Group()
    waterReflector?: Reflector
    waterGeometry: THREE.PlaneGeometry
    constructor(private scene: THREE.Scene, nonglowfn?: Function) {
        this.waterGeometry = new THREE.PlaneGeometry(1024, 1024);
        const pixel = (window.devicePixelRatio >= 2) ? window.devicePixelRatio / 4 : window.devicePixelRatio / 2
        this.waterReflector = new Reflector(this.waterGeometry, {
            clipBias: .01,
            textureWidth: window.innerWidth * pixel,
            textureHeight: window.innerHeight * pixel,
        })
        this.waterReflector.rotation.x = -Math.PI * 0.5;
        this.waterReflector.position.y = -1
        this.waterReflector.userData.isRoot = true
        this.waterReflector.userData.simpleWater = this
        nonglowfn?.(this.waterReflector)
        this.meshs.add(this.waterReflector)
        this.scene.add(this.meshs)
    }
    Dispose() {
        if (!this.waterReflector) return
        if (this.scene.children.indexOf(this.meshs) > -1) {
            this.scene.remove(this.meshs)
            this.waterReflector.dispose()
            this.waterGeometry.dispose()
        } else {
            throw new Error("bug!");
        }
    }
}