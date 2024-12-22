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
    Test1,
    Test2,
    Test3,
    Test4,
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
    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private scene: THREE.Scene,
    ) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
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
    async Create({
        type = FluffyTreeType.Default,
        position = new THREE.Vector3(),
        rotation = new THREE.Euler(),
        scale = 2,
        color ='#3f6d21'
    }: TreeParam = {}
    ) {
        this.treeParam.push({type, position, rotation, scale, color})
        let leafPath = 'assets/texture/foliage_alpha3.png'
        switch(type) {
            case FluffyTreeType.Bigleaf: leafPath ='assets/texture/foliage_alpha3.png'
                color = "#b6652d"
                break
            case FluffyTreeType.FallTree: leafPath ='assets/texture/foliage/flat/sprite_0045.png'
                color = "#bc8123"
                break
            case FluffyTreeType.Test: leafPath ='assets/texture/foliage/flat/sprite_0041.png'
                color = "#bc8123"
                break
                /*
            case FluffyTreeType.Test1: leafPath ='assets/texture/foliage/flat/sprite_0042.png'
                break
            case FluffyTreeType.Test2: leafPath ='assets/texture/foliage/flat/sprite_0043.png'
                break
            case FluffyTreeType.Test3: leafPath ='assets/texture/foliage/flat/sprite_0044.png'
                break
            case FluffyTreeType.Test4: leafPath ='assets/texture/foliage/flat/sprite_0045.png'
                break
                */
            case FluffyTreeType.Test5: leafPath ='assets/texture/foliage/flat/sprite_0046.png'
                color = "#cbab37"
                break
            case FluffyTreeType.Test6: leafPath ='assets/texture/foliage/flat/sprite_0047.png'
                color = "#c4672e"
                break
            case FluffyTreeType.Test7: leafPath ='assets/texture/foliage/flat/sprite_0048.png'
                break
            case FluffyTreeType.Sakura: leafPath ='assets/texture/foliage/flat/sprite_0049.png'
                color = "#ffc0cb"
                break
            case FluffyTreeType.White: leafPath ='assets/texture/foliage/flat/sprite_0050.png'
                color = "#ffffff"
                break
        }
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