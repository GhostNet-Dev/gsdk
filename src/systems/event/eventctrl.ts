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
}
