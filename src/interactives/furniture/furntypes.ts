import * as THREE from "three";
import { Char } from "@Glibs/types/assettypes"

export class FurnId {
    public static DefaultBed = "defaultbed"
    public static DefaultBath = "defaultbath"
    public static DefaultBookShelf = "defaultbookshelf"
    public static DefaultCloset = "defaultcloset"
    public static DefaultDesk = "defaultdesk"
    public static DefaultKitchen = "defaultkitchen"
    public static DefaultKitTable = "defaultkittable"
    public static DefaultOven = "defaultoven"
    public static DefaultRefrigerator = "defaultrefrigerator"
    public static DefaultSink = "defaultsink"
    public static DefaultTable = "defaulttable"
    public static DefaultToilet = "defaulttoilet"
    public static DefaultTv = "defaulttv"
    public static List = [
        this.DefaultBed, this.DefaultBath, this.DefaultBookShelf, this.DefaultCloset,
        this.DefaultDesk, this.DefaultKitTable, this.DefaultKitchen, this.DefaultOven,
        this.DefaultRefrigerator, this.DefaultSink, this.DefaultTable, this.DefaultToilet,
        this.DefaultTv, 
    ]
}
export enum FurnType {
    Bed, Bath, BookShelf, Closet, Desk, Kitchen, Table, Oven, Refrigerator,
    Sink, Toilet, Tv
}
export enum LocType {
    Living, Dining, Master, Kitchen, Bath
}

export type MadeBy = {
    itemId: string,
    count: number
}
export type FurnProperty = {
    id: FurnId
    type: FurnType
    loc: LocType
    assetId: Char
    name: string
    namekr: string
    buildingTime: number
    madeby?: MadeBy[]
}

export enum FurnState {
    NeedBuilding,
    Building,
    Suspend,
    Done,
}
export type FurnEntry = {
    id: FurnId
    createTime: number // ms, 0.001 sec
    state: FurnState
    position: THREE.Vector3
    rotation: THREE.Euler
}

export class FurnBox extends THREE.Mesh {
    constructor(public Id: number, public ObjName: string,
        geo: THREE.BoxGeometry, mat: THREE.MeshBasicMaterial, public ctrl: any
    ) {
        super(geo, mat)
        this.name = ObjName
    }
}