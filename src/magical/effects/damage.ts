import * as THREE from "three";
import { IEffect } from "./effector";

export class Damage implements IEffect {
    material = new THREE.PointsMaterial( {
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        depthTest: false,
    })
    geometry = new THREE.BufferGeometry()
    points: THREE.Points
    count = 30
    delta: THREE.Vector3[] = []
    velocity = 5 + Math.random() 
    processFlag = false
    obj = new THREE.Group()
    get Mesh() { return this.obj }

    constructor( r: number, g: number, b: number) {
        const particles = []
        const colors = []
        const color = new THREE.Color()
        color.setRGB(r, g, b)
        for (let i = 0; i < this.count; i++) {
            const particle = new THREE.Vector3(0, 0, 0)
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * 2

            particle.x = this.velocity * Math.sin(theta) * Math.cos(phi)
            particle.y = this.velocity * Math.sin(theta) * Math.sin(phi)
            particle.z = this.velocity * Math.cos(theta) * 5

            this.delta.push(particle)
            particles.push(0, 0, 0, i)
            colors.push(color.r, color.g, color.b, i)
        }
        this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(particles, 4))
        this.geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4))

        this.points = new THREE.Points(this.geometry, this.material)
        this.points.visible = false
        this.points.geometry.attributes.color.needsUpdate = true
        this.obj.add(this.points)
    }
    Start() {
        // this.scene.add(this.points)
        const positions = this.points.geometry.attributes.position
        this.material.opacity = 1
        this.v = 0.001

        for (let i = 0; i < this.delta.length; i++) {
            positions.setX(i, 0)
            positions.setY(i, 0)
            positions.setZ(i, 1)
        }
        this.points.visible = true
        this.processFlag = true
    }
    Complete() {
        this.points.visible = false
        this.processFlag = false
        // this.scene.remove(this.points)
    }
    v = 0.1
    Update(delta: number) {
        if (this.material.opacity <= 0 || !this.processFlag) return 
        const positions = this.points.geometry.attributes.position

        for (let i = 0; i < this.delta.length; i++) {
            const x = positions.getX(i)
            const y = positions.getY(i)
            const z = positions.getZ(i)

            positions.setX(i, x + this.delta[i].x * delta)
            positions.setY(i, y + this.delta[i].y * delta)
            positions.setZ(i, z - (Math.abs(this.delta[i].z * this.v)) * delta)
//            console.log(positions.getX(i), positions.getY(i), positions.getZ(i))
        }
        this.v += 0.1
        this.material.opacity -= (2 * delta)
        if (this.material.opacity <= 0) {
            this.Complete()
        }
        positions.needsUpdate = true
    }
}