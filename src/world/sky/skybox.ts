import * as THREE from "three";
import { IObject, IPhysicsObject } from "@Models/iobject";
import { GhostModel2 } from "@Models/ghostmodel";

// 하늘 셰이더 재질
const skyVertexShader = `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const skyFragmentShader = `
varying vec3 vWorldPosition;

void main() {
    float height = normalize(vWorldPosition).y;
    vec3 skyColor = mix(vec3(0.6, 0.8, 1.0), vec3(0.1, 0.4, 0.8), height * 0.5 + 0.5);
    gl_FragColor = vec4(skyColor, 1.0);
}
`;
export class SkyBox extends GhostModel2 implements IObject, IPhysicsObject {
    get BoxPos() {
        const v = this.CannonPos
        return new THREE.Vector3(v.x, v.y, v.z)
    }

    constructor() {
        const skyMaterial = new THREE.ShaderMaterial({
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            side: THREE.BackSide
        });

        // 큰 구체를 사용하여 하늘을 감쌉니다
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        super(skyGeometry, skyMaterial)
    }
}
