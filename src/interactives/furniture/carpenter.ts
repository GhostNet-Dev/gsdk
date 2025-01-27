import * as THREE from "three";
import { FurnCtrl } from "./furnctrl";
import { FurnModel } from "./bed";
import { FurnId } from "@Glibs/types/furntypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import IEventController, { IKeyCommand, ILoop } from "@Glibs/interface/ievent";
import { Loader } from "@Glibs/loader/loader";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { FurnDb } from "./furndb";
import IInventory from "@Glibs/interface/iinven";
import { AppMode, EventTypes } from "@Glibs/types/globaltypes";
import { EventFlag, KeyType } from "@Glibs/types/eventtypes";
import { FurnBox, FurnEntry, FurnProperty, FurnState } from "./furntypes";
import { InventorySlot } from "@Glibs/types/inventypes";
import { AttackOption, AttackType } from "@Glibs/types/playertypes";
import { Char } from "@Glibs/types/assettypes";

export type FurnSet = {
    id: FurnId
    furn: IPhysicsObject
    furnCtrl: FurnCtrl
    used: boolean
}

export class Carpenter implements ILoop {
    controllable = false
    target?: IPhysicsObject
    targetId?: string
    furnFab = new Map<string, IPhysicsObject>()
    furnitures: FurnSet[] = []
    private saveData: FurnEntry[] = []

    constructor(
        private loader: Loader,
        private player: IPhysicsObject,
        private game: THREE.Scene,
        private gphysic: IGPhysic,
        private eventCtrl: IEventController,
        private furnDb: FurnDb,
        private inven: IInventory,
    ){
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)

        eventCtrl.RegisterEventListener(EventTypes.AppMode, (mode: AppMode, e: EventFlag, id: string) => {
            if(mode != AppMode.Furniture) return

            switch (e) {
                case EventFlag.Start:
                    this.target = this.furnFab.get(id)
                    if (!this.target) return
                    this.targetId = id
                    this.controllable = true
                    this.game.add(this.target.Meshs)
                    this.target.Visible = true
                    this.CopyPosition(this.target.Pos, this.player.Pos)
                    this.eventCtrl.SendEventMessage(EventTypes.CtrlObj, this.target)
                    this.CheckCollision()
                    console.log(id)
                    break
                case EventFlag.End:
                    this.controllable = false
                    if (!this.target) return
                    this.target.Visible = false
                    this.game.remove(this.target.Meshs)
                    break
            }
        })

        eventCtrl.RegisterEventListener(EventTypes.KeyDown, (keyCommand: IKeyCommand) => {
            if(!this.controllable) return
            switch(keyCommand.Type) {
                case KeyType.Action0:
                    if (!this.target || 
                        !this.targetId || 
                        !this.CheckMaterial(this.targetId)) return
                    const e: FurnEntry = {
                        id: this.targetId,
                        position: new THREE.Vector3().copy(this.target.Pos), 
                        rotation: new THREE.Euler().copy(this.target.Meshs.rotation),
                        state: FurnState.NeedBuilding,
                        createTime: 0
                    }
                    this.CreateFurn(e)
                    eventCtrl.SendEventMessage(EventTypes.AppMode, AppMode.EditPlay)
                    break;
                case KeyType.Action1:
                    if (!this.target || !this.targetId) return
                    this.target.Meshs.rotation.y += Math.PI /2
                    break;
                default:
                    const position = keyCommand.ExecuteKeyDown()
                    this.moveEvent(position)
                    break;
            }
        })

        eventCtrl.RegisterEventListener(EventTypes.Attack + "furniture", (opts: AttackOption[]) => {
            opts.forEach((opt) => {
                let obj = opt.obj as FurnBox
                if (obj == null) return
                const z = this.furnitures[obj.Id]

                if(opt.type == AttackType.Building) {
                    if (opt.damage) {
                        z.furnCtrl.BuildingStart()
                    } else {
                        z.furnCtrl.BuildingCancel()
                    }
                } else if (opt.type == AttackType.Delete) {
                    if (z.furnCtrl.Delete(opt.damage) <= 0) this.DeleteFurn(obj.Id)
                }
            })
        })
    }
    CopyPosition(dst: THREE.Vector3, src: THREE.Vector3) {
        dst.x = Math.ceil(src.x)
        dst.y = src.y
        dst.z = Math.ceil(src.z)
    }
    update(delta: number): void {
        for (let i = 0; i < this.furnitures.length; i++) {
            this.furnitures[i].furnCtrl.update(delta)
        }
    }
    CheckCollision() {
        if(!this.target) return
        if (this.gphysic.Check(this.target)) {
            do {
                this.target.Pos.y += 0.5
            } while (this.gphysic.Check(this.target))
        } else {
            do {
                this.target.Pos.y -= 0.5
            } while (!this.gphysic.Check(this.target) && this.target.Pos.y >= 0)
            this.target.Pos.y += 0.5
        }
    }

    async Viliageload(): Promise<void> {
        this.ReleaseAllFurnPool()
    }
    async Reload(): Promise<void> {
        this.ReleaseAllFurnPool()
        //this.saveData = this.store.Furn
        if (this.saveData) this.saveData.forEach((e) => {
            this.CreateFurn(e)
        })
    }
    async Cityload(): Promise<void> {
        this.ReleaseAllFurnPool()
    }
    CheckMaterial(id: FurnId) {
        const property = this.furnDb.get(id)
        const items = property?.madeby
        if (!items) return true
        const slots: InventorySlot[] = []
        const ret = items.some((e) => {
            // search inventory and store
            const slot = this.inven.GetItem(e.itemId)
            if (slot && slot.count >= e.count) slots.push(slot)
            else {
                const info = this.inven.GetItemInfo(e.itemId)
                const name = info.namekr ?? info.name
                this.eventCtrl.SendEventMessage(EventTypes.AlarmNormal, name + "이 부족합니다.")
                return true
            }
        })
        if(ret == false) {
            // apply using item
            items.forEach((e) => {
                const slot = slots.find(s => s.item.Id == e.itemId)
                if (slot) slot.count -= e.count
                else throw new Error("unexpected undefined value");
                
            })
            return true
        }
        return false
    }
    async CreateFurn(furnEntry: FurnEntry) {
        const property = this.furnDb.get(furnEntry.id)
        if (!property) return
        
        //let furnset = this.AllocateFurnPool(property, furnEntry)
        //if (!furnset) furnset = await this.NewFurnEntryPool(furnEntry, property)
        const furnset = await this.NewFurnEntryPool(furnEntry, property)

        this.eventCtrl.SendEventMessage(EventTypes.AddInteractive, furnset.furnCtrl.phybox)
        this.game.add(furnset.furn.Meshs, furnset.furnCtrl.phybox)
    }
    DeleteFurn(id: number) {
        const furnset = this.furnitures[id];
        if(!furnset.used) return
        furnset.used = false
        /*
        const idx = this.saveData.findIndex((item) => item.position.x == furnset.furn.Pos.x && item.position.z == furnset.furn.Pos.z)
        if (idx > -1) this.saveData.splice(idx, 1)
        */
        this.eventCtrl.SendEventMessage(EventTypes.DelInteractive, furnset.furnCtrl.phybox)
        this.game.remove(furnset.furn.Meshs, furnset.furnCtrl.phybox)
    }
    
    moveEvent(v: THREE.Vector3) {
        if(!this.target) return
        const vx = (v.x > 0) ? 1 : (v.x < 0) ? - 1 : 0
        const vz = (v.z > 0) ? 1 : (v.z < 0) ? - 1 : 0

        this.target.Meshs.position.x += vx
        this.target.Meshs.position.z += vz
        console.log(this.target.Meshs.position)

        if (this.gphysic.Check(this.target)) {
            this.target.Meshs.position.x -= vx
            this.target.Meshs.position.z -= vz
        }
        // Check Collision Furniture
        /*
        if (this.gphysic.Check(this.target)) {
            do {
                this.target.Pos.y += 0.2
            } while (this.gphysic.Check(this.target))
        } else {
            */
            do {
                this.target.Pos.y -= 0.2
            } while (!this.gphysic.Check(this.target) && this.target.Pos.y >= 0)
            this.target.Pos.y += 0.2
        //}
    }
    allocPos = 0
    AllocateFurnPool(property: FurnProperty, furnEntry: FurnEntry) {
        for (let i = 0; i < this.furnitures.length; i++, this.allocPos++) {
            this.allocPos %= this.furnitures.length
            const e = this.furnitures[this.allocPos]
            if(e.id == property.id && e.used == false) {
                e.used = true
                e.furn.Pos.copy(furnEntry.position)
                e.furn.Meshs.rotation.copy(furnEntry.rotation)
                e.furnCtrl.phybox.position.copy(e.furn.BoxPos)
                return e
            }
        }
    }
    ReleaseAllFurnPool() {
        this.furnitures.forEach((set) => {
            set.used = false
            this.eventCtrl.SendEventMessage(EventTypes.DelInteractive, set.furnCtrl.phybox)
            this.game.remove(set.furn.Meshs, set.furnCtrl.phybox)
        })
        this.furnitures.length = 0
    }
    async NewFurnEntryPool(furnEntry: FurnEntry, property: FurnProperty): Promise<FurnSet> {
        const furn = this.getModel(furnEntry.id)
        if (!furn) throw new Error("unexpected allocation fail");

        await furn.MassLoader(furnEntry.position, furnEntry.rotation, this.furnitures.length.toString())
        furn.Create()
        furn.Visible = true
        const treeCtrl = new FurnCtrl(this.furnitures.length, furn, furn, property, 
            this.gphysic, this.saveData, furnEntry) 
        
        const furnset: FurnSet = { id: furnEntry.id, furn: furn, furnCtrl: treeCtrl, used: true }
        this.furnitures.push(furnset)
        return furnset
    }
    async FurnLoader() {
        // TODO need refac
        FurnId.List.map(async (id) => {
            await this.allocModel(id, this.getModel(id))
        })
    }
    async allocModel(id: string, model: FurnModel, p = new THREE.Vector3) {
        this.furnFab.set(id, model);
        await model.MassLoader(p);
    }
    getModel(id: FurnId) {
        let furn
        switch (id) {
            default:
            case FurnId.DefaultBed:
                furn = new FurnModel(this.loader.GetAssets(Char.Bed), "bed")
                break;
            case FurnId.DefaultBath:
                furn = new FurnModel(this.loader.GetAssets(Char.Bath), "bath")
                break;
            case FurnId.DefaultBookShelf:
                furn = new FurnModel(this.loader.GetAssets(Char.Bookshelf), "bookshelf")
                break;
            case FurnId.DefaultCloset:
                furn = new FurnModel(this.loader.GetAssets(Char.Closet), "closet")
                break;
            case FurnId.DefaultDesk:
                furn = new FurnModel(this.loader.GetAssets(Char.Desk), "desk")
                break;
            case FurnId.DefaultKitchen:
                furn = new FurnModel(this.loader.GetAssets(Char.Kitchen), "kitchen")
                break;
            case FurnId.DefaultKitTable:
                furn = new FurnModel(this.loader.GetAssets(Char.KitTable), "kittable")
                break;
            case FurnId.DefaultOven:
                furn = new FurnModel(this.loader.GetAssets(Char.Oven), "oven")
                break;
            case FurnId.DefaultRefrigerator:
                furn = new FurnModel(this.loader.GetAssets(Char.Refrigerator), "refrigerator")
                break;
            case FurnId.DefaultSink:
                furn = new FurnModel(this.loader.GetAssets(Char.Sink), "sink")
                break;
            case FurnId.DefaultTable:
                furn = new FurnModel(this.loader.GetAssets(Char.Table), "table")
                break;
            case FurnId.DefaultToilet:
                furn = new FurnModel(this.loader.GetAssets(Char.Toilet), "toilet")
                break;
            case FurnId.DefaultTv:
                furn = new FurnModel(this.loader.GetAssets(Char.Table), "tv")
                break;
        }
        return furn
    }
}