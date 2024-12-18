import * as THREE from "three";
import { AppMode } from "../../app";
import { EventController, EventFlag } from "../../event/eventctrl";
import { IKeyCommand, KeyType } from "../../event/keycommand";
import { GPhysics } from "../../common/physics/gphysics";
import { IPhysicsObject } from "../models/iobject";
import { IModelReload, ModelStore } from "../../common/modelstore";
import SConf from "../../configs/staticconf";
import { AppleTree } from "./appletree";
import { Loader } from "../../loader/loader";
import { Game } from "../game";
import { Player } from "../player/player";
import { PlantDb, PlantId, PlantProperty} from "./plantdb";
import { IViewer } from "../models/iviewer";
import { Canvas } from "../../common/canvas";
import { TreeCtrl } from "./treectrl";
import { AttackOption, AttackType, PlayerCtrl } from "../player/playerctrl";
import { Alarm, AlarmType } from "../../common/alarm";
import { Tomato } from "./tomato";
import { Drop } from "../../inventory/drop";

export enum PlantState {
    NeedSeed,
    Seeding,
    Enough,
    NeedWartering,
    Wartering,
    Death,
    Delete,
}
export type PlantEntry = {
    id: string
    createTime: number // ms, 0.001 sec
    lv: number // tree age
    state: PlantState
    lastWarteringTime: number
    lastHarvestTime: number
    position: THREE.Vector3
}

export type PlantSet = {
    plantId: PlantId
    plant: IPhysicsObject
    plantCtrl: TreeCtrl
    used: boolean
}
export class PlantBox extends THREE.Mesh {
    constructor(public Id: number, public ObjName: string,
        geo: THREE.BoxGeometry, mat: THREE.MeshBasicMaterial, public ctrl: TreeCtrl
    ) {
        super(geo, mat)
        this.name = ObjName
    }
}

export class Farmer implements IModelReload, IViewer {
    controllable = false
    target?: IPhysicsObject
    targetId?: string
    // 심을때 가이드하기 위한 메시
    plantsFab = new Map<string, IPhysicsObject>()
    plantset: PlantSet[] = []
    recycle: PlantSet[] = []
    saveData = this.store.Plants

    constructor(
        private loader: Loader,
        private player: Player,
        private playerCtrl: PlayerCtrl,
        private game: Game,
        private store: ModelStore,
        private gphysic: GPhysics,
        canvas: Canvas,
        private eventCtrl: EventController,
        private alarm: Alarm,
        private drop: Drop,
        private plantDb: PlantDb,
    ){
        canvas.RegisterViewer(this)
        store.RegisterStore(this)

        eventCtrl.RegisterAppModeEvent((mode: AppMode, e: EventFlag, id: string) => {
            if(mode != AppMode.Farmer) return

            switch (e) {
                case EventFlag.Start:
                    this.target = this.plantsFab.get(id)
                    if (!this.target) return
                    this.targetId = id
                    this.controllable = true
                    this.game.add(this.target.Meshs)
                    this.target.Visible = true
                    this.target.CannonPos.x = this.player.CannonPos.x
                    this.target.CannonPos.z = this.player.CannonPos.z

                    this.eventCtrl.OnChangeCtrlObjEvent(this.target)
                    this.CheckCollision()
                    break
                case EventFlag.End:
                    this.controllable = false
                    if (!this.target) return
                    this.target.Visible = false
                    this.game.remove(this.target.Meshs)
                    break
            }
        })

        eventCtrl.RegisterKeyDownEvent((keyCommand: IKeyCommand) => {
            if(!this.controllable) return
            switch(keyCommand.Type) {
                case KeyType.Action0:
                    if (!this.target || !this.targetId || this.CheckPlantAPlant()) return
                    const e: PlantEntry = {
                        position: new THREE.Vector3().copy(this.target.CannonPos), 
                        id: this.targetId, 
                        state: PlantState.NeedSeed,
                        lastWarteringTime: 0,
                        lv: 1,
                        createTime: 0,
                        lastHarvestTime: 0,
                    }
                    this.saveData.push(e)
                    this.CreatePlant(e)
                    eventCtrl.OnAppModeEvent(AppMode.EditPlay)
                    break;
                default:
                    const position = keyCommand.ExecuteKeyDown()
                    this.moveEvent(position)
                    break;
            }
        })

        eventCtrl.RegisterAttackEvent("farmtree", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                let obj = opt.obj as PlantBox
                if (obj == null) return
                const z = this.plantset[obj.Id]

                if(opt.type == AttackType.PlantAPlant) {
                    if (opt.damage) {
                        z.plantCtrl.SeedStart()
                    } else {
                        z.plantCtrl.SeedCancel()
                    }
                } else if(opt.type == AttackType.Wartering) {
                    if (opt.damage) {
                        z.plantCtrl.WarteringStart()
                    } else {
                        z.plantCtrl.WarteringCancel()
                    }
                } else if(opt.type == AttackType.Havest) {
                    if (z.plantCtrl.HavestStart(opt.damage) <= 0) this.HavestPlant(obj.Id)
                } else if(opt.type == AttackType.Delete) {
                    if (z.plantCtrl.Delete(opt.damage) <= 0) this.DeletePlant(obj.Id)
                }
            })
        })
    }
    update(delta: number): void {
        for (let i = 0; i < this.plantset.length; i++) {
            this.plantset[i].plantCtrl.update(delta)
        }
    }

    async Viliageload(): Promise<void> {
        this.ReleaseAllPlantPool()
    }
    async Reload(): Promise<void> {
        this.ReleaseAllPlantPool()
        this.saveData = this.store.Plants
        if (this.saveData) this.saveData.forEach((e) => {
            this.CreatePlant(e)
        })
    }
    async Cityload(): Promise<void> {
        this.ReleaseAllPlantPool()
    }
    CheckPlantAPlant() {
        const obj = this.target
        if(!obj) return true
        let ret = this.plantset.filter(e => e.used == true).some((e) => {
            return e.plant.Box.intersectsBox(obj.Box)
        })
        if(ret) {
            this.alarm.NotifyInfo("다른 식물과 가깝습니다.", AlarmType.Normal)
            return true
        }
        if(obj.CannonPos.y > 0.1){
            this.alarm.NotifyInfo("지면에 심어야합니다.", AlarmType.Normal)
            return true
        } 
        return false
    }
    HavestPlant(id: number) {
        const plantset = this.plantset[id];
        this.drop.DirectItem(plantset.plantCtrl.Drop)
    }
    DeletePlant(id: number) {
        const plantset = this.plantset[id];
        if(!plantset.used) return
        plantset.used = false
        const idx = this.saveData.findIndex((item) => item.position.x == plantset.plant.CannonPos.x && item.position.z == plantset.plant.CannonPos.z)
        if (idx > -1) this.saveData.splice(idx, 1)
        this.playerCtrl.remove(plantset.plantCtrl.phybox)
        this.game.remove(plantset.plant.Meshs, plantset.plantCtrl.phybox)
    }
    async CreatePlant(plantEntry: PlantEntry) {
        const property = this.plantDb.get(plantEntry.id)
        if (!property) return
        
        //let plantset = this.AllocatePlantPool(property, plantEntry.position)
        //if (!plantset) plantset = await this.NewPlantEntryPool(plantEntry, property)
        const plantset = await this.NewPlantEntryPool(plantEntry, property)
        this.playerCtrl.add(plantset.plantCtrl.phybox)
        this.game.add(plantset.plant.Meshs, plantset.plantCtrl.phybox)
    }
    moveEvent(v: THREE.Vector3) {
        if(!this.target) return
        const vx = (v.x > 0) ? 1 : (v.x < 0) ? - 1 : 0
        const vz = (v.z > 0) ? 1 : (v.z < 0) ? - 1 : 0

        this.target.Meshs.position.x += vx
        //this.meshs.position.y = 4.7
        this.target.Meshs.position.z += vz

        if (this.gphysic.Check(this.target)) {
            this.target.Meshs.position.x -= vx
            this.target.Meshs.position.z -= vz
        }
        // Check Collision Plant
        this.CheckCollision()
    }
    CheckCollision() {
        if(!this.target) return
        if (this.gphysic.Check(this.target)) {
            do {
                this.target.CannonPos.y += 0.5
            } while (this.gphysic.Check(this.target))
        } else {
            do {
                this.target.CannonPos.y -= 0.5
            } while (!this.gphysic.Check(this.target) && this.target.CannonPos.y >= 0)
            this.target.CannonPos.y += 0.5
        }
    }
    allocPos = 0
    AllocatePlantPool(property: PlantProperty, pos: THREE.Vector3) {
        for (let i = 0; i < this.plantset.length; i++, this.allocPos++) {
            this.allocPos %= this.plantset.length
            const e = this.plantset[this.allocPos]
            if (e.plantId == property.plantId && e.used == false) {
                e.used = true
                e.plantCtrl.ReAlloc(pos)
                return e
            }
        }
    }
    ReleaseAllPlantPool() {
        this.plantset.forEach((set) => {
            set.used = false
            this.playerCtrl.remove(set.plantCtrl.phybox)
            this.game.remove(set.plant.Meshs, set.plantCtrl.phybox)
        })
        this.plantset.length = 0
    }
    async NewPlantEntryPool(plantEntry: PlantEntry, property: PlantProperty): Promise<PlantSet> {
        const tree = await this.allocModel(plantEntry.id, plantEntry)

        await tree.MassLoader(plantEntry.position, this.plantset.length.toString())
        tree.Create()
        tree.Visible = true
        const treeCtrl = new TreeCtrl(this.plantset.length, tree, tree, property, plantEntry) 
        const plantset: PlantSet = { plantId: plantEntry.id, plant: tree, plantCtrl: treeCtrl, used: true }
        this.plantset.push(plantset)
        return plantset
    }
    async FarmLoader() {
        // TODO need refac
        PlantId.List.map(async (id) => {
            await this.allocModel(id)
        })
    }
    async allocModel(id: PlantId, plantEntry?: PlantEntry){
        const p = SConf.DefaultPortalPosition
        let plant
        switch(id) {
            default:
            case PlantId.AppleTree:
                plant = new AppleTree(this.loader.AppleTreeAsset, this.loader.AppleAsset, this.loader.DeadTree2Asset, "appletree")
                break
            case PlantId.CoconutTree:
                plant = new AppleTree(this.loader.CoconutTreeAsset, this.loader.CoconutAsset, this.loader.DeadTree2Asset, "coconuttree")
                break
            case PlantId.Tomato:
                plant = new Tomato([this.loader.Tomato0Asset, this.loader.Tomato1Asset, this.loader.Tomato2Asset], "tomato")
                break
            case PlantId.Potato:
                plant = new Tomato([this.loader.Potato0Asset, this.loader.Potato1Asset, this.loader.Potato2Asset], "potato")
                break
            case PlantId.Carrot:
                plant = new Tomato([this.loader.Carrot0Asset, this.loader.Carrot1Asset, this.loader.Carrot2Asset], "carrot")
                break
        }
        if(plantEntry) {
            await plant.MassLoader(plantEntry.position, this.plantset.length.toString())
            return plant
        }
        this.plantsFab.set(id as string, plant)
        await plant.MassLoader(p)
        return plant
    }
}