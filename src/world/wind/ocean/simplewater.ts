import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector'


export class SimpleWater {
    water?: THREE.Mesh
    waterReflector?: Reflector
    constructor(private scene: THREE.Scene, nonglowfn?: Function) {
        const waterGeometry = new THREE.PlaneGeometry(1024, 1024);
        const pixel = (window.devicePixelRatio >= 2) ? window.devicePixelRatio / 4 : window.devicePixelRatio / 2
        this.waterReflector = new Reflector(waterGeometry, {
            clipBias: .01,
            textureWidth: window.innerWidth * pixel,
            textureHeight: window.innerHeight * pixel,
        })
        this.waterReflector.rotation.x = -Math.PI * 0.5;
        this.waterReflector.position.y = -1
        nonglowfn?.(this.waterReflector)
        this.scene.add(this.waterReflector)

        /*
        const waterGeometry = new THREE.PlaneGeometry(256, 256);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x14c6a5,
            blending: THREE.CustomBlending,
            transparent: true,
            //opacity: .5
        })
        this.water = new THREE.Mesh(waterGeometry, material);
        this.water.rotation.x = -Math.PI * 0.5;
        this.water.position.y = -.9
        nonglowfn?.(this.water)
        //this.scene.add(this.water)
        */
    }
}