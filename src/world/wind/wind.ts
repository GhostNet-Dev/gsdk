import * as THREE from "three";
import windShader from "./shader/wind"
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export class Wind implements ILoop {
    _geometry: THREE.BufferGeometry;
    mesh: THREE.Mesh
    _shaders: THREE.ShaderMaterial[] = [];


    //=====// Scene //========================================//
    constructor(eventCtrl: IEventController) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        const points = this.createSpiral();

        // Create the flat geometry
        const geometry = new THREE.BufferGeometry();

        // create two times as many vertices as points, as we're going to push them in opposing directions to create a ribbon
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points.length * 3 * 2), 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(points.length * 2 * 2), 2));
        geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(points.length * 6), 1));

        points.forEach((b, i) => {
            let o = 0.1;

            geometry.attributes.position.setXYZ(i * 2 + 0, b.x, b.y + o, b.z);
            geometry.attributes.position.setXYZ(i * 2 + 1, b.x, b.y - o, b.z);

            geometry.attributes.uv.setXY(i * 2 + 0, i / (points.length - 1), 0);
            geometry.attributes.uv.setXY(i * 2 + 1, i / (points.length - 1), 1);

            if (i < points.length - 1 && geometry.index) {
                geometry.index.setX(i * 6 + 0, i * 2);
                geometry.index.setX(i * 6 + 1, i * 2 + 1);
                geometry.index.setX(i * 6 + 2, i * 2 + 2);

                geometry.index.setX(i * 6 + 0 + 3, i * 2 + 1);
                geometry.index.setX(i * 6 + 1 + 3, i * 2 + 3);
                geometry.index.setX(i * 6 + 2 + 3, i * 2 + 2);
            }
        });

        this._geometry = geometry;

        const uniforms = {
            uTime: {type: 'f', value: Math.random() * 3},
        };

        const shader = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: windShader.vert,
            fragmentShader: windShader.frag,
            side: THREE.DoubleSide,
            transparent: true,
            depthTest: false,
        });
        (shader as any).speed = Math.random() * 0.4 + 0.8;
        this._shaders.push(shader);

        const mesh = new THREE.Mesh(this._geometry, shader);
        mesh.rotation.y = Math.random() * 10;
        mesh.scale.setScalar(0.5 + Math.random());
        mesh.scale.y = Math.random() * 0.2 + 0.9;
        mesh.position.x = THREE.MathUtils.randInt(-3, 3)
        mesh.position.y = Math.random();
        mesh.position.z = THREE.MathUtils.randInt(-3, 3)
        this.mesh = mesh
    }
    createSpiral() {
        let points: THREE.Vector3[] = [];
        let r = 8;
        let a = 0;
        for (let i = 0; i < 120; i++) {
            let p = (1 - i / 120);
            r -= Math.pow(p, 2) * 0.187;
            a += 0.3 - (r / 6) * 0.2;

            points.push(new THREE.Vector3(
                r * Math.sin(a),
                Math.pow(p, 2.5) * 2,
                r * Math.cos(a)
            ));
        }
        return points;
    }

    update(e: number) {
        this._shaders.forEach(shader => {
            shader.uniforms.uTime.value += e * 1 * (shader as any).speed;
        });
    }
}
