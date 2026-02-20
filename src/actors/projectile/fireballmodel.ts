import * as THREE from "three";
import { IProjectileModel } from "./projectile";

export interface FireballConfig {
    particleCount: number;
    radius: number;
    riseSpeed: number;
    expansionSpeed: number;
    turbulence: number;
    baseScale: number;
    lifeTime: number;
    opacity: number;
    coreColor: string;
    midColor: string;
    edgeColor: string;
}

export type FireballParticle = THREE.Sprite & { 
    userData: { life: number; age: number; velocity: THREE.Vector3; noiseOffset: number; } 
};

export class FireballModel implements IProjectileModel {
    private group: THREE.Group;
    private emitter: THREE.Mesh;
    private particles: FireballParticle[] = [];
    private particleTexture: THREE.CanvasTexture;
    private config: FireballConfig;
    private clock: THREE.Clock;
    private alive: boolean = false;

    // 기존 시스템에서 가져가 렌더링할 루트 오브젝트
    get Meshs() { return this.group; }

    constructor(initialConfig?: Partial<FireballConfig>) {
        this.group = new THREE.Group();
        this.clock = new THREE.Clock();
        
        this.config = {
            particleCount: 200, // 최적화를 위해 약간 낮춤
            radius: 0.8,
            riseSpeed: 1.5,
            expansionSpeed: 0.5,
            turbulence: 1.5,
            baseScale: 1.0,
            lifeTime: 0.6,
            opacity: 0.7,
            coreColor: '#ffffcc',
            midColor: '#ff9900',
            edgeColor: '#ff2200',
            ...initialConfig
        };

        this.particleTexture = this.createHexagonTexture();
        
        // Emitter (투명한 본체 + 코어 라이트)
        this.emitter = new THREE.Mesh(
            new THREE.SphereGeometry(0.3),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        const coreLight = new THREE.PointLight(0xffaa00, 20, 10);
        this.emitter.add(coreLight);
        this.group.add(this.emitter);

        this.initParticles();
        this.group.visible = false;
    }

    private createHexagonTexture(): THREE.CanvasTexture {
        const size = 64;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const radius = size / 2 * 0.9;
        
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const x = size / 2 + radius * Math.cos(angle);
            const y = size / 2 + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
        return new THREE.CanvasTexture(canvas);
    }

    private initParticles() {
        for (let i = 0; i < this.config.particleCount; i++) {
            const mat = new THREE.SpriteMaterial({
                map: this.particleTexture,
                color: 0xffffff,
                transparent: true,
                opacity: 0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const sprite = new THREE.Sprite(mat) as FireballParticle;
            sprite.userData = {
                life: 0, age: 0, velocity: new THREE.Vector3(), noiseOffset: Math.random() * 100
            };
            this.group.add(sprite);
            this.particles.push(sprite);
        }
    }

    private spawnParticle(sprite: FireballParticle) {
        sprite.userData.age = 0;
        sprite.userData.life = Math.random() * this.config.lifeTime + 0.2;

        const center = this.emitter.position;
        const r = Math.pow(Math.random(), 1 / 3) * this.config.radius;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const offsetX = r * Math.sin(phi) * Math.cos(theta);
        const offsetY = r * Math.sin(phi) * Math.sin(theta);
        const offsetZ = r * Math.cos(phi);

        sprite.position.set(center.x + offsetX, center.y + offsetY, center.z + offsetZ);
        sprite.userData.velocity.set(offsetX * 2, offsetY * 2 + Math.random() * 2, offsetZ * 2).normalize();
        sprite.material.rotation = Math.random() * Math.PI;
    }

    // IProjectileModel 구현: 발사 시작
    create(position: THREE.Vector3): void {
        this.emitter.position.copy(position);
        this.group.visible = true;
        this.alive = true;
        this.clock.start();

        // 파티클 초기화
        this.particles.forEach(p => this.spawnParticle(p));
    }

    // IProjectileModel 구현: 매 프레임 위치 갱신 및 이펙트 업데이트
    update(position: THREE.Vector3): void {
        if (!this.alive) return;

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();

        // 컨트롤러가 계산한 현재 위치를 Emitter에 적용
        this.emitter.position.copy(position);

        const colorCore = new THREE.Color(this.config.coreColor);
        const colorMid = new THREE.Color(this.config.midColor);
        const colorEdge = new THREE.Color(this.config.edgeColor);

        // 파티클 잔상 효과 업데이트
        this.particles.forEach(sprite => {
            const u = sprite.userData;
            u.age += delta;

            if (u.age > u.life) this.spawnParticle(sprite);

            sprite.position.x += u.velocity.x * this.config.expansionSpeed * delta;
            sprite.position.y += (u.velocity.y + this.config.riseSpeed) * delta;
            sprite.position.z += u.velocity.z * this.config.expansionSpeed * delta;

            sprite.position.x += Math.sin(time * 5 + u.noiseOffset) * delta * this.config.turbulence;
            sprite.position.y += Math.cos(time * 3 + u.noiseOffset) * delta * this.config.turbulence;

            const lifeRatio = u.age / u.life;
            const scaleCurve = Math.sin(lifeRatio * Math.PI);

            let scale = scaleCurve * this.config.baseScale * (1 + lifeRatio * 1.5);
            sprite.scale.set(scale, scale, scale);
            sprite.material.opacity = this.config.opacity * scaleCurve;

            let finalColor = colorCore.clone();
            if (lifeRatio < 0.3) finalColor.lerp(colorMid, lifeRatio / 0.3);
            else finalColor.copy(colorMid).lerp(colorEdge, (lifeRatio - 0.3) / 0.7);
            
            sprite.material.color.copy(finalColor);
        });
    }

    // IProjectileModel 구현: 폭발/소멸 처리
    release(): void {
        this.alive = false;
        this.group.visible = false;
        // 필요시 폭발 이펙트를 발생시키는 이벤트를 호출할 수도 있습니다.
    }
}