import * as THREE from "three";
import { IEffect } from "../effector";
import { LightningParam, LightningStrike } from "./lightningstrike";

export class LightningVfx implements IEffect {
    processFlag = false
    rayParams: LightningParam = {
        sourceOffset: new THREE.Vector3(0, 10, 0),
        destOffset: new THREE.Vector3(),
        radius0: .1,
        radius1: .1,
        minRadius: 2.5,
        maxIterations: 7,
        isEternal: true,

        timeScale: 0.7,

        propagationTimeFactor: 0.05,
        vanishingTimeFactor: 0.95,
        subrayPeriod: 3.5,
        subrayDutyCycle: 0.6,
        maxSubrayRecursion: 3,
        ramification: 7,
        recursionProbability: 0.6,

        roughness: 0.85,
        straightness: 0.6
    };

    time = 0
	lightningMaterial = new THREE.MeshStandardMaterial( { 
        color: 0xffffff, emissive: "white", emissiveIntensity: 1
    } );
    lightningStrike = new LightningStrike(this.rayParams);
    lightningStrikeMesh = new THREE.Mesh(this.lightningStrike, this.lightningMaterial);
    outlineMeshArray: THREE.Mesh[] = [];

    get Mesh() { return this.lightningStrikeMesh }

    constructor(private game: THREE.Scene) {
        this.outlineMeshArray.push(this.lightningStrikeMesh);
    }
    Start() {
        this.processFlag = true
        this.game.add(this.lightningStrikeMesh)
    }
    Complete() {
        this.processFlag = false
        this.game.remove(this.lightningStrikeMesh)
    }
    Update(delta: number) {
        if (!this.processFlag) return
        this.time += delta
        this.lightningStrike.update(this.time);
    }
}				// Compose rendering
;
