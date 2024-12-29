import * as THREE from 'three'

export default class DefaultLights {
    constructor(private scene: THREE.Scene) {
        const abmbient = new THREE.AmbientLight(0xffffff, 1)
        const hemispherelight = new THREE.HemisphereLight(0xffffff, 0x333333)
        hemispherelight.position.set(0, 20, 10)
        const directlight = new THREE.DirectionalLight(0xffffff, 3);
        directlight.position.set(4, 10, 4)
        directlight.lookAt(new THREE.Vector3().set(0, 2, 0))
        directlight.castShadow = true
        directlight.shadow.radius = 1000
        directlight.shadow.mapSize.width = 4096
        directlight.shadow.mapSize.height = 4096
        directlight.shadow.camera.near = 1
        directlight.shadow.camera.far = 1000.0
        directlight.shadow.camera.left = 500
        directlight.shadow.camera.right = -500
        directlight.shadow.camera.top = 500
        directlight.shadow.camera.bottom = -500
        this.scene.add(abmbient, /*hemispherelight,*/ directlight, /*this.effector.meshs*/)
    }
}