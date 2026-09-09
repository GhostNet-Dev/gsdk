import * as THREE from "three";
import {
    BatchedParticleRenderer,
    ParticleEmitter,
    QuarksLoader,
} from 'three.quarks';
import { IEffect } from "./ieffector";

enum QuarksVfxLoadState {
    Idle = "idle",
    Loading = "loading",
    Ready = "ready",
    Failed = "failed",
}

type PendingQuarksStart = {
    pos?: THREE.Vector3
    callback?: Function
}

export class QuarksVfx implements IEffect {
    totalTime = 0;
    refreshIndex = 0;
    refreshTime = 2;
    processFlag = 0
    batchRenderer = new BatchedParticleRenderer();
    private loadState = QuarksVfxLoadState.Idle
    private pendingStart?: PendingQuarksStart
    endCallback?: Function
   
    groups: THREE.Object3D[] = []
    obj = new THREE.Group()
    get Mesh() {return this.obj}

    constructor(private vfxPath: string, private game: THREE.Scene) {}

    initEffect(pos: THREE.Vector3) {
        if(this.loadState !== QuarksVfxLoadState.Idle) return
        this.loadState = QuarksVfxLoadState.Loading
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
            this.loadState = QuarksVfxLoadState.Ready
            this.flushPendingStart()
        }, undefined, (error) => {
            this.loadState = QuarksVfxLoadState.Failed
            this.pendingStart = undefined
            console.warn("[QuarksVfx] Failed to load effect.", this.vfxPath, error)
        });
    }

    Start(pos?: THREE.Vector3, callback?: Function): void {
        if (this.loadState !== QuarksVfxLoadState.Ready) {
            if (this.loadState !== QuarksVfxLoadState.Failed) {
                this.pendingStart = {
                    pos: pos?.clone(),
                    callback,
                }
            }
            return
        }

        this.startReady(pos, callback)
    }

    private flushPendingStart(): void {
        if (!this.pendingStart) return

        const pendingStart = this.pendingStart
        this.pendingStart = undefined
        this.startReady(pendingStart.pos, pendingStart.callback)
    }

    private startReady(pos?: THREE.Vector3, callback?: Function): void {
        const group = this.groups[this.refreshIndex]
        if (!group) {
            console.warn("[QuarksVfx] Missing particle group.", this.vfxPath, this.refreshIndex)
            return
        }

        this.endCallback = callback
        this.obj.visible = true
        if (pos) group.position.copy(pos)
        group.updateMatrixWorld(true)
        // console.log(pos, this.groups[this.refreshIndex].position, this.obj.position, this.batchRenderer.position)
        try {
            group.traverse((object) => {
                if (object instanceof ParticleEmitter) {
                    object.system.restart();
                }
            });
        } catch (e) {
            console.log(e, this.groups)
        }
        this.processFlag++
    }
    Complete(): void {
        const wasRunning = this.processFlag > 0
        this.totalTime = 0;
        this.processFlag = Math.max(0, this.processFlag - 1);
        this.obj.visible = false
        if (wasRunning) this.endCallback?.()
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
