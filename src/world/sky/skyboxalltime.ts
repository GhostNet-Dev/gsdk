import * as THREE from "three";
import { gui } from "@Glibs/helper/helper";
import { GhostObject, IPhysicsObject } from "@Glibs/interface/iobject";

// Vertex Shader
const skyVertexShader = `
varying vec3 vWorldPosition;

void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

// Fragment Shader
const skyFragmentShader = `
varying vec3 vWorldPosition;
uniform float timeOfDay; // 0.0 = 낮, 0.5 = 노을, 1.0 = 밤

void main() {
    float height = normalize(vWorldPosition).y;
    
    // 낮, 노을, 밤의 기본 색상
    vec3 dayColor = mix(vec3(0.6, 0.8, 1.0), vec3(0.1, 0.4, 0.8), height * 0.5 + 0.5);
    vec3 sunsetColor = mix(vec3(1.0, 0.4, 0.0), vec3(0.2, 0.1, 0.5), height * 0.5 + 0.5);
    vec3 nightColor = mix(vec3(0.02, 0.05, 0.1), vec3(0.01, 0.01, 0.2), height * 0.5 + 0.5);
    
    // 시간에 따른 색상 보간
    vec3 skyColor = mix(mix(dayColor, sunsetColor, smoothstep(0.0, 0.5, timeOfDay)), nightColor, smoothstep(0.5, 1.0, timeOfDay));
    
    gl_FragColor = vec4(skyColor, 1.0);
}
`;

export class SkyBoxAllTime extends GhostObject implements IPhysicsObject {
    get BoxPos() {
        const v = this.Pos;
        return new THREE.Vector3(v.x, v.y, v.z);
    }
    skyMaterial: THREE.ShaderMaterial
    time = .5

    constructor(
        private directionalLight: THREE.DirectionalLight,
        { debug = false, daytime = 1 } = {}
    ) {
        const skyMaterial = new THREE.ShaderMaterial({
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            uniforms: {
                timeOfDay: { value: 0.0 } // 기본값: 낮
            },
            side: THREE.BackSide
        });

        // 큰 구체를 사용하여 하늘을 감쌉니다
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        super(skyGeometry, skyMaterial);
        this.skyMaterial = skyMaterial
        this.setTimeOfDay(daytime)
        this.updateLighting(daytime)

        if (debug) {
            gui.add(this, "time", 0, 1, 0.1).onChange((v: number) => {
                this.setTimeOfDay(v)
                this.updateLighting(v)
            })
        }
    }

    // 시간 업데이트 함수
    setTimeOfDay(time: number) {
        this.skyMaterial.uniforms.timeOfDay.value = THREE.MathUtils.clamp(time, 0.0, 1.0);
    }
    updateLighting(timeOfDay: number) {
        const color = new THREE.Color();
        color.lerpColors(new THREE.Color(0xffddaa), new THREE.Color(0x002244), timeOfDay);
        this.directionalLight.color.set(color);
        //this.directionalLight.intensity = THREE.MathUtils.lerp(1.0, 0.2, timeOfDay); // 밤에 가까울수록 조도를 줄임
    }
}

