import { IAsset } from "@Glibs/interface/iasset";
import { EventBoxType } from "./eventboxtypes";
import { IBuildingObject } from "@Glibs/interface/iobject";
import { SimpleEvent } from "./simple";
import { NormalData } from "@Glibs/types/worldmaptypes";
import { Char } from "@Glibs/types/assettypes";
import { Loader } from "@Glibs/loader/loader";

type EventBoxData = {
    EvtType: EventBoxType,
    charType: Char,
    mesh: THREE.Group,
}

export default class EventBoxManager {
    data: EventBoxData[] = []
    constructor(private loader: Loader) { }
    Save() {
        const saveData: NormalData[] = []
        this.data.forEach((v) => {
            saveData.push({
                type: v.charType,
                position: v.mesh.position,
                rotation: v.mesh.rotation,
                scale: v.mesh.scale.x,
                custom: v.EvtType
            })
        })
        return saveData
    }
    Load(loadData: NormalData[]) {
        loadData.forEach(async (v) => {
            const asset = this.loader.GetAssets(v.type)
            const pos = v.position
            const [mesh, _] = await asset.UniqModel(v.type.toString() + pos.x + pos.y + pos.z)
            this.addEventBox(v.custom, asset, mesh)
        })
    }
    addEventBox(type: EventBoxType, asset: IAsset, mesh: THREE.Group): IBuildingObject | undefined {
        let ret: IBuildingObject
        switch(type) {
            default:
            case EventBoxType.Physics: {
                ret = new SimpleEvent(asset, mesh)
                break;
            }
        }
        this.data.push({ EvtType: type, charType: asset.Id, mesh })
        return ret
    }
    removeEventBox(obj: THREE.Group) {
        this.data.splice(this.data.findIndex(d => d.mesh.uuid == obj.uuid), 1)
    }
}