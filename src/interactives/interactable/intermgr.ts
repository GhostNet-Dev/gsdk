import * as THREE from "three";
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import { Char } from "@Glibs/types/assettypes";
import { EventBoxType } from "@Glibs/types/eventboxtypes";
import { InteractableObject } from "./interactable";
import { Loader } from "@Glibs/loader/loader";
import IEventController from "@Glibs/interface/ievent";
import { InteractiveType } from "./interactivetypes";

export default class InteractiveManager implements IWorldMapObject {
    get Type() { return MapEntryType.Interactive }
    constructor(
        private loader: Loader,
        private eventCtrl: IEventController
    ) { }
    async Create({
        type = Char.None,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler(),
        scale = 1,
        boxType = InteractiveType.None,
    }) {
        const asset = this.loader.GetAssets(type)
        const name = type.toString() + position.x + position.y + position.z
        const inter = new InteractableObject(name, asset, this.eventCtrl)
        await inter.Loader(position, name)
        return inter
    }
    
    Delete(...param: any) {
        
    }
}