import * as THREE from "three";
import { IEffect } from "../ieffector";
import shader from "./shader/grounddef"

export class AuraVfx implements IEffect {
    processFlag = false
    shader = shader.magicCircleGreenFrag
    material: THREE.ShaderMaterial
    groundLightMesh: THREE.Mesh
    obj = new THREE.Group()
    time = Date.now()

    get Mesh() {return this.obj}

    constructor(private scene: THREE.Scene, private nonglow?: Function) {
        this.material = new THREE.ShaderMaterial({
            transparent: true, 
            depthWrite: false,
            blending: THREE.NormalBlending,
            premultipliedAlpha: false,
            uniforms: {
                iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) },
                iTime: { value: 0 },
                //iChannel0: { value:}
            },
            vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
            fragmentShader: `
        uniform vec3 iResolution;
        uniform float iTime;
        varying vec2 vUv;
        ${this.shader}
        void main() {
            vec2 fragCoord = vUv * iResolution.xy;
            mainImage(gl_FragColor, fragCoord);
        } `
        });
        const planeGeometry = new THREE.CircleGeometry(5, 16);
        this.groundLightMesh = new THREE.Mesh(planeGeometry, this.material);
        this.groundLightMesh.rotation.x = -Math.PI / 2; // 땅에 평행하게 회전

        this.nonglow?.(this.groundLightMesh)
        this.obj.add(this.groundLightMesh)

        window.addEventListener('resize', () => {
            this.material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);
        });
    }
    Start() {
        this.processFlag = true
        this.scene.add(this.obj)
    }
    Complete() {
        this.processFlag = false
    }
    Update(_: number) {
        if (!this.processFlag) return

        this.material.uniforms.iTime.value = (Date.now() - this.time) / 1000
        this.material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1);

    }
}
