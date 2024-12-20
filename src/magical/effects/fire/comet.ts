import * as THREE from "three";
import { IEffect } from "../ieffector";
import shader from "./shader/firedef"

export class CometVfx implements IEffect {
	processFlag = false
	options = {
		exposure: 2.8,
		bloomStrength: 3.5,
		bloomRadius: 0.39,
		color0: [0, 0, 0],
		color1: [81, 14, 5],
		color2: [181, 156, 24],
		color3: [66, 66, 66],
		color4: [79, 79, 79],
		color5: [64, 27, 0]
	};
	material?: THREE.ShaderMaterial
	material2?: THREE.ShaderMaterial
	material3?: THREE.ShaderMaterial
	obj = new THREE.Group()
    get Mesh() {return this.obj}

	constructor(private scene: THREE.Scene) {
		this.mesh()
		this.flame()
		this.cylinder()
	}
	Start() {
		this.processFlag = true
		this.scene.add(this.obj)
	}
	Complete() {
		this.processFlag = false
	}
	time = 0
	Update(delta: number) {
		if (!this.processFlag) return
		this.time += delta
		this.updateDraw(this.time / 10)
	}
	mesh() {
		const geometry = new THREE.SphereGeometry(1, 30, 30);
		this.material = new THREE.ShaderMaterial({
			uniforms: {
				time: {
					value: 0.0
				},
				perlinnoise: {
					value: new THREE.TextureLoader().load(
						"assets/texture/noise9.jpg"
					)
				},
				sparknoise: {
					value: new THREE.TextureLoader().load(
						"assets/texture/sparklenoise.jpg"
					)
				},
				color5: {
					value: new THREE.Vector3(...this.options.color5)
				},
				color4: {
					value: new THREE.Vector3(...this.options.color4)
				},
				color3: {
					value: new THREE.Vector3(...this.options.color3)
				},
				color2: {
					value: new THREE.Vector3(...this.options.color2)
				},
				color1: {
					value: new THREE.Vector3(...this.options.color1)
				},
				color0: {
					value: new THREE.Vector3(...this.options.color0)
				},
				resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
			},
			vertexShader: shader.cometVert,
			fragmentShader: shader.cometFrag
		});

		const mesh = new THREE.Mesh(geometry, this.material);
		mesh.scale.set(0.78, 0.78, 0.78);
		mesh.position.set(1 + 0, 0, 0);
		this.obj.add(mesh);
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
					value: new THREE.Vector3(...this.options.color4)
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
		mesh.rotation.set(0, 0, -Math.PI / 2);
		mesh.position.set(1 + -4.05, 0, 0);
		mesh.scale.set(1.5, 1.7, 1.5);
		this.obj.add(mesh);
	}

	flame() {
		const geometry = new THREE.CylinderGeometry(1, 0, 5.3, 50, 50, true);
		this.material3 = new THREE.ShaderMaterial({
			uniforms: {
				perlinnoise: {
					value: new THREE.TextureLoader().load(
						"assets/texture/water-min.jpg"
					)
				},
				color4: {
					value: new THREE.Vector3(...this.options.color5)
				},
				time: {
					value: 0.0
				},
				noise: {
					value: new THREE.TextureLoader().load(
						"assets/texture/noise9.jpg"
					)
				}
			},
			// wireframe:true,
			vertexShader: shader.cometFlameVert,
			fragmentShader: shader.cometFlameFrag,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide
		});

		const mesh = new THREE.Mesh(geometry, this.material3);
		mesh.rotation.set(0, 0, -Math.PI / 2);
		mesh.position.set(1 + -4.78, 0, 0);
		mesh.scale.set(2, 2, 2);
		this.obj.add(mesh);
	}

	updateDraw(deltaTime: number) {
		if (!this.material || !this.material2 || !this.material3) throw new Error("undefined");

		this.material.uniforms.time.value = -deltaTime 
		this.material2.uniforms.time.value = -deltaTime
		this.material3.uniforms.time.value = -deltaTime
		this.material.uniforms.color5.value = new THREE.Vector3(...this.options.color5);
		this.material2.uniforms.color4.value = new THREE.Vector3(...this.options.color4);
		this.material3.uniforms.color4.value = new THREE.Vector3(...this.options.color5);
		this.material.uniforms.color3.value = new THREE.Vector3(...this.options.color3);
		this.material.uniforms.color2.value = new THREE.Vector3(...this.options.color2);
		this.material.uniforms.color1.value = new THREE.Vector3(...this.options.color1);
		this.material.uniforms.color0.value = new THREE.Vector3(...this.options.color0);
	}
}
