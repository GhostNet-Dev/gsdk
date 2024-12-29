import { IPostPro } from '@Glibs/systems/postprocess/postpro'

export interface IGameMode {
    Init(): void
    Uninit(): void
    Renderer(r: IPostPro, delta: number): void
}

export default class GameCenter {
    mode = new Map<string, IGameMode>();
    currentMode?: IGameMode
    constructor() { }

    RegisterGameMode(mode: string, obj: IGameMode) {
        this.mode.set(mode, obj)
    }
    ChangeMode(mode: string) {
        const obj = this.mode.get(mode)
        if(!obj) throw new Error("undefined mdoe");
        this.currentMode?.Uninit()
        obj.Init()
        this.currentMode = obj
    }
    Renderer(r: IPostPro, delta: number) {
        this.currentMode?.Renderer(r, delta)
    }
}