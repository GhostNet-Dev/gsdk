import * as THREE from 'three'
import { Char } from "@Glibs/types/assettypes"
import { FluffyNature } from "./fluffynature"
import IEventController from '@Glibs/interface/ievent'
import { Loader } from '@Glibs/loader/loader'
import { IWorldMapObject, MapEntryType, NormalData } from '@Glibs/types/worldmaptypes'

export type FluffyParam = {
    type?: Char,
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: number,
}

export default class FluffyMaker implements IWorldMapObject {
    Type: MapEntryType = MapEntryType.FluffyMaker
    models: FluffyNature[] = []
    treeParam: FluffyParam[] = []
    constructor(
        private loader: Loader,
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
    ) {
    }
    async Create({
        type: model = Char.QuaterniusNatureTwistedtree1,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler(),
        scale = 1,
    }: FluffyParam = {}
    ) {
        this.treeParam.push({type: model, position, rotation, scale})
        const asset = this.loader.GetAssets(model)

        const tree = new FluffyNature(asset, this.eventCtrl)
        await tree.createTree(rotation, position, scale)
        tree.Meshs.userData.mapObj = this
        tree.Meshs.userData.params = [tree]
        this.models.push(tree)
        return tree.Meshs
    }
    Delete(obj: FluffyMaker, tree: FluffyNature) {
        this.models.splice(this.models.indexOf(tree), 1)
        this.scene.remove(tree.Meshs)
        tree.Dispose()
    }
    async LoadTree(trees: FluffyParam[], callback?: Function) {
        this.models.forEach((t) => {
            this.scene.remove(t.Meshs)
            t.Dispose()
        })

        trees.map(async (t) => {
            const mesh = await this.Create(t)
            this.scene.add(mesh)
            callback?.(mesh, this.Type)
        })
    }
    Save() {
        const treeData: NormalData[] = []
        this.treeParam.forEach((t) => {
            if (!t.position || !t.rotation || t.type == undefined || t.scale == undefined) throw new Error("undefined data");
            treeData.push({
                position: { x: t.position.x, y: t.position.y, z: t.position.z },
                rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z },
                scale: t.scale,
                type: t.type,
            })
        })
        return treeData
    }
    Load(treeData: NormalData[], callback?: Function): void {
        const treeParam: FluffyParam[] = []
        treeData.forEach((t) => {
            treeParam.push({
                position: new THREE.Vector3(t.position.x, t.position.y, t.position.z),
                rotation: new THREE.Euler(t.rotation.x, t.rotation.y, t.rotation.z),
                scale: t.scale,
                type: t.type,
            })
        })
        this.LoadTree(treeParam, callback)
    }
}