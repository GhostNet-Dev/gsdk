import * as THREE from "three";
import { IEffect } from "./effector";

export class TestVfx implements IEffect {
    processFlag = false
	obj = new THREE.Group()
    get Mesh() {return this.obj}

    constructor(_: THREE.Scene) {
    }
    Start() {
        this.processFlag = true
    }
    Complete() {
        this.processFlag = false
    }
    Update(_: number) {
        if (!this.processFlag) return
    }
}