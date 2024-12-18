import * as THREE from "three";
import { Controller } from "../controller";
import { Utils } from "../flame";
import shader from "../shader/flamedef"

class FlareParticle {

	private geometry: THREE.BufferGeometry;
	private particlesNumber = 500;
	private particleSystem;

	private time: number = 0;
	private spawnParticleTime: number = 0;
	private spawnParticleInterval: number = 1;
	private needsUpdate: boolean[];
	private originalSizes: Float32Array;
	private moveDest: Float32Array;
	private particleTime: Float32Array;
	private particleColor: number[];

	private particleSpreadingRatio: number = 0;

	constructor(
		private ctrl: Controller,
		private scene: THREE.Group,
		private MAXIMUM_LIVE_TIME: number = 20000,
	) {

		let shaderMaterial = new THREE.ShaderMaterial({
			uniforms: {
				color: { value: new THREE.Color(0xffffff) },
				texture: { value: new THREE.TextureLoader().load("assets/texture/circle-particle.png") }
			},
			vertexShader: shader.flameParticleVert,
			fragmentShader: shader.flameParticleFrag,
			depthTest: false,
			transparent: true
		});

		this.geometry = new THREE.BufferGeometry();

		let positions = new Float32Array(this.particlesNumber * 3);
		let colors = new Float32Array(this.particlesNumber * 3);
		let sizes = new Float32Array(this.particlesNumber);

		this.needsUpdate = [];
		this.originalSizes = new Float32Array(this.particlesNumber);
		this.moveDest = new Float32Array(this.particlesNumber * 3);
		this.particleTime = new Float32Array(this.particlesNumber);
		this.particleColor = Utils.hexToVec3(this.ctrl.getParams().ParticleColor);

		for (let i = 0, i3 = 0; i < this.particlesNumber; i++ , i3 += 3) {
			positions[i3 + 0] = 0;
			positions[i3 + 1] = 0;
			positions[i3 + 2] = 0;

			this.moveDest[i3] = Math.random() * 200 - 100;
			this.moveDest[i3 + 1] = Math.random() * 0.3 + 0.45;
			this.moveDest[i3 + 2] = Math.random() * 200 - 100;

			colors[i3 + 0] = this.particleColor[0];
			colors[i3 + 1] = this.particleColor[1];
			colors[i3 + 2] = this.particleColor[2];
			sizes[i] = Math.random() * 1;
			this.originalSizes[i] = sizes[i];
		}
		this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		this.geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
		this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
		this.particleSystem = new THREE.Points(this.geometry, shaderMaterial);

		this.scene.add(this.particleSystem);

		this.reset();
		this.setController();

		this.ctrl.attachEvent(this.ctrl.PARTICLE_COLOR, (value: string) => {
			this.particleColor = Utils.hexToVec3(value);
		});
	}

	private setController() {
		this.particleSpreadingRatio = this.ctrl.getParams().ParticleSpread;
		this.ctrl.attachEvent(this.ctrl.PARTICLE_SPREAD, (value: number) => {
			this.particleSpreadingRatio = value;
		});
	}

	public reset() {
		this.time = 0;
		this.spawnParticleTime = 0;
		this.spawnParticleInterval = 1;

		let sizes = this.geometry.attributes['size'].array;
		let positions = this.geometry.attributes['position'].array;

		for (let i = 0; i < this.particlesNumber; i++) {
			sizes[i] = 0;
			positions[i*3] = 0;
			positions[i*3 + 1] = 0;
			positions[i*3 + 2] = 0;
			this.needsUpdate[i] = false;
			this.particleTime[i] = 0;
		}

		this.geometry.attributes['size'].needsUpdate = true;
		this.geometry.attributes['position'].needsUpdate = true;
	}

	private spawnParticle() {
		for (let i = 0; i < this.particlesNumber; i++) {
			if (this.needsUpdate[i] == false) {
				this.needsUpdate[i] = true;
				return;
			}
		}
	}

	public update(deltaTime: number) {

		this.spawnParticleTime += deltaTime;
		if (this.spawnParticleTime > this.spawnParticleInterval) {
			this.spawnParticleTime = 0;
			this.spawnParticleInterval = Math.random() * 300 + 50;
			this.spawnParticle();
		}

		deltaTime /= 1000;
		this.time += deltaTime;

		this.particleSystem.rotation.y += 0.01 * deltaTime;
		let timeScale = this.ctrl.getParams().TimeScale / 3;
		let sizes = this.geometry.attributes['size'].array;
		let positions = this.geometry.attributes['position'].array;
		let colors = this.geometry.attributes['customColor'].array;

		for (let i = 0, i3 = 0; i < this.particlesNumber; i++ , i3 += 3) {
			if (this.needsUpdate[i]) {
				if (this.particleTime[i] > this.MAXIMUM_LIVE_TIME / 1000) {
					positions[i3] = 0;
					positions[i3 + 1] = 0;
					positions[i3 + 2] = 0;
					this.particleTime[i] = 0;
					sizes[i] = 0.01;
				} else {
					let ac = this.particleSpreadingRatio *
						this.particleTime[i] / (this.MAXIMUM_LIVE_TIME / 1000) +
						0.01 * Math.sin(this.time);
					let randDist = (10 * Math.sin(0.3 * i + this.time + Math.random() / 10)) * timeScale;
					sizes[i] = this.originalSizes[i] * (1 + Math.sin(0.4 * i + this.time));
					positions[i3] = ac * this.moveDest[i3] + randDist;
					positions[i3 + 1] += (Math.random() * 0.4 + 0.9) * this.moveDest[i3 + 1] * timeScale;
					positions[i3 + 2] = ac * this.moveDest[i3 + 2] + randDist;
					this.particleTime[i] += deltaTime;
				}
			}

			colors[i3] = this.particleColor[0];
			colors[i3 + 1] = this.particleColor[1];
			colors[i3 + 2] = this.particleColor[2];
		}

		this.geometry.attributes['customColor'].needsUpdate = true;
		this.geometry.attributes['size'].needsUpdate = true;
		this.geometry.attributes['position'].needsUpdate = true;
	}

}

export { FlareParticle };