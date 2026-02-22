import * as THREE from "three";
import { IProjectileModel } from "./projectile";

export class Bullet3 implements IProjectileModel {
    alive = true
    maxCount = 20

    trailPositions = new Float32Array(this.maxCount * 3); // 꼬리 길이 조절
    pointsGeometry = new THREE.BufferGeometry()
    mesh: THREE.Points
    get Meshs() { return this.mesh }
    constructor() { 
        this.mesh = this.CreatePoints()
        this.mesh.frustumCulled = false
        this.mesh.renderOrder = 1
        this.mesh.visible = false
    }

    create(pos: THREE.Vector3, _dir?: THREE.Vector3) {
        for (let i = 0; i < this.trailPositions.length; i += 3) {
            this.trailPositions[i] = pos.x
            this.trailPositions[i + 1] = pos.y
            this.trailPositions[i + 2] = pos.z
        }
        this.pointsGeometry.attributes.position.needsUpdate = true;
        this.mesh.visible = true
        this.alive = true;
   }
    GetGeometry() {
        const colors = []
        const sizes = []

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
    CreatePoints() {
        this.GetGeometry()
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
    update(position: THREE.Vector3) {
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

    }
    release() {
        this.alive = false;
        this.mesh.visible = false
    }
}


