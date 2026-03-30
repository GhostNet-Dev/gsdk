import * as THREE from "three";
import IEventController, { ILoop, IViewer } from "./ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

export enum LoopType {
  GamePlay,
  Systems
}

type LoopState = {
    elapsedTime: number
    objs: ILoop[]
}

type LoopSearchResult =
    | { found: true, loopType: LoopType, idx: number }
    | { found: false, idx: -1 }

export class Canvas {
    width: number
    height: number
    objs: IViewer[] = []
    timeScale = 1
    objId = 1
    loopStates: Record<LoopType, LoopState> = {
        [LoopType.GamePlay]: { elapsedTime: 0, objs: [] },
        [LoopType.Systems]: { elapsedTime: 0, objs: [] },
    }

    constructor(eventCtrl: IEventController) {
        this.width = window.innerWidth
        this.height = window.innerHeight

        eventCtrl.RegisterEventListener(EventTypes.RegisterLoop, (obj: ILoop, loopType: LoopType = LoopType.GamePlay) => {
            if(!obj.LoopId) {
                obj.LoopId = this.objId++
            } else {
                if (this.findLoopIndex(obj.LoopId).idx > -1) {
                    console.warn("already register " + obj.constructor.name);
                    return
                }
            }
            obj.StartLoop?.()
            this.loopStates[loopType].objs.push(obj)
        })
        eventCtrl.RegisterEventListener(EventTypes.DeregisterLoop, (obj: ILoop) => {
            const loopInfo = this.findLoopIndex(obj.LoopId)
            if(!loopInfo.found) {
                console.warn("not exist in array");
                return
            }
            obj.StopLoop?.()
            console.log("deregister " + obj.constructor.name);
            this.loopStates[loopInfo.loopType].objs.splice(loopInfo.idx, 1)
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
        const systemDelta = Math.min(this.clock.getDelta(), 1)
        const gamePlayDelta = Math.min(systemDelta * this.timeScale, 1)

        this.updateLoop(LoopType.Systems, systemDelta)
        this.updateLoop(LoopType.GamePlay, gamePlayDelta)
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

    private findLoopIndex(loopId: number): LoopSearchResult {
        for (const loopType of [LoopType.GamePlay, LoopType.Systems] as const) {
            const idx = this.loopStates[loopType].objs.findIndex((o) => o.LoopId == loopId)
            if (idx > -1) {
                return { found: true, loopType, idx }
            }
        }
        return { found: false, idx: -1 }
    }

    private updateLoop(loopType: LoopType, delta: number) {
        const state = this.loopStates[loopType]
        state.elapsedTime += delta
        state.objs.forEach((obj) => {
            obj.update(delta, state.elapsedTime)
        })
    }
}
