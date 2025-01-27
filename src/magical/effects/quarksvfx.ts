import * as THREE from "three";
import {
    BatchedParticleRenderer,
    ParticleEmitter,
    QuarksLoader,
} from 'three.quarks';
import { IEffect } from "./ieffector";

export class QuarksVfx implements IEffect {
    totalTime = 0;
    refreshIndex = 0;
    refreshTime = 2;
    processFlag = false
    batchRenderer = new BatchedParticleRenderer();
    loaded = false
    endCallback?: Function
   
    groups: THREE.Object3D[] = []
    obj = new THREE.Group()
    get Mesh() {return this.obj}

    constructor(private vfxPath: string, private game: THREE.Scene) {}

    initEffect(pos: THREE.Vector3) {
        if(this.loaded) return
        this.loaded = true
        new QuarksLoader().load(this.vfxPath, (obj) => {
            obj.traverse((child) => {
                if (child instanceof ParticleEmitter) {
                    this.batchRenderer.addSystem(child.system);
                }
            });
            if (obj instanceof ParticleEmitter) {
                this.batchRenderer.addSystem(obj.system);
                this.refreshTime = obj.system.duration
            }
            this.obj.add(this.batchRenderer, obj)
            this.groups.push(obj);
            this.game.add(this.obj)
        });
    }

    Start(pos: THREE.Vector3, callback: Function): void {
        if (this.processFlag || !this.loaded) return
        this.endCallback = callback
        this.groups[this.refreshIndex].position.copy(pos)
        this.groups[this.refreshIndex].updateMatrixWorld(true)
        console.log(pos, this.groups[this.refreshIndex].position, this.obj.position, this.batchRenderer.position)
        try {
            this.groups[this.refreshIndex].traverse((object) => {
                if (object instanceof ParticleEmitter) {
                    object.system.restart();
                }
            });
        } catch (e) {
            console.log(e, this.groups)
        }
        this.processFlag = true
    }
    Complete(): void {
        this.totalTime = 0;
        this.processFlag = false
        this.endCallback?.()
    }

    Update(delta: number): void {
        if(!this.processFlag) return
        this.groups.forEach((group) => {
            group.traverse((object) => {
                if (object.userData && object.userData.func) {
                    object.userData.func.call(object, delta);
                }
            })
        });
        this.totalTime += delta;
        if (this.totalTime > this.refreshTime) {
            this.Complete()
        }
        if (this.batchRenderer) {
            const tmp = console.warn
            console.warn = () => { }
            this.batchRenderer.update(delta);
            console.warn = tmp
        }
    }
}