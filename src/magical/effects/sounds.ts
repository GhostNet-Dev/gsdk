import * as THREE from "three";
import { IEffect } from "./ieffector";

export class Sounds implements IEffect {
    private processFlag = false
    private audioLoader = new THREE.AudioLoader()
    private sound: THREE.PositionalAudio
    obj = new THREE.Group()

    get Sound() { return this.sound }
    get Mesh() { return this.obj }

    constructor(
        listener: THREE.AudioListener,
        audioPath: string,
    ) {
        this.sound = new THREE.PositionalAudio(listener)
        this.audioLoader.load(audioPath, (buffer) => {
            this.sound.setBuffer(buffer)
            this.sound.setRefDistance(20)
            this.obj.add(this.sound)
        })
    }

    Start() {
        this.processFlag = true
        this.sound.play()
    }
    Complete(): void {
        
    }
    Update(_: number) {
        if (!this.processFlag) return
    }
}