import IEventController from '@Glibs/interface/ievent';
import { IPostPro } from '@Glibs/systems/postprocess/postpro'
import { EventTypes } from '@Glibs/types/globaltypes';

export interface IGameMode {
    Init(): void
    Uninit(): void
    Renderer(r: IPostPro, delta: number): void
}

export default class GameCenter {
    mode = new Map<string, IGameMode>();
    curr: string = ""
    currentMode?: IGameMode
    constructor(private eventCtrl: IEventController) {
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
        obj.Init()
        this.currentMode = obj
        this.curr = mode
    }
    Renderer(r: IPostPro, delta: number) {
        this.currentMode?.Renderer(r, delta)
    }
}