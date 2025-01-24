import IEventController, { ILoop } from '@Glibs/interface/ievent';
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { IPostPro } from '@Glibs/systems/postprocess/postpro'
import { EventTypes } from '@Glibs/types/globaltypes';

export interface IGameMode {
    get TaskObj(): ILoop[] 
    get Physics(): IPhysicsObject[]
    get Objects(): THREE.Object3D[] | THREE.Group[] | THREE.Mesh[]
    Init(): void
    Uninit(): void
    Renderer(r: IPostPro, delta: number): void
}

export default class GameCenter {
    mode = new Map<string, IGameMode>();
    curr: string = ""
    currentMode?: IGameMode
    constructor(private eventCtrl: IEventController, private scene: THREE.Scene) {
        this.eventCtrl.RegisterEventListener(EventTypes.GameCenter, (mode: string) => {
            this.ChangeMode(mode)
        })
    }

    RegisterGameMode(mode: string, obj: IGameMode) {
        this.mode.set(mode, obj)
    }
    ChangeMode(mode: string) {
        if(this.curr == mode) return

        const obj = this.mode.get(mode)
        if(!obj) throw new Error("undefined mode = " + mode);

        this.currentMode?.Uninit()
        this.currentMode?.Objects.forEach((obj) => {
            this.scene.remove(obj)
        })
        this.currentMode?.TaskObj.forEach((obj) => {
            if ("update" in obj) this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, obj)
        })
        this.currentMode?.Physics.forEach((obj) => {
            this.scene.remove(obj.Meshs)
        })
        obj.Init()
        obj.Objects.forEach((o) =>{
            this.scene.add(o)
        })
        obj.TaskObj.forEach((o) =>{
            if ("update" in o) this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, o)
        })
        obj.Physics.forEach((o) =>{
            this.scene.add(o.Meshs)
        })
        this.currentMode = obj
        this.curr = mode
    }
    Renderer(r: IPostPro, delta: number) {
        this.currentMode?.Renderer(r, delta)
    }
}