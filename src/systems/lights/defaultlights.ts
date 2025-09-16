import * as THREE from 'three'

export default class DefaultLights extends THREE.DirectionalLight {
    constructor(private scene: THREE.Scene) {
        super(0xfff2e0, 1.0)

        const ambient = new THREE.AmbientLight(0xffffff, 1.0); // 밝은 베이스
        const hemi = new THREE.HemisphereLight(0xfffbef, 0xf7fbff, 1.4); // warm sky, very light ground
        hemi.position.set(0, 80, 0);

        // 직사광은 살짝만(대비 낮춤). 색도 웜톤으로.
        const sun = this
        sun.position.set(12, 20, 8);
        sun.castShadow = true;
        sun.target.position.set(0, 2, 0);
        this.scene.add(sun.target);

        // 섀도 카메라(부호 대칭!), 너무 넓지 않게
        const d = 100;
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 500;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.radius = 4;
        sun.shadow.bias = -0.0004;
        sun.shadow.normalBias = 0.03;

        // 반대편에서 아주 약한 필라이트(그림자 X)
        const fill = new THREE.DirectionalLight(0xfffaef, 0.25);
        fill.position.set(-10, 10, -6);
        fill.castShadow = false;
        this.scene.add(ambient, fill, hemi, /*hemispherelight,*/ this,/*this.effector.meshs*/)
    }
}