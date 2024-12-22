import * as THREE from "three";
import { IEffect } from "../ieffector";


export class PointTrail implements IEffect {
    direction = new THREE.Vector3
    alive = true
    maxCount = 20

    trailPositions = new Float32Array(this.maxCount * 3); // 꼬리 길이 조절
    pointsGeometry = new THREE.BufferGeometry()
    points: THREE.Points
    life = 5
    speed: number = 0

	obj = new THREE.Group()
    get Mesh() {return this.obj}

    constructor(
        position: THREE.Vector3,
        private scene: THREE.Scene
    ) {
        this.points = this.CreatePoints(position)
        this.points.frustumCulled = false
        this.points.renderOrder = 1
        this.obj.add(this.points)
    }

    Start(
        direction: THREE.Vector3, 
        speed: number, 
    ): void {
        this.direction = direction.clone();
        this.speed = speed;
        this.alive = true;

        // Particle 기반의 총알 모델 생성
        this.scene.add(this.obj);       
    }
    Update(deltaTime: number, position: THREE.Vector3): void {
        if (!this.alive) return;

        // 총알 꼬리 업데이트
        for (let i = this.trailPositions.length - 3; i > 0; i -= 3) {
            this.trailPositions[i] = this.trailPositions[i - 3];
            this.trailPositions[i + 1] = this.trailPositions[i - 2];
            this.trailPositions[i + 2] = this.trailPositions[i - 1];
        }
        this.trailPositions[0] = position.x;
        this.trailPositions[1] = position.y;
        this.trailPositions[2] = position.z;
        this.pointsGeometry.attributes.position.needsUpdate = true;

        // 총알 수명 관리
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.alive = false;
            this.scene.remove(this.obj);
        }   
    }
    Complete(): void {
    }
    GetGeometry(pos: THREE.Vector3) {
        const colors: number[] = []
        const sizes: number[] = []
        for (let i = 0; i < this.trailPositions.length; i += 3) {
            this.trailPositions[i] = pos.x
            this.trailPositions[i + 1] = pos.y
            this.trailPositions[i + 2] = pos.z
        }

        for (let i = 0; i < this.maxCount; i++) {
            const r = THREE.MathUtils.randInt(Math.random(), .1)
            const g = THREE.MathUtils.randInt(.6, 1)
            const b = THREE.MathUtils.randInt(0, .8)
            const a = 1 - 1 / this.maxCount * i
            colors.push(r, g, b, a)
            sizes.push(1)
        }
        this.pointsGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        this.pointsGeometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4))
        this.pointsGeometry.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1))
    }
    CreatePoints(pos: THREE.Vector3) {
        this.GetGeometry(pos)
        const _canvas = document.createElement('CANVAS') as HTMLCanvasElement
        _canvas.width = 128
        _canvas.height = 128
        const context = _canvas.getContext('2d')
        if (context == undefined) throw new Error("fail get context");

        context.globalAlpha = 0.3
        context.filter = 'blur(16px)'
        context.fillStyle = 'white'
        context.beginPath()
        context.arc(64, 64, 40, 0, 2 * Math.PI)
        context.fill()
        context.globalAlpha = 1
        context.filter = 'blur(5px)'
        context.fillStyle = 'white'
        context.beginPath()
        context.arc(64, 64, 16, 0, 2 * Math.PI)
        context.fill()
        const texture = new THREE.CanvasTexture(_canvas)

        const material = new THREE.PointsMaterial({
            color: 'white',
            vertexColors: true,
            size: .3,
            sizeAttenuation: true,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
        return new THREE.Points(this.pointsGeometry, material)
    }

}