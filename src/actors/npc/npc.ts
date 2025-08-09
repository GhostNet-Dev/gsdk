import * as THREE from "three";
import { IAsset } from "@Glibs/interface/iasset";
import IEventController from "@Glibs/interface/ievent";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { Loader } from "@Glibs/loader/loader";
import { Ani } from "@Glibs/types/assettypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { ActionType } from "@Glibs/types/playertypes";
import { InvenFactory } from "@Glibs/inventory/invenfactory";
import { IItem } from "@Glibs/interface/iinven";
import { ItemId, itemDefs } from "@Glibs/inventory/items/itemdefs";

export class Npc extends PhysicsObject {
    mixer?: THREE.AnimationMixer
    currentAni?: THREE.AnimationAction
    currentClip?: THREE.AnimationClip
    currentActionType = ActionType.Idle
    clipMap = new Map<ActionType, THREE.AnimationClip | undefined>()
    bindMesh: Record<string, THREE.Group> = {}

    constructor(
        private loader: Loader, 
        asset: IAsset,
        private eventCtrl: IEventController,
        private game: THREE.Scene,
        fab: InvenFactory,
    ) {
        super(asset)

        this.eventCtrl.RegisterEventListener(EventTypes.Equipment, async (id: ItemId) => {
            // right hand
            const item = await fab.inven.GetNewItem(id)
            this.ReloadBindingItem(item)
        })
    }
    ReloadBindingItem(item: IItem) {
        if(item.Bind == undefined) throw new Error("item bind is undefined")

        const rightId = this.asset.GetBodyMeshId(item.Bind)
        if (rightId == undefined) return

        const mesh = this.meshs.getObjectByName(rightId)
        if (!mesh) return
        const prev = this.bindMesh[item.Bind]

        if (prev) {
            //mesh.remove(prev)
            prev.visible = false
            delete this.bindMesh[item.Bind]
        }

        if (item && item.Mesh != undefined) {
            const find = mesh.getObjectById(item.Mesh.id)
            if(find) {
                find.visible = true
            } else {
                mesh.add(item.Mesh)
            }
            this.bindMesh[item.Bind] = item.Mesh
        }
    }
    Uninit() {
        this.meshs.visible = false
    }

    Init(pos: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        this.meshs.position.copy(pos)
        console.log("player Init: ", pos)
        this.meshs.visible = true
    }

    async Loader(asset: IAsset, position: THREE.Vector3, name: string) {
        this.asset = asset
        const [meshs, _exist] = await asset.UniqModel(name)
        this.eventCtrl.SendEventMessage(EventTypes.SetNonGlow, meshs)
        
        this.meshs = meshs
        this.meshs.position.copy(position)

        this.mixer = asset.GetMixer(name)

        this.clipMap.set(ActionType.Idle, asset.GetAnimationClip(Ani.Idle))
        this.changeAnimate(this.clipMap.get(this.currentActionType))

        this.meshs.visible = false
    }
    changeAnimate(animate: THREE.AnimationClip | undefined, speed?: number) {
        if (animate == undefined || this.currentClip == animate) return
        
        let fadeTime = 0.2
        this.currentAni?.fadeOut(0.2)
        const currentAction = this.mixer?.clipAction(animate)
        if (currentAction == undefined) return

        if (animate == this.clipMap.get(ActionType.Jump) || 
            animate == this.clipMap.get(ActionType.Dying)
        ) {
            fadeTime = 0
            currentAction.clampWhenFinished = true
            currentAction.setLoop(THREE.LoopOnce, 1)
        } else {
            currentAction.setLoop(THREE.LoopRepeat, Infinity)
        }
        if(speed != undefined) {
            currentAction.timeScale = animate.duration / speed
        }
        currentAction.reset().fadeIn(fadeTime).play()

        this.currentAni = currentAction
        this.currentClip = animate
    }

    clock = new THREE.Clock()

    ChangeAction(action: ActionType, speed?: number) {
        let clip: THREE.AnimationClip | undefined
        this.currentActionType = action
        this.changeAnimate(this.clipMap.get(action), speed)
        return clip?.duration
    }
    Update(delta: number) {
        this.mixer?.update(delta)
        this.CBoxUpdate()
    }
}