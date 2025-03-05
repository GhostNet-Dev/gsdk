import * as THREE from 'three'
import { ZeldaGrass} from "./zeldagrass"
import IEventController, { ILoop } from '@Glibs/interface/ievent'
import { EventTypes } from '@Glibs/types/globaltypes'
import { IWorldMapObject } from '../worldmap/worldmaptypes'
import { GrassData, MapEntryType } from '@Glibs/types/worldmaptypes'

export type GrassParam = {
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: number,
    color?: THREE.Color
}

export class GrassMaker implements ILoop, IWorldMapObject {
    Type = MapEntryType.Grass
    LoopId = 0
    grassParam: GrassParam[] = []
    models: ZeldaGrass[] = []

    constructor(
        private scene: THREE.Scene,
        eventCtrl: IEventController,
    ) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }
    LoadGrass(params: GrassParam[]) {
        this.models.forEach((g) => {
            this.scene.remove(g.mesh)
            g.Dispose()
        })
        params.forEach((g)=> {
            this.Create(g)
        })
    }
    Delete(obj: ZeldaGrass) {
        this.models.splice(this.models.indexOf(obj), 1)
        this.scene.remove(obj.mesh)
        obj.Dispose()
    }
    Create({
            position = new THREE.Vector3(),
            rotation = new THREE.Euler(),
            scale = 1,
            //color: string = '#577f4d'
            //color: string = '#a5e272'
            //color: string = '#9fda6f'
            color = new THREE.Color('#8fc464')
        }: GrassParam = {}) 
    {
        this.grassParam.push({ position, rotation, scale, color })

        const grass = new ZeldaGrass(color)
        grass.mesh.userData.mapObj = this
        grass.mesh.userData.params = [grass]
        grass.mesh.position.copy(position)
        grass.mesh.rotation.copy(rotation)
        grass.mesh.scale.set(scale, scale, scale)

        this.models.push(grass)
        this.scene.add(grass.mesh)
        return grass.mesh
    }
    update(): void {
        this.models.forEach((m)=> {
            m.update()
        })
    }
    Save() {
        const grassData: GrassData[] = []
        this.grassParam.forEach((t) => {
            if (!t.position || !t.rotation || t.scale == undefined || !t.color) throw new Error("undefined data");
            grassData.push({
                position: { x: t.position.x, y: t.position.y, z: t.position.z },
                rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z },
                scale: t.scale,
                color: t.color.getHex(),
            })
        })
        return grassData
    }
    Load(grassData: GrassData[]): void {
        const grassParam: GrassParam[] = []
        grassData.forEach((t) => {
            grassParam.push({
                position: new THREE.Vector3(t.position.x, t.position.y, t.position.z),
                rotation: new THREE.Euler(t.rotation.x, t.rotation.y, t.rotation.z),
                scale: t.scale,
                color: new THREE.Color(t.color)
            })
        })
        this.LoadGrass(grassParam)
    }
}