import * as THREE from 'three'

export default class DefaultLights {
    directlight = new THREE.DirectionalLight(0xffffff, 3);
    constructor(private scene: THREE.Scene) {
        const abmbient = new THREE.AmbientLight(0xffffff, 1)
        const hemispherelight = new THREE.HemisphereLight(0xffffff, 0x333333)
        hemispherelight.position.set(0, 20, 10)
        this.directlight.position.set(4, 10, 4)
        this.directlight.lookAt(new THREE.Vector3().set(0, 2, 0))
        this.directlight.castShadow = true
        this.directlight.shadow.radius = 1000
        this.directlight.shadow.mapSize.width = 4096
        this.directlight.shadow.mapSize.height = 4096
        this.directlight.shadow.camera.near = 1
        this.directlight.shadow.camera.far = 1000.0
        this.directlight.shadow.camera.left = 500
        this.directlight.shadow.camera.right = -500
        this.directlight.shadow.camera.top = 500
        this.directlight.shadow.camera.bottom = -500
        this.scene.add(abmbient, /*hemispherelight,*/ this.directlight, /*this.effector.meshs*/)
    }
}