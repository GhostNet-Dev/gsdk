import * as THREE from "three";

export class Bullet {
    position = new THREE.Vector3
    direction = new THREE.Vector3
    alive = true

    particleGeometry = new THREE.BufferGeometry();
    particleMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    particle: THREE.Points
    trailGeometry = new THREE.BufferGeometry();
    trailMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    trailPositions = new Float32Array(60); // 꼬리 길이 조절
    trail: THREE.Line

    life = 5
    speed: number = 0
    constructor(
        private scene: THREE.Scene
    ) { 
        this.particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
        this.particle = new THREE.Points(this.particleGeometry, this.particleMaterial);

        this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        this.trail = new THREE.Line(this.trailGeometry, this.trailMaterial);
    }

    create(
        position: THREE.Vector3, 
        direction: THREE.Vector3, 
        speed: number, 
    ) {
        this.position = position.clone();
        this.direction = direction.clone();
        this.speed = speed;
        this.alive = true;

        // Particle 기반의 총알 모델 생성
        this.particle.position.copy(this.position);
        this.scene.add(this.particle);
        this.scene.add(this.trail);
   }

    update(deltaTime: number) {
        if (!this.alive) return;

        // 총알 위치 업데이트
        this.position.addScaledVector(this.direction, this.speed * deltaTime);
        this.particle.position.copy(this.position);

        // 총알 꼬리 업데이트
        for (let i = this.trailPositions.length - 3; i > 0; i -= 3) {
            this.trailPositions[i] = this.trailPositions[i - 3];
            this.trailPositions[i + 1] = this.trailPositions[i - 2];
            this.trailPositions[i + 2] = this.trailPositions[i - 1];
        }
        this.trailPositions[0] = this.position.x;
        this.trailPositions[1] = this.position.y;
        this.trailPositions[2] = this.position.z;
        this.trailGeometry.attributes.position.needsUpdate = true;

        // 총알 수명 관리
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.alive = false;
            this.scene.remove(this.particle);
            this.scene.remove(this.trail);
        }
    }
}

