import * as THREE from "three";
import IEventController, { ILoop, IViewer } from "./ievent";
import { EventTypes } from "@Glibs/types/globaltypes";


export class Canvas {
    width: number
    height: number
    objs: IViewer[] = []
    loopObjs: ILoop[] = []
    timeScale = 1
    objId = 1

    constructor(eventCtrl: IEventController) {
        this.width = window.innerWidth
        this.height = window.innerHeight

        eventCtrl.RegisterEventListener(EventTypes.RegisterLoop, (obj: ILoop) => {
            obj.StartLoop?.()
            if(!obj.LoopId) {
                obj.LoopId = this.objId++
            } else {
                if (this.loopObjs.findIndex(o => o.LoopId == obj.LoopId) > -1) {
                    console.warn("already register " + obj.constructor.name);
                    return
                }
            }
            this.loopObjs.push(obj)
        })
        eventCtrl.RegisterEventListener(EventTypes.DeregisterLoop, (obj: ILoop) => {
            obj.StopLoop?.()
            console.log("deregister " + obj.constructor.name);
            const idx = this.loopObjs.findIndex(o => o.LoopId == obj.LoopId)
            if(idx < 0) {
                console.warn("not exist in array");
                return
            }            
            this.loopObjs.splice(idx, 1)
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
        const time = Math.min(this.clock.getDelta() * this.timeScale, 1)
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

    get Width(): number { return this.width }
    get Height(): number { return this.height }
}