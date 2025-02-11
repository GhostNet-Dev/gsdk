import { KeyType } from "@Glibs/types/eventtypes"

export default interface IEventController {
    SendEventMessage(type: string, ...args: any[]): void
    RegisterEventListener(type: string, callback: (...e: any[]) => void): void
}

export interface IKeyCommand {
    get Type(): KeyType
    ExecuteKeyUp(): THREE.Vector3
    ExecuteKeyDown(): THREE.Vector3
}

export interface ILoop {
    LoopId: number
    update(delta: number): void
}

export interface IViewer {
    resize(width: number, height: number): void
}