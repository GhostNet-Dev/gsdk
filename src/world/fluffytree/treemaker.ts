import * as THREE from 'three'
import { FluffyTree } from "./fluffytree"
import IEventController, { ILoop } from '@Glibs/interface/ievent'
import { EventTypes } from '@Glibs/types/globaltypes'
import { Loader } from '@Glibs/loader/loader'


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

export class TreeMaker implements ILoop {
    treeParam: TreeParam[] = []
    models: FluffyTree[] = []
    treeStyle = new Map<FluffyTreeType, string[]>()
    constructor(
        private loader: Loader,
        eventCtrl: IEventController,
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
    async LoadTree(trees: TreeParam[]) {
        this.models.forEach((t) => {
            this.scene.remove(t.Meshs)
            t.Dispose()
        })

        trees.map(async (t) => {
            const model = await this.Create(t)
            this.models.push(model)
            this.scene.add(model.Meshs)
        })
    }
    GetTreeInfo(type: FluffyTreeType) {
        return this.treeStyle.get(type)!
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
        this.models.push(tree)
        this.scene.add(tree.Meshs)
        return tree
    }
    update(delta: number): void {
        this.models.forEach((t) => {
            t.update(delta)
        })
    }
}