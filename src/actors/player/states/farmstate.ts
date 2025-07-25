import * as THREE from "three";
import { IPlayerAction, State } from "./playerstate"
import { AttackOption, AttackType } from "@Glibs/types/playertypes";
import { PlayerCtrl } from "../playerctrl";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { ActionType } from "../playertypes";
import { Player } from "../player";
import IInventory, { IItem } from "@Glibs/interface/iinven";
import { Bind } from "@Glibs/types/assettypes";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { FurnBox, FurnState } from "@Glibs/types/furntypes";
import { PlantBox, PlantState, PlantType } from "@Glibs/types/planttypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";

export class PickFruitState extends State implements IPlayerAction {
    next: IPlayerAction = this
    attackDist = 3
    attackDir = new THREE.Vector3()
    raycast = new THREE.Raycaster()
    attackTime = 0
    attackSpeed = 2
    target?: string
    targetMsg?: AttackOption

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, private eventCtrl: IEventController, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    Init(): void {
        console.log("Pick!!")
        this.next = this
        this.player.ChangeAction(ActionType.PickFruit) ?? 2
        const p = this.havest()
        if (p != undefined) {
            this.Uninit()
            this.next = p
        }
    }
    Uninit(): void {
        if(!this.target || !this.targetMsg) return
        this.targetMsg.damage = 0
        this.eventCtrl.SendEventMessage(EventTypes.Attack + this.target, [this.targetMsg]) 
    }
    havest() {
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize())
        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            for(let i = 0; i < intersects.length; i++) {
                const obj = intersects[i]
                if (obj.distance> this.attackDist) return 
                const k = obj.object.name
                if (k == "farmtree") {
                    const ctrl = (obj.object as PlantBox).ctrl
                    if (ctrl.PlantType == PlantType.Tree) {
                        this.playerCtrl.PickFruitTreeSt.Init()
                        return this.playerCtrl.PickFruitTreeSt
                    }
                    if(!ctrl.NeedHavest) {
                        this.playerCtrl.currentIdleState.Init()
                        return this.playerCtrl.currentIdleState
                    }
                }
                const msg = {
                    type: AttackType.Havest,
                    damage: 1,
                    obj: obj.object
                }
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [msg])
                this.target = k
                this.targetMsg = msg
            }
        } else {
            this.playerCtrl.currentIdleState.Init()
            return this.playerCtrl.currentIdleState
        }
    }
    Update(delta: number): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) {
            this.Uninit()
            return d
        }
        this.attackTime += delta

        if(this.attackTime / this.attackSpeed < 1) {
            return this
        }
        this.attackTime -= this.attackSpeed
        const p = this.havest()
        if(p != undefined) {
            this.Uninit()
            return p
        }

        return this.next
    }
}
export class PickFruitTreeState extends State implements IPlayerAction {
    next: IPlayerAction = this
    attackDist = 3
    attackDir = new THREE.Vector3()
    raycast = new THREE.Raycaster()
    attackTime = 0
    attackSpeed = 2
    target?: string
    targetMsg?: AttackOption

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, private eventCtrl: IEventController, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    Init(): void {
        console.log("Pick Tree!!")
        this.next = this
        this.player.ChangeAction(ActionType.PickFruitTree) ?? 2
        const p = this.havest()
        if (p != undefined) {
            this.Uninit()
            this.next = p
        }
    }
    Uninit(): void {
        if(!this.target || !this.targetMsg) return
        this.targetMsg.damage = 0
        this.eventCtrl.SendEventMessage(EventTypes.Attack + this.target, [this.targetMsg]) 
    }
    havest() {
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize())
        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            for(let i = 0; i < intersects.length; i++) {
                const obj = intersects[i]
                if (obj.distance> this.attackDist) return 
                const k = obj.object.name
                if (k == "farmtree") {
                    const ctrl = (obj.object as PlantBox).ctrl
                    if (ctrl.PlantType == PlantType.Vegetable) {
                        this.playerCtrl.PickFruitSt.Init()
                        return this.playerCtrl.PickFruitSt
                    }
                    if(!ctrl.NeedHavest) {
                        this.playerCtrl.currentIdleState.Init()
                        return this.playerCtrl.currentIdleState
                    }
                }
                const msg = {
                    type: AttackType.Havest,
                    damage: 1,
                    obj: obj.object
                }
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [msg])
                this.target = k
                this.targetMsg = msg
            }
        } else {
            this.playerCtrl.currentIdleState.Init()
            return this.playerCtrl.currentIdleState
        }
    }
    Update(delta: number): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) {
            this.Uninit()
            return d
        }
        this.attackTime += delta

        if(this.attackTime / this.attackSpeed < 1) {
            return this
        }
        this.attackTime -= this.attackSpeed
        const p = this.havest()
        if(p != undefined) {
            this.Uninit()
            return p
        }
        return this.next
    }
}
export class PlantAPlantState extends State implements IPlayerAction {
    next: IPlayerAction = this
    attackDist = 3
    attackDir = new THREE.Vector3()
    raycast = new THREE.Raycaster()
    target?: string
    targetMsg?: AttackOption
    trigger = false

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, private eventCtrl: IEventController, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    Init(): void {
        console.log("Plant a Plant!!")
        this.player.ChangeAction(ActionType.PlantAPlant) ?? 2
        this.trigger = true
    }
    plant() {
        if(!this.trigger) return
        this.trigger = false
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize())
        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            for(let i = 0; i < intersects.length; i++) {
                const obj = intersects[i]
                if (obj.distance> this.attackDist) return 
                const k = obj.object.name
                if (k == "furniture") {
                    this.playerCtrl.BuildingSt.Init()
                    return this.playerCtrl.BuildingSt
                }
                if (k == "farmtree") {
                    const ctrl = (obj.object as PlantBox).ctrl
                    if (ctrl.State != PlantState.NeedSeed && ctrl.State != PlantState.Seeding) {
                        this.playerCtrl.DeleteSt.InitWithObj(obj)
                        return this.playerCtrl.DeleteSt
                    }
                }
                if (k == "deck") {
                    this.playerCtrl.DeckSt.Init()
                    return this.playerCtrl.DeckSt
                }
                const msg = {
                    type: AttackType.PlantAPlant,
                    damage: 1,
                    obj: obj.object
                }
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [msg])
                this.target = k
                this.targetMsg = msg
            }
        } else {
            this.playerCtrl.currentIdleState.Init()
            return this.playerCtrl.currentIdleState
        }
    }
    Uninit(): void {
        if(!this.target || !this.targetMsg) return
        this.targetMsg.damage = 0
        this.eventCtrl.SendEventMessage(EventTypes.Attack + this.target, [this.targetMsg])
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) {
            this.Uninit()
            return d
        }
        const p = this.plant()
        if(p != undefined) {
            this.Uninit()
            return p
        }

        return this.next
    }
}
export class WarteringState extends State implements IPlayerAction {
    warteringCan?: IItem
    attackDist = 3
    attackDir = new THREE.Vector3()
    raycast = new THREE.Raycaster()
    target?: string
    targetMsg?: AttackOption
    
    trigger = false

    constructor(
        playerPhy: PlayerCtrl, 
        player: Player, 
        gphysic: IGPhysic, 
        private inven: IInventory, 
        private eventCtrl: IEventController,
        baseSpec: BaseSpec
    ) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    async Init() {
        console.log("Wartering!!")
        this.player.ChangeAction(ActionType.Watering) ?? 2
        const id = this.player.Asset.GetBodyMeshId(Bind.Hands_R)
        if (id == undefined) return
        const mesh = this.player.Meshs.getObjectByName(id)
        if (!mesh) return 
        const item = await this.inven.GetNewItem("WarterCan")
        if (item && item.Mesh != undefined) {
            const find = mesh.getObjectById(item.Mesh.id)
            if(find) {
                find.visible = true
            } else {
                mesh.add(item.Mesh)
            }
        }
        this.warteringCan = item
        this.trigger = true
    }
    Uninit(): void {
        if (this.warteringCan && this.warteringCan.Mesh) this.warteringCan.Mesh.visible = false
        if (!this.target || !this.targetMsg) return
        this.targetMsg.damage = 0
        this.eventCtrl.SendEventMessage(EventTypes.Attack + this.target, [this.targetMsg])
    }
    wartering() {
        if(!this.trigger) return
        this.trigger = false
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize())
        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            intersects.forEach((obj) => {
                if (obj.distance> this.attackDist) return false
                const k = obj.object.name
                const msg = {
                    type: AttackType.Wartering,
                    damage: 1,
                    obj: obj.object
                }
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [msg])
                this.target = k
                this.targetMsg = msg
            })
        } else {
            this.playerCtrl.currentIdleState.Init()
            return this.playerCtrl.currentIdleState
        }
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) {
            this.Uninit()
            return d
        }
        const p = this.wartering()
        if(p != undefined) {
            this.Uninit()
            return p
        }

        return this
    }
}
export class DeleteState extends State implements IPlayerAction {
    next: IPlayerAction = this
    attackDist = 3
    attackDir = new THREE.Vector3()
    raycast = new THREE.Raycaster()
    target?: string
    targetMsg?: AttackOption
    attackTime = 0
    attackSpeed = 2
    keytimeout?:NodeJS.Timeout

    constructor(playerPhy: PlayerCtrl, player: Player, gphysic: IGPhysic, private eventCtrl: IEventController, baseSpec: BaseSpec) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    InitWithObj(obj: THREE.Intersection) {
        const k = obj.object.name
        const msg = {
            type: AttackType.Delete,
            damage: 1,
            obj: obj.object
        }
        this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [msg])
        this.target = k
        this.targetMsg = msg
        this.Init()
    }
    Init(): void {
        console.log("Delete!!")
        this.player.ChangeAction(ActionType.Hammering, this.attackSpeed) 
    }
    delete() {
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize())
        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            for(let i = 0; i < intersects.length; i++) {
                const obj = intersects[i]
                if (obj.distance > this.attackDist) return 
                const k = obj.object.name
                const msg = {
                    type: AttackType.Delete,
                    damage: 1,
                    obj: obj.object
                }
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [msg])
                this.target = k
                this.targetMsg = msg
            }
        } else {
            this.Uninit()
            this.playerCtrl.currentIdleState.Init()
            return this.playerCtrl.currentIdleState
        }
        return this
    }
    Uninit(): void {
        if (!this.target || !this.targetMsg) return
        this.targetMsg.damage = 0
        this.eventCtrl.SendEventMessage(EventTypes.Attack + this.target, [this.targetMsg])
    }
    Update(delta: number): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) {
            this.Uninit()
            return d
        }
        this.attackTime += delta

        if(this.attackTime / this.attackSpeed < 1) {
            return this
        }
        this.attackTime -= this.attackSpeed
        this.delete()

        return this
    }
}

export class BuildingState extends State implements IPlayerAction {
    hammer?: IItem
    attackDist = 3
    attackDir = new THREE.Vector3()
    raycast = new THREE.Raycaster()
    target?: string
    targetMsg?: AttackOption
    
    trigger = false

    constructor(
        playerPhy: PlayerCtrl, 
        player: Player, 
        gphysic: IGPhysic, 
        private inven: IInventory, 
        private eventCtrl: IEventController,
        baseSpec: BaseSpec
    ) {
        super(playerPhy, player, gphysic, baseSpec)
    }
    async Init() {
        console.log("Building!!")
        this.player.ChangeAction(ActionType.Building) ?? 2
        const id = this.player.Asset.GetBodyMeshId(Bind.Hands_R)
        if (id == undefined) return
        const mesh = this.player.Meshs.getObjectByName(id)
        if (!mesh) return 
        const item = await this.inven.GetNewItem("Hammer")
        if (item && item.Mesh != undefined) {
            const find = mesh.getObjectById(item.Mesh.id)
            if(find) {
                find.visible = true
            } else {
                mesh.add(item.Mesh)
            }
        }
        this.hammer = item
        this.trigger = true
    }
    Uninit(): void { 
        if (this.hammer && this.hammer.Mesh) this.hammer.Mesh.visible = false
        if (!this.target || !this.targetMsg) return
        this.targetMsg.damage = 0
        this.eventCtrl.SendEventMessage(EventTypes.Attack + this.target, [this.targetMsg])
    }
    building() {
        if(!this.trigger) return
        this.trigger = false
        this.player.Meshs.getWorldDirection(this.attackDir)
        this.raycast.set(this.player.CenterPos, this.attackDir.normalize())
        const intersects = this.raycast.intersectObjects(this.playerCtrl.targets)
        if (intersects.length > 0 && intersects[0].distance < this.attackDist) {
            for (let i = 0; i < intersects.length; i++) {
                const obj = intersects[i]
                if (obj.distance > this.attackDist) break
                const k = obj.object.name
                const ctrl = (obj.object as FurnBox).ctrl
                if (ctrl.State == FurnState.Done) {
                    this.playerCtrl.DeleteSt.InitWithObj(obj)
                    return this.playerCtrl.DeleteSt
                }
                const msg = {
                    type: AttackType.Building,
                    damage: 1,
                    obj: obj.object
                }
                this.eventCtrl.SendEventMessage(EventTypes.Attack + k, [msg])
                this.target = k
                this.targetMsg = msg
            }
        } else {
            this.Uninit()
            this.playerCtrl.currentIdleState.Init()
            return this.playerCtrl.currentIdleState
        }
    }
    Update(): IPlayerAction {
        const d = this.DefaultCheck()
        if (d != undefined) {
            this.Uninit()
            return d
        }
        const b = this.building()
        if (b != undefined) {
            this.Uninit()
            return b
        }

        return this
    }
}