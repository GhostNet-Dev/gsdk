import { IAsset } from "@Glibs/interface/iasset";
import { EventBoxType } from "./eventboxtypes";
import { IBuildingObject } from "@Glibs/interface/iobject";
import { SimpleEvent } from "./simple";


export default class EventBoxManager {
    addEventBox(type: EventBoxType, asset: IAsset, mesh: THREE.Group) : IBuildingObject{
        let ret: IBuildingObject
        switch(type) {
            default:
            case EventBoxType.Physics: {
                ret = new SimpleEvent(asset, mesh)
                break;
            }
        }
        return ret
    }
}