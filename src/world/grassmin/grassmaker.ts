import * as THREE from 'three'
import { Canvas, IViewer } from "@Commons/canvas"
import { ZeldaGrass} from "./zeldagrass"

export type GrassParam = {
    position?: THREE.Vector3,
    rotation?: THREE.Euler,
    scale?: number,
    color?: THREE.Color
}

export class GrassMaker implements IViewer {
    grassParam: GrassParam[] = []
    models: ZeldaGrass[] = []

    constructor(
        canvas: Canvas,
        private scene: THREE.Scene,
    ) {
        canvas.RegisterViewer(this)
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
        grass.mesh.position.copy(position)
        grass.mesh.rotation.copy(rotation)
        grass.mesh.scale.set(scale, scale, scale)

        this.models.push(grass)
        this.scene.add(grass.mesh)
        //await tree.createTree(rotation, position, scale, color, leafPath)
        //return tree
    }
    update(): void {
        this.models.forEach((m)=> {
            m.update()
        })
    }
}