import * as THREE from 'three'
import { Loader } from "@Glibs/loader/loader";
import { Ocean } from "../ocean/ocean";
import IEventController from "@Glibs/interface/ievent";
import { Wind } from "../wind/wind";
import { GrassMaker } from "../grassmin/grassmaker";
import { FluffyTreeType, TreeMaker } from "../fluffytree/treemaker";
import { SkyBoxAllTime } from "../sky/skyboxalltime";
import { GroundData, MapEntry, MapEntryType, MapPackage, MapType, NormalData, IWorldMapObject } from "./worldmaptypes";
import CustomGround from "../ground/customground";
import Ground from "../ground/ground";
import UltimateModular from "./ultimatemodular";
import { downDataTextureAndGeometry, initDB, loadDataTextureAndGeometry, saveDataTextureAndGeometry } from "./mapstore";
import { SimpleWater } from '../ocean/simplewater';
import Grid from './grid';
import EventBoxManager from '@Glibs/interactives/eventbox/boxmgr';
import { EventTypes } from '@Glibs/types/globaltypes';
import ProduceTerrain3 from '../ground/prodterrain3';
import FenceModular from './fencemodular';
import GeometryGround from '../ground/defaultgeo';
import FluffyMaker from '../fluffynature/fluffymaker';
import InteractiveManager from '@Glibs/interactives/interactable/intermgr';
import { RainStorm } from '../rain/rainstorm';
import { WaterFoamRipples } from '../ocean/wavefoam';
import { WindyInstancedVegetation } from '../fluffynature/massfluffy';
import { InstancedVegetation } from '../fluffynature/massstatic';
import { Beach } from '../ocean/beach';
import { DungeonMapObject } from '../dungeon/dungeonbuilder';


export default class WorldMap {
    normalModel: NormalData[] = []
    groundData?: GroundData
    customGround?: CustomGround
    ground?: Ground
    productGround?: ProduceTerrain3
    geometryGround?: GeometryGround
    gridLine? :THREE.LineSegments
    gridMesh? :THREE.Group
    grid = new Grid()
    mapObj = new Map<MapEntryType, IWorldMapObject>()
    private classMap: Record<string, new (...args: any[]) => any> = {
        CustomGround: CustomGround,
        GeometryGround: GeometryGround,
        ProduceTerrain3: ProduceTerrain3,
        Ground: Ground,
        GrassMaker: GrassMaker,
        TreeMaker: TreeMaker,
        Ocean: Ocean,
        SimpleWater: SimpleWater,
        UltimateModular: UltimateModular,
        FenceModular: FenceModular,
        EventBoxManager: EventBoxManager,
        FluffyMaker: FluffyMaker,
        InteractiveManager: InteractiveManager,
        RainStorm: RainStorm,
        WaterFoamRipples: WaterFoamRipples,
        InstancedVegetation: InstancedVegetation,
        WindyInstancedVegetation: WindyInstancedVegetation,
        Beach: Beach,
        DungeonMapObject: DungeonMapObject,
    };
    private worldMapTypes: Record<string, any> = {
        CustomGround: { scene: this.scene, eventCtrl: this.eventCtrl },
        GeometryGround: { scene: this.scene, eventCtrl: this.eventCtrl },
        ProduceTerrain3: { scene: this.scene, eventCtrl: this.eventCtrl  },
        Ground: { width: 1024 * 3, height: 1024 * 3, planeSize: 256 },
        GrassMaker: { scene: this.scene, eventCtrl: this.eventCtrl },
        TreeMaker: { loader: this.loader, eventCtrl: this.eventCtrl, scene: this.scene },
        Ocean: { eventCtrl: this.eventCtrl, light: this.light },
        SimpleWater: { scene: this.scene },
        UltimateModular: { loader: this.loader, scene: this.scene, eventCtrl: this.eventCtrl },
        FenceModular: { loader: this.loader, scene: this.scene, eventCtrl: this.eventCtrl },
        EventBoxManager: { loader: this.loader, eventCtrl: this.eventCtrl },
        FluffyMaker: { loader: this.loader, scene: this.scene, eventCtrl: this.eventCtrl  },
        InteractiveManager: { loader: this.loader, eventCtrl: this.eventCtrl },
        RainStorm: { scene: this.scene, camera: this.camera, eventCtrl: this.eventCtrl },
        WaterFoamRipples: { scene: this.scene, camera: this.camera, renderer: this.renderer },
        InstancedVegetation: { loader: this.loader, scene: this.scene, eventCtrl: this.eventCtrl, camera: this.camera },
        WindyInstancedVegetation: { loader: this.loader, scene: this.scene, eventCtrl: this.eventCtrl, camera: this.camera },
        Beach: { scene: this.scene, eventCtrl: this.eventCtrl },
        DungeonMapObject: {  },
    }

    constructor(
        private loader: Loader,
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
        private light: THREE.DirectionalLight,
        private camera: THREE.Camera,
        private renderer: THREE.WebGLRenderer,
    ) {
       initDB() 
    }
    GetMapObject(mapType = MapEntryType.CustomGround) {
        let obj = this.mapObj.get(mapType)
        if (!obj) {
            const params = this.worldMapTypes[mapType]
            obj = new this.classMap[mapType](...Object.values(params))
            if (!obj) throw new Error("there is not types = " + mapType);
            this.mapObj.set(mapType, obj)
        }
        return obj
    }
    async MakeMapObject(mapType = MapEntryType.CustomGround, ...param: any[]) {
        const obj = this.GetMapObject(mapType)
        if (obj.Mesh) this.scene.remove(obj.Mesh)
        const map = await obj.Create(...param)

        if(!map) throw new Error("not defined");

        // if(mapType != MapEntryType.Tree && 
        //     mapType != MapEntryType.Ocean &&
        //     mapType != MapEntryType.Interactive)
        //     this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, map)

        // if(mapType == MapEntryType.FluffyMaker || 
        //     mapType == MapEntryType.EventBoxModel ||
        //     mapType == MapEntryType.WaterFoamRipples ||
        //     mapType == MapEntryType.Ocean)
        //     this.eventCtrl.SendEventMessage(EventTypes.SetGlow, map)

        if (mapType != MapEntryType.UltimateModular &&
            mapType != MapEntryType.FenceModular && 
            mapType != MapEntryType.Rain &&
            mapType != MapEntryType.WaterFoamRipples)
            this.scene.add(map)

        return map
    }
    MakeMapObjectDone(mapType = MapEntryType.GeometryGround) {
        const obj = this.mapObj.get(mapType)
        if (!obj)  throw new Error("there is not types = " + mapType);
        const mesh =  obj.CreateDone?.()

        if (mapType != MapEntryType.ProductGround)
            this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, mesh)
        return mesh
    }
    // DeleteMapObject(mapType = MapEntryType.CustomGround, obj: THREE.Object3D) {
    //     const mapObj = this.mapObj.get(mapType)
    //     if (!mapObj) throw new Error("there is no map objects");
    //     mapObj.Delete(obj)
    //     this.scene.remove(obj)
    //     this.eventCtrl.SendEventMessage(EventTypes.DeregisterPhysic, obj)
    // }
    MakeGround({
        mapType = MapType.Free, grid = false, gridSize = 1, gridDivision = 100,
        width = 1024 * 3, rows = 10, cols = 10, color = 0xA6C954,
    } ={}) {
        let map: THREE.Object3D | undefined = undefined
        switch(mapType) {
            case MapType.Rect:
                if (grid){
                    if (this.gridLine) this.scene.remove(this.gridLine)
                    this.gridLine = this.grid.createGrid(width, gridDivision)
                    map = this.gridLine
                } 
                break
            case MapType.RectMesh:
                if (grid){
                    if (this.gridMesh) this.scene.remove(this.gridMesh)
                    this.gridMesh = this.grid.createGridMesh(width, gridDivision, color)
                    map = this.gridMesh
                } 
                break
            case MapType.Hex:
                if (grid) {
                    if (this.gridLine) this.scene.remove(this.gridLine)
                    this.gridLine = this.grid.createOptimizedHexGrid(rows, cols, gridSize)
                    console.log(this.gridLine.position)
                    map = this.gridLine
                }
                break
            case MapType.HexMesh:
                if (grid) {
                    if (this.gridMesh) this.scene.remove(this.gridMesh)
                    this.gridMesh = this.grid.createOptimizedHexGridMesh(rows, cols, gridSize, color)
                    console.log(this.gridMesh.position)
                    map = this.gridMesh
                }
                break
        }
        if(!map) throw new Error("not defined");
        this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, map)
        this.eventCtrl.SendEventMessage(EventTypes.RegisterPhysic, map)
        this.scene.add(map)
        return map
    }
    MakeSky(light: THREE.DirectionalLight) {
        return new SkyBoxAllTime(light)
    }
    MakeWind() {
        return new Wind(this.eventCtrl)
    }
    GetTreeInfo(type: FluffyTreeType) {
        return (this.GetMapObject(MapEntryType.Tree) as TreeMaker).GetTreeInfo(type)
    }
    DelGrid(obj: THREE.Object3D) {
        this.eventCtrl.SendEventMessage(EventTypes.DeregisterPhysic, obj)
        this.scene.remove(obj)
        this.gridMesh = undefined
    }
    DeleteObj(obj: THREE.Object3D) {
        let cur: THREE.Object3D | null = obj
        do {
            if ("mapObj" in cur.userData) {
                const mapObj = cur.userData.mapObj as IWorldMapObject
                const mesh = mapObj.Delete(cur, ...(cur.userData.params !== undefined) ? [cur.userData.params] : [])
                if (mesh) {
                    this.eventCtrl.SendEventMessage(EventTypes.DeregisterPhysic, mesh)
                    this.scene.remove(mesh)
                }
                break
            } else if ("gridMesh" in cur.userData) {
                this.DelGrid(cur.userData.gridMesh)
                break
            } else if ("gridHexMesh" in cur.userData) {
                this.DelGrid(cur.userData.gridHexMesh)
                break
            }            
            cur = cur.parent
        } while (cur)
        return cur
    }
    getPosition(id: number) {
        const dummy = new THREE.Object3D()
        const matrix = new THREE.Matrix4()
        const instance = this.gridMesh!.children[0] as THREE.InstancedMesh
        instance.getMatrixAt(id, matrix)
        dummy.applyMatrix4(matrix)
        instance.localToWorld(dummy.position)
        return dummy.position.clone()
    }
    CheckPoint(id: number) {
        return this.getPosition(id)
    }
    makeMapEntries() {
        const mapData: MapEntry[] = []
        this.mapObj.forEach((v) => {
            const type = v.Type
            const data = v.Save?.()
            //const values = Array.isArray(params) ? params : Object.values(params || {});
            mapData.push({ type, data })
        })
        return mapData
    }
    async onLoad(key: string, callback?: (obj: THREE.Mesh, type: MapEntryType) => void) {
        const mapData = await loadDataTextureAndGeometry(key)
        if (!mapData) return

        mapData.entries.forEach(async (entry) => {
            if(entry.type === MapEntryType.CustomGround) {
                this.GetMapObject(entry.type).Load?.(entry.data, callback)
                return
            }
            if(Array.isArray(entry.data)) {
                entry.data.forEach(async (data) => {
                    const mesh = await this.MakeMapObject(entry.type, data)
                    callback?.(mesh, entry.type)
                })
                return
            }
            const mesh = await this.MakeMapObject(entry.type, entry.data)
            callback?.(mesh, entry.type)
        });
    }
    onSave() {
        const key = "mapData_" + this.generateDateKey()
        const mp: MapPackage = {
            key: key, entries: this.makeMapEntries(), date: Date.now()
        } 
        saveDataTextureAndGeometry(key, mp)
    }
    onDown() {
        const key = "mapData_" + this.generateDateKey()
        const mp: MapPackage = {
            key: key, entries: this.makeMapEntries(), date: Date.now()
        }
        downDataTextureAndGeometry(mp)
    }
    generateDateKey(date: Date = new Date()): string {
        const yy = date.getFullYear().toString().slice(-2); // 연도 (YY)
        const mm = String(date.getMonth() + 1).padStart(2, "0"); // 월 (MM)
        const dd = String(date.getDate()).padStart(2, "0"); // 일 (DD)
        const hh = String(date.getHours()).padStart(2, "0"); // 시 (HH)
        const mi = String(date.getMinutes()).padStart(2, "0"); // 분 (MM)

        return `${yy}${mm}${dd}_${hh}${mi}`; // "220201_1233" 형식
    }
}
