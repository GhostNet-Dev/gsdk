import { Char } from "@Glibs/types/assettypes"

export type MapDefaultEntry = {
    type: number
    position: { x: number, y: number, z: number }
    rotation: { x: number, y: number, z: number }
    scale: number
}
export interface GroundData {
    textureData: number[];
    textureWidth: number;
    textureHeight: number;
    verticesData: number[];
    mapSize: number;
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
}

export type MapPackage = {
    key: string
    entries: MapEntry[]
    date: number
}

export type MapEntry = {
    type: MapEntryType
    data: MapDefaultEntry | GrassData[] | TreeData[] | GroundData | NormalData
}

export enum MapEntryType {
    Land = "land",
    Building = "build",
    Nature = "nature",
    Grass = "grass",
    Tree = "Tree",
    CustomGround = "cg"
}

export enum MapType {
    Custom,
    Free,
    Rect,
    RectMesh,
    Hex,
    HexMesh,
}