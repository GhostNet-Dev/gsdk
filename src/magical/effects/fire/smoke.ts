import * as THREE from "three";
import { IEffect } from "../effector";
import shader from "./shader/firedef"

export class SmokeVfx implements IEffect {
	processFlag = false
	material2?: THREE.ShaderMaterial
	obj = new THREE.Group()
    get Mesh() {return this.obj}

	constructor(
        private scene: THREE.Scene, 
		private scale: number = 2,
        private speed: number = 1,
        private color: THREE.Vector3 = new THREE.Vector3(79, 79, 79),
    ) {
		this.cylinder()
	}
	Start(dir: THREE.Vector3 = new THREE.Vector3(0, -1, 0),) {
        dir.normalize()
        const target = new THREE.Vector3().addVectors(this.obj.position, dir)
        this.obj.lookAt(target)
		this.processFlag = true
		this.scene.add(this.obj)
	}
	Complete() {
		this.scene.remove(this.obj)
		this.processFlag = false
	}
	cylinder() {
		const geometry = new THREE.CylinderGeometry(1.11, 0, 5.3, 50, 50, true);
		this.material2 = new THREE.ShaderMaterial({
			uniforms: {
				perlinnoise: {
					value: new THREE.TextureLoader().load(
						"assets/texture/water-min.jpg"
					)
				},
				color4: {
					value: this.color
				},
				time: { value: 0.0 },
				noise: {
					value: new THREE.TextureLoader().load(
						"assets/texture/noise9.jpg"
					)
				}
			},
			// wireframe:true,
			vertexShader: shader.cometCylinderVert,
			fragmentShader: shader.cometCylinderFlag,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide
		});

		const mesh = new THREE.Mesh(geometry, this.material2);
		mesh.rotation.set(0, Math.PI / 2, Math.PI / 2);
		mesh.scale.set(1.5, 1.7, 1.5);
		this.obj.add(mesh);
		this.obj.scale.set(this.scale, this.scale, this.scale);
	}
	time = 0
	Update(delta: number) {
		if (!this.processFlag) return
		this.time += delta
		this.updateDraw(this.time)
	}
	updateDraw(deltaTime: number) {
		if (!this.material2) throw new Error("undefined");

        this.material2.uniforms.time.value = -(deltaTime * this.speed)
		this.material2.uniforms.color4.value = this.color
	}
}