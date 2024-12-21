import * as THREE from "three";
import IEventController, { ILoop, IViewer } from "./ievent";
import { EventTypes } from "@Glibs/types/globaltypes";


export class Canvas {
    canvas: HTMLCanvasElement
    width: number
    height: number
    objs: IViewer[] = []
    loopObjs: ILoop[] = []

    constructor(eventCtrl: IEventController) {
        this.canvas = document.getElementById('avatar-bg') as HTMLCanvasElement
        this.width = window.innerWidth
        this.height = window.innerHeight
        eventCtrl.RegisterEventListener(EventTypes.RegisterLoop, (obj: ILoop) => {
            this.loopObjs.push(obj)
        })
        eventCtrl.RegisterEventListener(EventTypes.DeregisterLoop, (obj: ILoop) => {
            this.loopObjs.splice(this.loopObjs.indexOf(obj), 1)
        })
        eventCtrl.RegisterEventListener(EventTypes.RegisterViewer, (obj: IViewer) => {
            this.objs.push(obj)
        })
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