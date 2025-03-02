import { Char } from "@Glibs/types/assettypes"

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
export interface NormalData {
    type: Char
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
    custom?: any
}

export type MapPackage = {
    key: string
    entries: MapEntry[]
    date: number
}

export type MapEntry = {
    type: MapEntryType
    data: MapDefaultEntry | GrassData[] | TreeData[] | CustomGroundData 
    | NormalData | NormalData[] | GroundData | GeometryGroundData | ProductGroundData
}

export enum MapEntryType {
    Nature = "nature",
    Grass = "grass",
    Tree = "Tree",
    CustomGround = "cg",
    GeometryGround = "gg",
    ProductGround = "pg",
    EventBoxModel = "ebm",
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