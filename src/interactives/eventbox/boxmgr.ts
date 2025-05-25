import * as THREE from "three";
import { IAsset } from "@Glibs/interface/iasset";
import { EventBoxType } from "./eventboxtypes";
import { IBuildingObject } from "@Glibs/interface/iobject";
import { SimpleEvent } from "./simple";
import { EventBoxData, IWorldMapObject, MapEntryType, NormalData } from "@Glibs/types/worldmaptypes";
import { Char } from "@Glibs/types/assettypes";
import { Loader } from "@Glibs/loader/loader";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";

type EventBoxParam = {
    EvtType: EventBoxType,
    charType: Char,
    mesh: THREE.Group,
}
export class EventBox extends THREE.Mesh {
    constructor(public Id: number, public ObjName: string,
        geo: THREE.BoxGeometry, mat: THREE.MeshBasicMaterial
    ) {
        super(geo, mat)
        this.name = ObjName
    }
}

export default class EventBoxManager implements IWorldMapObject {
    Type: MapEntryType = MapEntryType.EventBoxModel
    data: EventBoxParam[] = []
    id = 0
    constructor(private loader: Loader, private eventCtrl:IEventController) { }
    async Create({
        type = Char.None,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler(),
        scale = 1,
        boxType = EventBoxType.None,
    }) {
        if (position.y < 0) position.y = 0
        const asset = this.loader.GetAssets(type)
        const [mesh, _] = await asset.UniqModel(type.toString() + position.x + position.y + position.z)

        this.addEventBox(boxType, asset, mesh)

        let meshs: THREE.Group
        if(mesh instanceof THREE.Group) {
            meshs = mesh
        } else {
            meshs = new THREE.Group()
            meshs.add(mesh)
        }
        meshs.userData.mapObj = this
        meshs.position.copy(position)
        return meshs
    }
    Delete(obj: THREE.Group) {
        this.removeEventBox(obj)
        return obj
    }
    Save() {
        const saveData: NormalData[] = []
        this.data.forEach((v) => {
            const r = v.mesh.rotation
            saveData.push({
                type: v.charType,
                position: { ...v.mesh.position },
                rotation: { x: r.x, y: r.y, z: r.z },
                scale: v.mesh.scale.x,
                custom: v.EvtType
            })
        })
        return saveData
    }
    async Load(v: NormalData) {
        const asset = this.loader.GetAssets(v.type)
        const pos = v.position
        const [mesh, _] = await asset.UniqModel(v.type.toString() + pos.x + pos.y + pos.z)
        this.addEventBox(v.custom, asset, mesh)
    }
    Loads(loadData: NormalData[]) {
        loadData.forEach(async (v) => {
            const asset = this.loader.GetAssets(v.type)
            const pos = v.position
            const [mesh, _] = await asset.UniqModel(v.type.toString() + pos.x + pos.y + pos.z)
            this.addEventBox(v.custom, asset, mesh)
        })
    }
    addEventBox(type: EventBoxType, asset: IAsset, mesh: THREE.Group) {
        switch(type) {
            default:
            case EventBoxType.Physics: {
                const ret = new SimpleEvent(asset, mesh, this.id)
                this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, ret.Meshs)
                break;
            }
        }
        this.id++
        this.data.push({ EvtType: type, charType: asset.Id, mesh })
    }
    removeEventBox(obj: THREE.Group) {
        this.data.splice(this.data.findIndex(d => d.mesh.uuid == obj.uuid), 1)
    }
}