import * as THREE from 'three'
import { Loader } from "@Glibs/loader/loader";
import { Ocean } from "../ocean/ocean";
import IEventController from "@Glibs/interface/ievent";
import { Wind } from "../wind/wind";
import { GrassMaker, GrassParam } from "../grassmin/grassmaker";
import { FluffyTreeType, TreeMaker, TreeParam } from "../fluffytree/treemaker";
import { SkyBoxAllTime } from "../sky/skyboxalltime";
import { FluffyTree } from "../fluffytree/fluffytree";
import { ZeldaGrass } from "../grassmin/zeldagrass";
import { GrassData, GroundData, MapEntry, MapEntryType, MapType, TreeData } from "./worldmaptypes";
import CustomGround from "../ground/customground";
import Ground from "../ground/ground";
import UltimateModular from "./ultimatemodular";
import { downDataTextureAndGeometry, loadDataTextureAndGeometry, saveDataTextureAndGeometry } from "./mapstore";
import { SimpleWater } from '../ocean/simplewater';


export default class WorldMap {
    tree = new TreeMaker(this.loader, this.eventCtrl, this.scene)
    grass = new GrassMaker(this.scene, this.eventCtrl)
    modular = new UltimateModular(this.loader)
    customGround?: CustomGround
    ground?: Ground
    gridLine? :THREE.LineSegments

    constructor(
        private loader: Loader,
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
        private setNonGlow: Function,
    ) {

    }
    MakeGround({
        mapType = MapType.Free, grid = false, gridSize = 10,
        width = 1024 * 3, height = 1024 * 3, size = 256,
    } ={}) {
        const map: THREE.Object3D[] = []
        switch(mapType) {
            case MapType.Custom: {
                const obj = new CustomGround(this.setNonGlow, { width: width, height: height, planeSize: size })
                map.push(obj.obj)
                this.customGround = obj
                break
            }
            case MapType.Free: {
                const obj = new Ground(this.setNonGlow, { width: width, height: height, planeSize: size })
                map.push(obj.obj)
                this.ground = obj
                break
            }
            case MapType.Rect:
                if (grid){
                    this.gridLine = createGrid(gridSize, width)
                    map.push(this.gridLine)
                } 
                break
            case MapType.Hex:
                if (grid) {
                    this.gridLine = createOptimizedHexGrid(width, height, gridSize)
                    map.push(this.gridLine)
                }
                break
        }
        this.scene.add(...map)
        return map
    }
    MakeSky(light: THREE.DirectionalLight) {
        return new SkyBoxAllTime(light)
    }
    MakeOcean() {
        return new Ocean(this.eventCtrl)
    }
    MakeMirrorWater() {
        return new SimpleWater(this.scene, this.setNonGlow)
    }
    MakeWind() {
        return new Wind(this.eventCtrl)
    }
    MakeGrass(param: GrassParam) {
        return this.grass.Create(param)
    }
    MakeTree(param: TreeParam) {
        return this.tree.Create(param)
    }
    GetTreeInfo(type: FluffyTreeType) {
        return this.tree.GetTreeInfo(type)
    }
    DelGrass(obj: ZeldaGrass) {
        this.grass.Delete(obj)
    }
    DelTree(obj:FluffyTree) {
        this.tree.Delete(obj)
    }
    async onLoad() {
        const mapData = await loadDataTextureAndGeometry()
        if (!mapData) return
        mapData.forEach(entry => {
            switch(entry.type) {
                case MapEntryType.CustomGround: {
                    const data = entry.data as GroundData
                    const textureData = new Uint8Array(data.textureData);
                    const texture = new THREE.DataTexture(textureData, data.textureWidth, data.textureHeight, THREE.RGBAFormat);
                    texture.needsUpdate = true;

                    // Restore PlaneGeometry
                    const geometry = new THREE.PlaneGeometry(128, 128, 128, 128);
                    const vertices = geometry.attributes.position.array as Float32Array;

                    for (let i = 0; i < vertices.length; i++) {
                        vertices[i] = data.verticesData[i];
                    }
                    geometry.attributes.position.needsUpdate = true;
                    if (this.customGround) this.scene.remove(this.customGround.obj)
                    this.customGround = new CustomGround(this.setNonGlow, { 
                        width: data.textureWidth, 
                        height: data.textureHeight, 
                        planeSize: data.mapSize, 
                    })
                    this.customGround.LoadMap(texture, geometry)
                    this.scene.add(this.customGround.obj)
                    break;
                }
                case MapEntryType.Tree: {
                    const treeParam: TreeParam[] = []
                    const treeData = entry.data as TreeData[]
                    treeData.forEach((t) => {
                        treeParam.push({
                            position: new THREE.Vector3(t.position.x, t.position.y, t.position.z),
                            rotation: new THREE.Euler(t.rotation.x, t.rotation.y, t.rotation.z),
                            scale: t.scale,
                            type: t.type,
                            color: t.color
                        })
                    })
                    this.tree.LoadTree(treeParam)
                    break;
                }
                case MapEntryType.Grass: {
                    const grassParam: GrassParam[] = []
                    const grassData = entry.data as GrassData[]
                    grassData.forEach((t) => {
                        grassParam.push({
                            position: new THREE.Vector3(t.position.x, t.position.y, t.position.z),
                            rotation: new THREE.Euler(t.rotation.x, t.rotation.y, t.rotation.z),
                            scale: t.scale,
                            color: new THREE.Color(t.color)
                        })
                    })
                    this.grass.LoadGrass(grassParam)
                    break;
                }
            }
            
        });
    }
    makeMapEntries() {
        const mapData: MapEntry[] = []
        const trees = this.tree.treeParam
        const grasses = this.grass.grassParam
        const treeData: TreeData[] = []
        trees.forEach((t) => {
            if (!t.position || !t.rotation || t.type == undefined || t.scale == undefined || !t.color) throw new Error("undefined data");
            treeData.push({
                position: { x: t.position.x, y: t.position.y, z: t.position.z },
                rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z },
                scale: t.scale,
                color: t.color,
                type: t.type,
            })
        })
        if (treeData.length > 0) mapData.push({ type: MapEntryType.Tree, data: treeData })

        const grassData: GrassData[] = []
        grasses.forEach((t) => {
            if (!t.position || !t.rotation || t.scale == undefined || !t.color) throw new Error("undefined data");
            grassData.push({
                position: { x: t.position.x, y: t.position.y, z: t.position.z },
                rotation: { x: t.rotation.x, y: t.rotation.y, z: t.rotation.z },
                scale: t.scale,
                color: t.color.getHex(),
            })
        })
        if (grassData.length > 0) mapData.push({ type: MapEntryType.Grass, data: grassData })

        if (this.customGround) {
            const geometry = this.customGround.geometry
            const map = this.customGround.blendMap
            const textureData = Array.from(new Uint8Array(map.image.data.buffer)); // Uint8Array to number array
            const verticesData = Array.from(geometry.attributes.position.array); // Vertex data
            const gData: GroundData = {
                textureData: textureData,
                textureWidth: map.image.width,
                textureHeight: map.image.height,
                verticesData: verticesData,
                mapSize: this.customGround.planSize,
            }
            mapData.push({ type: MapEntryType.CustomGround, data: gData })
        }
        return mapData
    }
    onSave() {
        saveDataTextureAndGeometry(this.makeMapEntries())
    }
    onDown() {
        downDataTextureAndGeometry(this.makeMapEntries())
    }
}