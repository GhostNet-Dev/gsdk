import * as THREE from 'three'
import { Loader } from '@Glibs/loader/loader';
import { Char } from '@Glibs/types/assettypes';
import { NormalData } from './worldmaptypes';
import { IWorldMapObject, MapEntryType } from '@Glibs/types/worldmaptypes';
import IEventController from '@Glibs/interface/ievent';
import { EventTypes } from '@Glibs/types/globaltypes';

type FenceEntry = {
    type: Char
    mesh: THREE.Group
}

export default class FenceModular implements IWorldMapObject {
    Type: MapEntryType = MapEntryType.FenceModular
    fence1 = Char.UltimateLvAndMaFence1
    middle = Char.UltimateLvAndMaFenceMiddle
    corner = Char.UltimateLvAndMaFenceCorner
    map = new Map<string, FenceEntry>()

    constructor(
        private loader: Loader,
        private scene:  THREE.Scene,
        private eventCtrl: IEventController,
    ) {
    }
    async Create(pos = new THREE.Vector3()): Promise<[THREE.Group, Char]> {
        if (pos.y < 0) pos.y = 0
        const size = 2
        const key = pos.x + "," + pos.y + "," + pos.z
        const old = this.map.get(key)
        if(old) this.scene.remove(old.mesh)

        const cub = await this.Build(pos, size)
        this.map.set(key, cub)

        this.map.forEach(async (v) => {
            const nCub = await this.Build(v.mesh.position, size, v.mesh, v.type)
            v.mesh = nCub.mesh
            v.type = nCub.type
        })

        this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, cub.mesh)
        cub.mesh.userData.mapObj = this
        return [cub.mesh, cub.type]
    }
    async Delete(mesh: THREE.Group) {
        const pos = mesh.position
        const size = 2
        const key = `${pos.x},${pos.y},${pos.z}`;
        const old = this.map.get(key)
        if(!old) throw new Error("there is no fence");
        this.map.delete(key)
        this.scene.remove(old.mesh)

        this.map.forEach(async (v) => {
            const nCub = await this.Build(v.mesh.position, size, v.mesh, v.type)
            v.mesh = nCub.mesh
            v.type = nCub.type
        })
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterPhysic, old.mesh)
    }
    Load(data: NormalData[]): void {
        const p = new THREE.Vector3()
        data.forEach((v) => {
            p.set(v.position.x, v.position.y, v.position.z)
            this.Create(p)
        })
    }
    Save() {
        const data: NormalData[] = []
        this.map.forEach((v) => {
            data.push({
                type: v.type, 
                position: v.mesh.position, 
                rotation: v.mesh.rotation, 
                scale: v.mesh.scale.x,
            })
        })
        return data
    }
    async Build(pos: THREE.Vector3, size: number, curMesh?: THREE.Group, curType?: Char) {
        const key = pos.x + "," + pos.y + "," + pos.z
        const northKey = pos.x + "," + pos.y + "," + (pos.z + size)
        const southKey = pos.x + "," + pos.y + "," + (pos.z - size)
        const eastKey = (pos.x - size) + "," + pos.y + "," + pos.z
        const westKey = (pos.x + size) + "," + pos.y + "," + pos.z
        const topKey = pos.x + "," + (pos.y + size) + "," + pos.z
        console.log(`t:${topKey}, s:${southKey}, n:${northKey}, e:${eastKey}, w:${westKey}`)
        const t = this.map.get(key)
        const northCub = this.map.get(northKey)
        const southCub = this.map.get(southKey)
        const eastCub = this.map.get(eastKey)
        const westCub = this.map.get(westKey)
        const topCub = this.map.get(topKey)
        console.log(`t:${topCub?.type}, s:${southCub?.type}, n:${northCub?.type}, e:${eastCub?.type}, w:${westCub?.type}`)
        const rot = new THREE.Euler()
        const childPos = new THREE.Vector3()
        let id: Char = this.fence1
        // single일 경우
        if (!northCub && !southCub && !eastCub && !westCub) {
            id = this.fence1
        } else if (northCub && !southCub && !eastCub && !westCub) {
            id = this.fence1
            childPos.z += size / 2
            rot.y = -Math.PI / 2
        } else if (!northCub && southCub && !eastCub && !westCub) {
            childPos.z -= size / 2
            id = this.fence1
            rot.y = Math.PI / 2
        } else if (!northCub && !southCub && eastCub && !westCub) {
            childPos.x -= size / 2
            id = this.fence1
            rot.y = Math.PI
        } else if (!northCub && !southCub && !eastCub && westCub) {
            childPos.x += size / 2
            id = this.fence1
            // 두개 이상일 경우 -> line
        } else if (northCub && southCub && !eastCub && !westCub) {
            id = this.middle
            rot.y = Math.PI / 2
        } else if (!northCub && !southCub && eastCub && westCub) {
            id = this.middle
            // 두개 corner
        } else if (northCub && !southCub && eastCub && !westCub) {
            childPos.x -= size / 4
            childPos.z += size / 4
            id = this.corner
            rot.y = -Math.PI
        } else if (northCub && !southCub && !eastCub && westCub) {
            childPos.x += size / 4
            childPos.z += size / 4
            id = this.corner
            rot.y = -Math.PI / 2
        } else if (!northCub && southCub && !eastCub && westCub) {
            childPos.x += size / 4
            childPos.z -= size / 4
            id = this.corner
        } else if (!northCub && southCub && eastCub && !westCub) {
            childPos.x -= size / 4
            childPos.z -= size / 4
            id = this.corner
            rot.y = Math.PI / 2
        } 
        if (!curMesh || curType != id) {
            if (curType != id && curMesh) this.scene.remove(curMesh)
            const asset = this.loader.GetAssets(id)
            const mesh = await asset.CloneModel()
            mesh.rotation.copy(rot)
            mesh.position.copy(childPos)
            curMesh = new THREE.Group()
            curMesh.add(mesh)
        } else {
            curMesh.children[0].rotation.copy(rot)
            curMesh.children[0].position.copy(childPos)
        }
        curMesh.position.copy(pos)
        this.scene.add(curMesh)
        return { type: id, mesh: curMesh}
    }
}