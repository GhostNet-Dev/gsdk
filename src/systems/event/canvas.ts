import * as THREE from "three";
import { ILoop, IViewer } from "./ievent";
import { ICanvas } from "@Glibs/interface/ievent";


export class Canvas implements ICanvas {
    canvas: HTMLCanvasElement
    width: number
    height: number
    objs: IViewer[]
    loopObjs: ILoop[] = []

    constructor(...objs: IViewer[]) {
        this.canvas = document.getElementById('avatar-bg') as HTMLCanvasElement
        this.width = window.innerWidth
        this.height = window.innerHeight
        this.objs = objs
    }
    RegisterLoop(obj: ILoop) {
        this.loopObjs.push(obj)
    }
    RegisterViewer(obj: IViewer) {
        this.objs.push(obj)
    }
    clock = new THREE.Clock
    update() {
        const time = this.clock.getDelta()
        this.loopObjs.forEach((obj) => {
            obj.update(time)
        })
    }

    resize() {
        this.width = window.innerWidth
        this.height = window.innerHeight
        this.objs.forEach((obj) => {
            obj.resize?.(this.width, this.height)
        })
    }

    get Canvas(): HTMLCanvasElement {
        return this.canvas
    }
    get Width(): number { return this.width }
    get Height(): number { return this.height }
}