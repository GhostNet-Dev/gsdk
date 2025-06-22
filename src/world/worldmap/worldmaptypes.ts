import { Char } from "@Glibs/types/assettypes"

export type MapPackage = {
    key: string
    entries: MapEntry[]
    date: number
}

export type MapSaveDataType = MapDefaultEntry | GrassData[] | TreeData[] | CustomGroundData 
    | NormalData | NormalData[] | GroundData | GeometryGroundData | ProductGroundData | OceanData

export type MapEntry = {
    type: MapEntryType
    data: MapSaveDataType
}

export enum MapEntryType {
    Nature = "nature",
    Grass = "GrassMaker",
    Tree = "TreeMaker",
    Ocean = "Ocean",
    SimpleWater = "SimpleWater",
    Ground = "Ground",
    CustomGround = "CustomGround",
    GeometryGround = "GeometryGround",
    ProductGround = "ProduceTerrain3",
    EventBoxModel = "EventBoxManager",
    UltimateModular = "UltimateModular",
    FenceModular = "FenceModular",
    FluffyMaker = "FluffyMaker",
    Interactive = "Interactive",
}

export enum MapType {
    Custom,
    Produce,
    Geometry,
    Free,
    Rect,
    RectMesh,
    Hex,
    HexMesh,
}

export type MapDefaultEntry = {
    type: number
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
}
export interface CustomGroundData {
    textureData: number[];
    textureWidth: number;
    textureHeight: number;
    verticesData: number[];
    mapSize: number;
    scale: number;
}
export interface GroundData {
    type: Char
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
}
export interface GeometryGroundData {
    data: { type: string, value: any }
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: { x: number, y: number, z: number }
    color: number
}
export interface ProductGroundData {
    data: any
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: { x: number, y: number, z: number }
}
export interface TreeData {
    type: number
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
    color: string
}
export interface GrassData {
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
    color: number
}
export interface OceanData {
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
}
export interface EventBoxData {
    type: Char
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
    boxType: number
}
export interface ModularData {
    position: { x: number, y: number, z: number }
    modType?: number
}
export interface NormalData {
    type: Char
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
    custom?: any
}

export interface IWorldMapObject {
    Type: MapEntryType
    Mesh?: THREE.Object3D
    Create(...param: any): Promise<any> | any
    CreateDone?(): Promise<any> | any
    Delete(...param: any): any
    Show?():void
    Hide?(): void
    Save?(): any
    Load?(data: any, callback?: Function): void
}

