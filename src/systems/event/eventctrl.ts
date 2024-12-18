import * as EventEmitter from "eventemitter3";
import IEventController from "./ievent";

export class EventController implements IEventController {
    eventEmitter: EventEmitter.EventEmitter
    constructor() {
        this.eventEmitter = new EventEmitter.EventEmitter()
    }
    RegisterEventListener(type: string, callback: (...e: any[]) => void): void {
        this.eventEmitter.addListener(type, callback)
    }
    SendEventMessage(type: string, ...args: any[]): void {
        this.eventEmitter.emit(type, ...args)
    }

    /*
    OnKeyDownEvent(e: IKeyCommand) {
        this.eventEmitter.emit("keydown", e)
    }

    RegisterKeyDownEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.addListener("keydown", callback)
    }

    OnKeyUpEvent(e: IKeyCommand) {
        this.eventEmitter.emit("keyup", e)
    }

    RegisterKeyUpEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on("keyup", callback)
    }

    OnInputEvent(e: any, realV: THREE.Vector3, virtualV: THREE.Vector3) {
        this.eventEmitter.emit("input", e, realV, virtualV)
    }

    RegisterInputEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on("input", callback)
    }
    // Change Controll Object
    OnChangeCtrlObjEvent(obj?: IPhysicsObject) {
        this.eventEmitter.emit("ctrlobj", obj)
    }

    RegisterChangeCtrlObjEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on("ctrlobj", callback)
    }
    // Change Event Inventory
    OnChangeEquipmentEvent(inven: Inventory) {
        this.eventEmitter.emit("equip", inven)
    }
    RegisterChangeEquipmentEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on("equip", callback)
    }
    // Send Event
    OnChangeBrickInfo(opt: BrickOption) { 
        this.eventEmitter.emit("bsize", opt)
    }
    RegisterBrickInfo(callback: (...e: any[]) => void) {
        this.eventEmitter.on("bsize", callback)
    }
    // terrain Event
    OnChangeTerrainInfo(opt: TerrainOption) { 
        this.eventEmitter.emit("tsize", opt)
    }
    RegisterTerrainInfo(callback: (...e: any[]) => void) {
        this.eventEmitter.on("tsize", callback)
    }

    //Attack Event
    OnAttackEvent(monster: string, opt: AttackOption[]) {
        this.eventEmitter.emit(monster, opt)
    }
    RegisterAttackEvent(monster: string, callback: (...e: any[]) => void) {
        this.eventEmitter.on(monster, callback)
    }

    // Scene Reload
    OnSceneClearEvent() { 
        this.eventEmitter.emit("clear")
    }
    RegisterSceneClearEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on("clear", callback)
    }
    OnSceneReloadEvent() { 
        this.eventEmitter.emit("reload")
    }
    RegisterReloadEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on("reload", callback)
    }

    curMode = AppMode.Long
    // GAME MODE
    OnAppModeEvent(mode: AppMode, ...arg: any) {
        if(mode == this.curMode) return
        this.eventEmitter.emit(SConf.AppMode, this.curMode, EventFlag.End, ...arg)
        this.eventEmitter.emit(SConf.AppMode, mode, EventFlag.Start, ...arg)
        this.curMode = mode
    }
    OnAppModeMessage(...arg: any) {
        this.eventEmitter.emit(SConf.AppMode, this.curMode, EventFlag.Message, arg)
    }
    RegisterAppModeEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on(SConf.AppMode, callback)
    }
    OnPlayModeEvent(...arg: any) {
        this.eventEmitter.emit(SConf.PlayMode, arg)
    }
    RegisterPlayModeEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on(SConf.PlayMode, callback)
    }

    // Player Health Monitor
    OnChangePlayerStatusEvent(status: PlayerStatus) {
        this.eventEmitter.emit(SConf.PlayerStatus, status)
    }
    RegisterChangePlayerStatusEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on(SConf.PlayerStatus, callback)
    }
    OnProjectileEvent(opt: ProjectileMsg) {
        this.eventEmitter.emit(SConf.projectile, opt)
    }
    RegisterProjectileEvent(callback: (...e: any[]) => void) {
        this.eventEmitter.on(SConf.projectile, callback)
    }
    */
}
