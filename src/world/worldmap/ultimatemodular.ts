import * as THREE from 'three'
import { Loader } from "@Glibs/loader/loader";
import { Char } from '@Glibs/types/assettypes';
import { IAsset } from '@Glibs/interface/iasset';

export enum ModularType {
    Dirty,
    Grass
}
type CubeEntry = {
    history: number
    type: Char
    modType: ModularType
    mesh: THREE.Group
}

export default class UltimateModular {
    assets = new Map<Char, IAsset>()
    platforms: { name: string, value: Char }[] = []
    map = new Map<string, CubeEntry>()
    lineCenter = [Char.UltimateModPlatform2DCubeDirt1x1Center,
        Char.UltimateModPlatform2DCubeGrass1x1Center]
    Center =  [Char.UltimateModPlatform3DCubeDirtCenterTall, 
        Char.UltimateModPlatformSingleHeightGrassCenter]
    topCorner =  [Char.UltimateModPlatform3DCubeDirtCornerTall,
        Char.UltimateModPlatform3DCubeGrassCornerTall]
    topSide =  [Char.UltimateModPlatform3DCubeDirtSideTall, 
        Char.UltimateModPlatform3DCubeGrassSideTall]
    side = [Char.UltimateModPlatform3DCubeGrassSideCenterTall, 
        Char.UltimateModPlatform3DCubeGrassSideCenterTall]
    lineEnd = [Char.UltimateModPlatform2DCubeDirt1x1End, 
        Char.UltimateModPlatform2DCubeGrass1x1End]
    single = [Char.UltimateModPlatformSingleCubeDirt,
        Char.UltimateModPlatformSingleCubeGrass]
    count = 0

    constructor(
        private loader: Loader,
        private scene:  THREE.Scene,
    ) {
        const platforms = Object.entries(Char)
            .filter(([key, value]) => isNaN(Number(key)) && key.startsWith("UltimateModPlatform"))
            .map(([key, value]) =>({name: key, value}) ); // 숫자 값만 추출

        // 필터링된 enum 값 순회
        platforms.forEach((entry) => {
            this.assets.set(entry.value as Char, this.loader.GetAssets(entry.value as Char))
            this.platforms.push({ name: entry.name, value: entry.value as Char })
        });

    }
    GetModularList() {
        const list: string[] = []
        this.platforms.forEach((entry) => {
            list.push(entry.name.slice("UltimateModPlatform".length))
        })
        return list
    }
    async Create(pos = new THREE.Vector3(), modType = ModularType.Dirty) {
        const size = 2
        const key = pos.x + "," + pos.y + "," + pos.z
        const old = this.map.get(key)
        if(old) this.scene.remove(old.mesh)
        const cub = await this.Build(pos, size, modType)
        cub.history = this.count++
        this.map.set(key, cub)

        this.map.forEach(async (v) => {
            const nCub = await this.Build(v.mesh.position, size, v.modType, v.mesh, v.type, v.history)
            v.mesh = nCub.mesh
            v.type = nCub.type
        })
        return cub.mesh
    }
    async Build(pos: THREE.Vector3, size: number, modType: ModularType, curMesh?: THREE.Group, curType?: Char, history?: number) {
        const key = pos.x + "," + pos.y + "," + pos.z
        const northKey = pos.x + "," + pos.y + "," + (pos.z + size)
        const southKey = pos.x + "," + pos.y + "," + (pos.z - size)
        const eastKey = (pos.x - size) + "," + pos.y + "," + pos.z
        const westKey = (pos.x + size) + "," + pos.y + "," + pos.z
        const topKey = pos.x + "," + (pos.y + size) + "," + pos.z
        console.log(`[${history}]t:${topKey}, s:${southKey}, n:${northKey}, e:${eastKey}, w:${westKey}`)
        const t = this.map.get(key)
        const northCub = this.map.get(northKey)
        const southCub = this.map.get(southKey)
        const eastCub = this.map.get(eastKey)
        const westCub = this.map.get(westKey)
        const topCub = this.map.get(topKey)
        console.log(`t:${topCub?.type}, s:${southCub?.type}, n:${northCub?.type}, e:${eastCub?.type}, w:${westCub?.type}`)
        const rot = new THREE.Euler()
        let id: Char = this.single[modType]
        // single일 경우
        if (!northCub && !southCub && !eastCub && !westCub) {
            id = this.single[modType]
        } else if (northCub && !southCub && !eastCub && !westCub) {
            id = this.lineEnd[modType]
            rot.y = -Math.PI / 2
        } else if (!northCub && southCub && !eastCub && !westCub) {
            id = this.lineEnd[modType]
            rot.y = Math.PI / 2
        } else if (!northCub && !southCub && eastCub && !westCub) {
            id = this.lineEnd[modType]
            rot.y = Math.PI
        } else if (!northCub && !southCub && !eastCub && westCub) {
            id = this.lineEnd[modType]
            // 두개 이상일 경우 -> line
        } else if (northCub && southCub && !eastCub && !westCub) {
            id = this.lineCenter[modType]
            rot.y = Math.PI / 2
        } else if (!northCub && !southCub && eastCub && westCub) {
            id = this.lineCenter[modType]
            // 두개 corner
        } else if (northCub && !southCub && eastCub && !westCub) {
            id = this.topCorner[modType]
            rot.y = -Math.PI
        } else if (northCub && !southCub && !eastCub && westCub) {
            id = this.topCorner[modType]
            rot.y = -Math.PI / 2
        } else if (!northCub && southCub && !eastCub && westCub) {
            id = this.topCorner[modType]
        } else if (!northCub && southCub && eastCub && !westCub) {
            id = this.topCorner[modType]
            rot.y = Math.PI / 2
            // 3개 이상일 경우 
        } else if (!northCub && southCub && eastCub && westCub) {
            id = this.topSide[modType]
        } else if (northCub && !southCub && eastCub && westCub) {
            id = this.topSide[modType]
            rot.y = Math.PI
        } else if (northCub && southCub && !eastCub && westCub) {
            id = this.topSide[modType]
            rot.y = -Math.PI / 2
        } else if (northCub && southCub && eastCub && !westCub) {
            id = this.topSide[modType]
            rot.y = Math.PI / 2
            // 4개 경우 
        } else if (northCub && southCub && eastCub && westCub) {
            id = this.Center[modType]
        }
        if (!curMesh || curType != id) {
            if (curType != id && curMesh) this.scene.remove(curMesh)
            const asset = this.loader.GetAssets(id)
            curMesh = await asset.CloneModel()
        }
        curMesh.position.copy(pos)
        curMesh.rotation.copy(rot)
        this.scene.add(curMesh)
        return { type: id, mesh: curMesh, history: 0, modType: modType}
    }
}
