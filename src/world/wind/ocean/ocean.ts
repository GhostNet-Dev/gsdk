import * as THREE from "three";
import oceanShader from "./shader/ocean"
import { Canvas, IViewer } from "@Commons/canvas";

export class Ocean implements IViewer {
    _geometry: THREE.PlaneGeometry
    _shader: THREE.ShaderMaterial
    mesh: THREE.Mesh
    startTime: number = 0

    //=====// Scene //========================================//     

    constructor(canvas: Canvas) {
        canvas.RegisterViewer(this)
        const size = 800
        this._geometry = new THREE.PlaneGeometry(size, size, size, size);
        this._geometry.rotateX(-Math.PI / 2);
        

        const texture = new THREE.TextureLoader().load('assets/texture/water.png')
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping

        const uniforms = {
            uMap: { type: 't', value: texture },
            uTime: { type: 'f', value: 0.0 },
            uColor: { type: 'f', value: new THREE.Color('#009dc4') },
        };

        this._shader = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: oceanShader.vert,
            fragmentShader: oceanShader.frag,
            vertexColors: true,
            side: THREE.DoubleSide,
        });

        this.mesh = new THREE.Mesh(this._geometry, this._shader);
        this.mesh.position.y = -2
        this.startTime = Date.now()
    }

    update() {
        const elapsedTime = Date.now() - this.startTime
        this._shader.uniforms.uTime.value = elapsedTime * 0.001
        this._shader.uniformsNeedUpdate = true;
    }
}

