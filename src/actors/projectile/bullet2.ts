import * as THREE from "three";
// 총알 궤적 쉐이더 정의
const bulletTrailShader = {
    uniforms: {
        prevPosition: { value: new THREE.Vector3() }
    },
    vertexShader: `
        uniform vec3 prevPosition;
        varying float alpha;

        void main() {
            float distance = length(position.xyz - prevPosition);
            alpha = 1.0 - (distance * 0.01);
        }
    `,
    fragmentShader: `
        varying float alpha;

        void main() {
            gl_FragColor = vec4(1.0, 0.0, 0.0, alpha);
        }
    `
};

// 총알 객체 생성
export class Bullet2 {
    geometry = new THREE.BoxGeometry(1, 1, 1);
    material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.clone(bulletTrailShader.uniforms),
        vertexShader: bulletTrailShader.vertexShader,
        fragmentShader: bulletTrailShader.fragmentShader,
        transparent: true
    });
    mesh: THREE.Mesh
    prevPosition: THREE.Vector3

    constructor(
        startPosition: THREE.Vector3, 
        private direction: THREE.Vector3, 
        private speed: number
    ) {
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.copy(startPosition);
        this.direction = direction.clone().normalize();
        this.speed = speed;
        this.prevPosition = startPosition.clone();
    }

    update(delta: number) {
        // 총알을 이동시킴
        const currentPosition = this.mesh.position.clone();
        currentPosition.addScaledVector(this.direction, this.speed * delta);
        this.mesh.position.copy(currentPosition);

        // 쉐이더에 현재 위치 전달
        this.material.uniforms.prevPosition.value.copy(this.prevPosition);
        this.material.uniforms.prevPosition.value.needsUpdate = true

        // 이전 위치 업데이트
        this.prevPosition.copy(currentPosition);
        this.geometry.attributes.position.needsUpdate = true
    }
}
