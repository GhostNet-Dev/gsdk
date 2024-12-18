import * as THREE from "three";
import { IEffect } from "./effector";

export class GuideMissle implements IEffect {
    process = false
    material = new THREE.PointsMaterial( {
        size: 0.1,
        color: 0xff0000,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        depthTest: false,
    })
    geometry = new THREE.BufferGeometry()
    points: THREE.Points
    count = 5
    particles: THREE.Vector3[] = []
    randomV: THREE.Vector3[] = []
    velocity = 5 + Math.random() 
    processFlag = false
    lastPos = new THREE.Vector3()
	obj = new THREE.Group()

    get Mesh() { return this.obj }

    constructor(private target: THREE.Vector3) {
        for (let i = 0; i < this.count; i++) {
            this.randomV.push(new THREE.Vector3(
                THREE.MathUtils.randInt(3, 300),
                THREE.MathUtils.randInt(3, 300),
                THREE.MathUtils.randInt(3, 300)
            ))
            this.particles.push(new THREE.Vector3())
        }
        this.geometry.setFromPoints(this.particles)

        this.points = new THREE.Points(this.geometry, this.material)
        this.obj.add(this.points)
    }
    Start(pos: THREE.Vector3) {
        // this.scene.add(this.points)
        const positions = this.points.geometry.attributes.position
        this.material.opacity = 1
        this.v = 0.001

        for (let i = 0; i < this.particles.length; i++) {
            positions.setX(i, pos.x)
            positions.setY(i, pos.y)
            positions.setZ(i, pos.z)
        }
        this.points.visible = true
        this.processFlag = true
    }
    Complete() {
        this.points.visible = false
        this.processFlag = false
        // this.scene.remove(this.points)
    }
    v = 0.01
    Update(delta: number) {
        if (!this.processFlag) return
        const positions = this.points.geometry.attributes.position
        for (let i = 0; i < this.particles.length; i++) {
            let x = positions.getX(i) + this.randomV[i].x * delta
            let y = positions.getY(i) + this.randomV[i].y * delta
            let z = positions.getZ(i) + this.randomV[i].z * delta

            if (this.randomV[i].x > 0.1) {
                this.randomV[i].x -= this.randomV[i].x * delta * 9.8
                this.randomV[i].y -= this.randomV[i].y * delta * 9.8
                this.randomV[i].z -= this.randomV[i].z * delta * 9.8
            } else {
                this.randomV[i].x = 0
                x += (this.target.x - x) * delta * 0.1
                this.randomV[i].y = 0
                y += (this.target.y - y) * delta * 0.1
                this.randomV[i].z = 0
                z += (this.target.z - z) * delta * 0.1
            }
            if (i == 0) {
                this.lastPos.set(x, y, z)
            }
//            console.log(positions.getX(i), positions.getY(i), positions.getZ(i))
        }
        this.v += 0.5
        if (this.target.distanceTo(this.lastPos) < 1) {
            this.Complete()
        }
        positions.needsUpdate = true
    }
}