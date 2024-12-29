import { IPostPro } from '@Glibs/systems/postprocess/postpro'
import { IGameMode } from "./gamecenter";

export default class MenuState implements IGameMode {
    initCall: Function
    uninitCall: Function
    constructor(
        private scene: THREE.Scene,
        private objs: THREE.Object3D[] | THREE.Group[] | THREE.Mesh[] = [],
        {
            initCall = () => { },
            uninitCall = () => { },
        } = { }
    ) { 
        this.initCall = initCall
        this.uninitCall = uninitCall
    }
    Init(): void {
        this.initCall()
        this.scene.add(...this.objs)
    }
    Uninit(): void {
        this.objs.forEach((obj) => {
            this.scene.remove(obj)
        })
        this.uninitCall()
    }
    Renderer(renderer: IPostPro, delta: number): void {
       renderer.render(delta)
    }
}