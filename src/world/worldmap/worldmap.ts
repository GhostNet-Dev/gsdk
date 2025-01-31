import { Loader } from "@Glibs/loader/loader";
import { Ocean } from "../ocean/ocean";
import IEventController from "@Glibs/interface/ievent";
import { Wind } from "../wind/wind";
import { Color } from "three";
import { GrassMaker, GrassParam } from "../grassmin/grassmaker";
import { TreeMaker, TreeParam } from "../fluffytree/treemaker";
import { SkyBoxAllTime } from "../sky/skyboxalltime";
import { FluffyTree } from "../fluffytree/fluffytree";
import { ZeldaGrass } from "../grassmin/zeldagrass";
import { MapType } from "./worldmaptypes";
import CustomGround from "../ground/customground";
import Ground from "../ground/ground";


export default class WorldMap {
    tree = new TreeMaker(this.loader, this.eventCtrl, this.scene)
    grass = new GrassMaker(this.scene, this.eventCtrl)

    constructor(
        private loader: Loader,
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
    ) {

    }
    makeGround({
        mapType = MapType.Free, grid = false, gridSize = 10,
        width = 1024 * 3, height = 1024 * 3, size = 256,
        setNonGlow = () => {}
    } ={}) {
        const map: THREE.Object3D[] = []
        switch(mapType) {
            case MapType.Custom: {
                const obj = new CustomGround({ width: width, height: height, planeSize: size, setNonGlow: setNonGlow })
                map.push(obj.obj)
                break
            }
            case MapType.Free: {
                const obj = new Ground({ width: width, height: height, planeSize: size, setNonGlow: setNonGlow })
                map.push(obj.obj)
                break
            }
            case MapType.Rect:
                if (grid) map.push(createGrid(gridSize, width))
                break
            case MapType.Hex:
                if (grid) map.push(createOptimizedHexGrid(width, height, gridSize))
                break
        }
        return map
    }
    makeSky(light: THREE.DirectionalLight) {
        return new SkyBoxAllTime(light)
    }
    makeOcean() {
        return new Ocean(this.eventCtrl)
    }
    makeWind() {
        return new Wind(this.eventCtrl)
    }
    makeGrass(param: GrassParam) {
        return this.grass.Create(param)
    }
    makeTree(param: TreeParam) {
        return this.tree.Create(param)
    }
    delGrass(obj: ZeldaGrass) {
        this.grass.Delete(obj)
    }
    delTree(obj:FluffyTree) {
        this.tree.Delete(obj)
    }
}