import * as THREE from "three";
import { IEffect } from "../effector";
import shader from "./shader/firedef"

export class FlameSmokeVfx implements IEffect {
	processFlag = false
	material3?: THREE.ShaderMaterial
	obj = new THREE.Group()
    get Mesh() {return this.obj}
	
	constructor(
        private scene: THREE.Scene, 
		private scale: number = 2,
        private speed: number = 1,
        private color: THREE.Vector3 = new THREE.Vector3(64, 27, 0),
    ) {
		this.flame()
    }
	Start( dir: THREE.Vector3 = new THREE.Vector3(0, -1, 0),) {
        const target = new THREE.Vector3().addVectors(this.obj.position, dir.normalize())
        this.obj.lookAt(target)
		this.processFlag = true
		this.scene.add(this.obj)
	}
	Complete() {
		this.scene.remove(this.obj)
		this.processFlag = false
	}
	time = 0
	Update(delta: number) {
		if (!this.processFlag) return
		this.time += delta
		this.updateDraw(this.time )
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
					value: this.color
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
		mesh.rotation.set(0, Math.PI / 2, Math.PI / 2);
		//mesh.position.set(1 + -4.78, 0, 0);

		this.obj.add(mesh);
		this.obj.scale.set(this.scale, this.scale, this.scale);
	}

	updateDraw(deltaTime: number) {
		if (!this.material3) throw new Error("undefined");

		this.material3.uniforms.time.value = -(deltaTime * this.speed)
		this.material3.uniforms.color4.value = this.color;
	}
}