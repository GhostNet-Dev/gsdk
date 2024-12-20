import * as THREE from "three";
import { Char } from "@Glibs/types/assettypes"
import { MadeBy } from "@Glibs/types/furntypes"
import { MonDrop } from "@Glibs/types/monstertypes"

export enum PlantType {
    Tree,
    Vegetable,
    Fruit,
}

export enum PlantState {
    NeedSeed,
    Seeding,
    Enough,
    NeedWartering,
    Wartering,
    Death,
    Delete,
}

export type PlantProperty = {
    plantId: PlantId
    type: PlantType
    assetId: Char
    name: string
    namekr: string
    maxLevel: number
    levelUpTime: number
    warteringTime: number
    madeby?: MadeBy[]
    drop?: MonDrop[]
}

export class PlantId {
    public static AppleTree = "appletree"
    public static CoconutTree = "coconutree"
    public static Tomato = "tomato"
    public static Potato = "potato"
    public static Carrot = "carrot"
    public static List = [
        this.AppleTree, this.CoconutTree, this.Tomato, this.Potato,
        this.Carrot
    ]
}

export class PlantBox extends THREE.Mesh {
    constructor(public Id: number, public ObjName: string,
        geo: THREE.BoxGeometry, mat: THREE.MeshBasicMaterial, public ctrl: any
    ) {
        super(geo, mat)
        this.name = ObjName
    }
}