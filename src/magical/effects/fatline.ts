import * as THREE from "three";
import { IEffect } from "./ieffector";
import { Line2 } from "three/examples/jsm/lines/Line2"
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial"
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry"
import * as GeometryUtils from "three/examples/jsm/utils/GeometryUtils"

export class FatLineVfx implements IEffect {
    processFlag = false
    matLine = new LineMaterial( {
        color:0xffffff,
        linewidth: 9,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        vertexColors: true,
        dashed: false,
        alphaToCoverage: true
    })
    matLineBasic = new THREE.LineBasicMaterial({ vertexColors: true })
    line: Line2
    line1: THREE.Line
	obj = new THREE.Group()
    get Mesh() {return this.obj}

    constructor(private scene: THREE.Scene) {
        const positions: number[] = []
        const colors: number[] = []
        const points = GeometryUtils.hilbert3D(new THREE.Vector3(), 20.0, 1, 0, 1, 2, 3, 4, 5, 6, 7)
        const spline = new THREE.CatmullRomCurve3(points)
        const divisions = Math.round(12 * points.length)
        const point = new THREE.Vector3()
        const color = new THREE.Color()
        for (let i = 0, l = divisions; i < l; i++) {
            const t = i / l
            spline.getPoint(t, point)
            positions.push(point.x, point.y, point.z)
            color.setHSL(t, 1.0, 0.5, THREE.SRGBColorSpace)
            colors.push(color.r, color.g, color.b)
        }

        const geometry = new LineGeometry()
        geometry.setPositions(positions)
        geometry.setColors(colors)
        this.line = new Line2(geometry, this.matLine)
        this.line.computeLineDistances()
        const scale = 1
        this.line.scale.set(scale, scale, scale)

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        this.line1 = new THREE.Line(geo, this.matLineBasic)
        this.line1.computeLineDistances()
        this.line1.visible = false
        this.obj.add(this.line, this.line1)
    }
    Start() {
        this.processFlag = true
        this.scene.add(this.obj)
        setTimeout(() => { this.Complete() }, 5000)
    }
    Complete() {
        this.processFlag = false
        this.scene.remove(this.obj)
    }
    Update(_: number) {
        if (!this.processFlag) return
    }
}