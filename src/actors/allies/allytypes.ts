import * as THREE from "three";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { AttackOption } from "@Glibs/types/playertypes";
import { EffectType } from "@Glibs/types/effecttypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { StatKey } from "@Glibs/types/stattypes";
import { Char } from "@Glibs/types/assettypes";
import { IActorState } from "@Glibs/actors/monsters/monstertypes";

export { IActorState }

export enum AllyId {
    Warrior = "Warrior",
    Archer  = "Archer",
    Mage    = "Mage",
}

export type AllySet = {
    allyModel: IPhysicsObject
    allyCtrl: IAllyCtrl
    live: boolean
    deckLevel: number
    deadtime: number
    initPos?: THREE.Vector3
    attackListener?: (opts: AttackOption[]) => void
}

export type AllySpawnSpec = {
    allyId: AllyId
    deckLevel: number
    offset?: THREE.Vector3
}

export interface IAllyCtrl {
    get Spec(): BaseSpec
    get AllyBox(): AllyBox
    get TargetId(): string
    get DeckLevel(): number
    Summoned(): void
    Dispose(): void
    ReceiveDemage(demage: number, effect?: EffectType, attackRange?: number, knockbackDist?: number): boolean
}

export class AllyBox extends THREE.Mesh {
    constructor(
        public Id: number,
        public ObjName: string,
        public AllyId: AllyId,
        geo: THREE.BoxGeometry,
        mat: THREE.MeshBasicMaterial,
    ) {
        super(geo, mat)
        this.name = ObjName
    }
}

export type AllyProperty = {
    id: AllyId
    model: Char
    stats?: Partial<Record<StatKey, number>>
    idleStates?: (...params: any[]) => IActorState
}
