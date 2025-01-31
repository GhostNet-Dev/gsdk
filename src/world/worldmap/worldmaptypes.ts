import { Char } from "@Glibs/types/assettypes"
import { TreeParam } from "@Glibs/world/fluffytree/treemaker"
import { GrassParam } from "@Glibs/world/grassmin/grassmaker"

export type MapDefaultEntry = {
    type: Char
    pos: THREE.Vector3
    rotat: THREE.Euler
    scale: number
}

export type MapEntry = {
    type: MapEntryType
    data: MapDefaultEntry | GrassParam[] | TreeParam[]
}

export enum MapEntryType {
    Land = "land",
    Building = "build",
    Nature = "nature",
    Grass = "grass",
    Tree = "Tree",
}

export enum MapType {
    Custom,
    Free,
    Rect,
    Hex
}