import * as THREE from 'three'

export default class DefaultLights extends THREE.DirectionalLight {
    constructor(private scene: THREE.Scene) {
        super(0xffffff, 3)
        const abmbient = new THREE.AmbientLight(0xffffff, 1)
        const hemispherelight = new THREE.HemisphereLight(0xffffff, 0x333333)
        hemispherelight.position.set(0, 20, 10)
        this.position.set(4, 10, 4)
        this.lookAt(new THREE.Vector3().set(0, 2, 0))
        this.castShadow = true
        this.shadow.radius = 1000
        this.shadow.mapSize.width = 4096
        this.shadow.mapSize.height = 4096
        this.shadow.camera.near = 1
        this.shadow.camera.far = 1000.0
        this.shadow.camera.left = 500
        this.shadow.camera.right = -500
        this.shadow.camera.top = 500
        this.shadow.camera.bottom = -500
        this.scene.add(abmbient, /*hemispherelight,*/ this,/*this.effector.meshs*/)
    }
}