import * as THREE from "three";
import IEventController, { ILoop, IViewer } from "./ievent";
import { EventTypes } from "@Glibs/types/globaltypes";


export class Canvas {
    width: number
    height: number
    objs: IViewer[] = []
    loopObjs: ILoop[] = []
    timeScale = 1

    constructor(eventCtrl: IEventController) {
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
        eventCtrl.RegisterEventListener(EventTypes.TimeCtrl, (scale: number) => {
            this.timeScale = scale
        })
    }

    clock = new THREE.Clock
    update() {
        const time = this.clock.getDelta()
        this.loopObjs.forEach((obj) => {
            obj.update(time * this.timeScale)
        })
    }

    resize() {
        this.width = window.innerWidth
        this.height = window.innerHeight
        this.objs.forEach((obj) => {
            obj.resize?.(this.width, this.height)
        })
    }

    get Width(): number { return this.width }
    get Height(): number { return this.height }
}