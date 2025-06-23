import * as THREE from "three";
import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import { Char } from "@Glibs/types/assettypes";
import { InteractableObject } from "./interactable";
import { Loader } from "@Glibs/loader/loader";
import IEventController from "@Glibs/interface/ievent";
import { ComponentRecord, interactableDefs } from "@Glibs/types/interactivetypes";
import { CooldownComponent, DurabilityComponent, IInteractiveComponent, RewardComponent, TrapComponent } from "./intcomponent";

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
        boxType = "none",
    }) {
        const asset = this.loader.GetAssets(type)
        const name = type.toString() + position.x + position.y + position.z
        const inter = new InteractableObject(name, asset, this.eventCtrl)
        this.applyComponents(inter, interactableDefs[boxType])
        await inter.Loader(position, name)
        return inter
    }
    
    Delete(...param: any) {
        
    }
    applyComponents(obj: InteractableObject, defs: ComponentRecord) {
        Object.entries(defs).forEach(([name, def]) => {
            let component: IInteractiveComponent | undefined;

            switch (def.type) {
                case "cooldown":
                    component = new CooldownComponent(def.cooldownTime);
                    break;
                case "durability":
                    component = new DurabilityComponent(def.durability);
                    break;
                case "trap":
                    component = new TrapComponent(def.damage);
                    break;
                case "reward":
                    component = new RewardComponent(def.reward);
                    break;
                default:
                    console.warn(`⚠️ 알 수 없는 컴포넌트 타입: ${def.type}`);
            }

            if (component) {
                obj.addComponent(component);
            }
        });
    }
}