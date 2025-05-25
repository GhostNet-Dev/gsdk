import * as THREE from 'three'
import { FluffyTree } from "./fluffytree"
import IEventController, { ILoop } from '@Glibs/interface/ievent'
import { EventTypes } from '@Glibs/types/globaltypes'
import { Loader } from '@Glibs/loader/loader'
import { IWorldMapObject } from '../worldmap/worldmaptypes'
import { MapEntryType, TreeData } from '@Glibs/types/worldmaptypes'


export enum FluffyTreeType {
    Default,
    Bigleaf,
    FallTree,
    Test,
    Test5,
    Test6,
    Test7,
    Sakura,
    White,
}
export type TreeParam = {
    type?: FluffyTreeType
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: number,
    color?: string
}

export class TreeMaker implements ILoop, IWorldMapObject {
    Type = MapEntryType.Tree
    LoopId = 0
    treeParam: TreeParam[] = []
    models: FluffyTree[] = []
    treeStyle = new Map<FluffyTreeType, string[]>()
    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private scene: THREE.Scene,
        private rootPath: string = "https://hons.ghostwebservice.com/"
    ) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        this.treeStyle.set(FluffyTreeType.Default, [this.rootPath + 'assets/texture/foliage_alpha3.png', "#3f6d21"])
        this.treeStyle.set(FluffyTreeType.Bigleaf, [this.rootPath + 'assets/texture/foliage_alpha3.png', "#b6652d"])
        this.treeStyle.set(FluffyTreeType.FallTree, [this.rootPath + 'assets/texture/foliage/flat/sprite_0045.png', "#bc8123"])
        this.treeStyle.set(FluffyTreeType.Test, [this.rootPath + 'assets/texture/foliage/flat/sprite_0041.png', "#bc8123"])
        this.treeStyle.set(FluffyTreeType.Test5, [this.rootPath + 'assets/texture/foliage/flat/sprite_0046.png', "#cbab37"])
        this.treeStyle.set(FluffyTreeType.Test6, [this.rootPath + 'assets/texture/foliage/flat/sprite_0047.png', "#c4672e"])
        this.treeStyle.set(FluffyTreeType.Test7, [this.rootPath + 'assets/texture/foliage/flat/sprite_0048.png', "#3f6d21"])
        this.treeStyle.set(FluffyTreeType.Sakura, [this.rootPath + 'assets/texture/foliage/flat/sprite_0049.png', "#ffc0cb"])
        this.treeStyle.set(FluffyTreeType.White, [this.rootPath + 'assets/texture/foliage/flat/sprite_0050.png', "#ffffff"])
    }
    async LoadTree(trees: TreeParam[], callback?: Function) {
        this.models.forEach((t) => {
            this.scene.remove(t.Meshs)
            t.Dispose()
        })

        trees.map(async (t) => {
            const tree = await this.Create(t)
            this.scene.add(tree)
            callback?.(tree, this.Type)
            // this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, map)
        })
    }
    GetTreeInfo(type: FluffyTreeType) {
        return this.treeStyle.get(type)!
    }
    Delete(obj: TreeMaker, tree: FluffyTree) {
        this.models.splice(this.models.indexOf(tree), 1)
        this.scene.remove(tree.Meshs)
        tree.Dispose()
    }
    async Create({
        type = FluffyTreeType.Default,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler(),
        scale = 2,
        color ='#3f6d21'
    }: TreeParam = {}
    ) {
        this.treeParam.push({type, position, rotation, scale, color})
        const treeInfo = this.treeStyle.get(type)!
        const leafPath = treeInfo[0]
        color = treeInfo[1]

        const tree = new FluffyTree(this.loader)
        await tree.createTree(rotation, position, scale, color, leafPath)
        tree.Meshs.userData.mapObj = this
        tree.Meshs.userData.params = [tree]
        this.models.push(tree)
        return tree.Meshs
    }
    update(delta: number): void {
        this.models.forEach((t) => {
            t.update(delta)
        })
    }
    Save() {
        const treeData: TreeData[] = []
        this.treeParam.forEach((t) => {
            if (!t.position || !t.rotation || t.type == undefined || t.scale == undefined || !t.color) throw new Error("undefined data");
            treeData.push({
                position: { x: t.position.x, y: t.position.y, z: t.position.z },
                rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z },
                scale: t.scale,
                color: t.color,
                type: t.type,
            })
        })
        return treeData
    }
    Load(treeData: TreeData[], callback?: Function): void {
        console.log("Load Tree")
        const treeParam: TreeParam[] = []
        treeData.forEach((t) => {
            treeParam.push({
                position: new THREE.Vector3(t.position.x, t.position.y, t.position.z),
                rotation: new THREE.Euler(t.rotation.x, t.rotation.y, t.rotation.z),
                scale: t.scale,
                type: t.type,
                color: t.color
            })
        })
        this.LoadTree(treeParam, callback)
    }
}