import * as THREE from "three";
import { Loader } from "@Glibs/loader/loader";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { EffectType } from "@Glibs/types/effecttypes";
import IEventController from "@Glibs/interface/ievent";
import { AppMode, EventTypes } from "@Glibs/types/globaltypes";
import { EventFlag } from "@Glibs/types/eventtypes";
import { Effector } from "@Glibs/magical/effects/effector";
import { Ani, Bind, Char } from "@Glibs/types/assettypes";
import { IAsset } from "@Glibs/interface/iasset";
import IInventory from "@Glibs/interface/iinven";
import { ActionType } from "./playertypes";



export class Player extends PhysicsObject {
    mixer?: THREE.AnimationMixer
    currentAni?: THREE.AnimationAction
    currentClip?: THREE.AnimationClip
    currentActionType = ActionType.Idle

    private playerModel: Char = Char.Male
    bindMesh: THREE.Group[] = []

    clipMap = new Map<ActionType, THREE.AnimationClip | undefined>()
    private effector = new Effector(this.game)
    meshs: THREE.Group
    constructor(
        private loader: Loader, 
        asset: IAsset,
        private eventCtrl: IEventController,
        private game: THREE.Scene
    ) {
        super(asset)
        this.meshs = new THREE.Group
        this.effector.Enable(EffectType.Status)

        this.eventCtrl.RegisterEventListener(EventTypes.AppMode, (mode: AppMode, e: EventFlag) => {
            if (mode == AppMode.Play || mode == AppMode.EditPlay || mode == AppMode.Weapon) {
                switch (e) {
                    case EventFlag.Start:
                        this.eventCtrl.SendEventMessage(EventTypes.CtrlObj, this)
                        this.Init()
                        this.meshs.visible = true
                        break
                    case EventFlag.End:
                        this.Uninit()
                        this.meshs.visible = false
                        break
                }
                return
            }
            this.meshs.visible = false
        })
        this.eventCtrl.RegisterEventListener(EventTypes.Equipment, (inven: IInventory) => {
            // right hand
            this.ReloadBindingItem(inven, Bind.Head)
            this.ReloadBindingItem(inven, Bind.Hands_L)
            this.ReloadBindingItem(inven, Bind.Hands_R)
        })
    }
    GetItemPosition(target: THREE.Vector3) {
        const rightId = this.loader.MaleAsset.GetBodyMeshId(Bind.Hands_R)
        if (rightId == undefined) return
        const mesh = this.meshs.getObjectByName(rightId)
        if (!mesh) return
        mesh.getWorldPosition(target)
    }
    ReloadBindingItem(inven: IInventory, bind: Bind) {
        const rightId = this.loader.MaleAsset.GetBodyMeshId(bind)
        if (rightId == undefined) return

        const mesh = this.meshs.getObjectByName(rightId)
        if (!mesh) return
        const prev = this.bindMesh[bind]

        if (prev) {
            //mesh.remove(prev)
            prev.visible = false
            this.bindMesh.splice(this.bindMesh.indexOf(prev), 1)
        }

        const rItem = inven.GetBindItem(bind)
        if (rItem && rItem.Mesh != undefined) {
            const find = mesh.getObjectById(rItem.Mesh.id)
            if(find) {
                find.visible = true
            } else {
                mesh.add(rItem.Mesh)
            }
            this.bindMesh[bind] = rItem.Mesh
        }
    }

    Uninit() {
    }

    Init(pos: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        this.meshs.position.copy(pos)
        console.log("player Init: ", pos)
    }

    async Viliageload(): Promise<void> {
        await this.Reload()
    }
    async Reload(): Promise<void> {
        const model = this.playerModel// this.store.PlayerModel
        
        if (this.playerModel == model) {
            return 
        }
        this.game.remove(this.meshs)
        await this.Loader(this.loader.GetAssets(model), this.meshs.position, "player")
        this.game.add(this.meshs)
    }

    async Loader(asset: IAsset, position: THREE.Vector3, name: string) {
        this.playerModel = asset.Id
        const [meshs, _exist] = await asset.UniqModel(name)
        
        this.meshs = meshs
        this.meshs.position.copy(position)

        this.mixer = asset.GetMixer(name)

        this.clipMap.set(ActionType.Idle, asset.GetAnimationClip(Ani.Idle))
        this.clipMap.set(ActionType.Run, asset.GetAnimationClip(Ani.Run))
        this.clipMap.set(ActionType.Jump, asset.GetAnimationClip(Ani.Jump))
        this.clipMap.set(ActionType.Punch, asset.GetAnimationClip(Ani.Punch))
        this.clipMap.set(ActionType.Sword, asset.GetAnimationClip(Ani.Sword))
        this.clipMap.set(ActionType.Gun, asset.GetAnimationClip(Ani.Shooting))
        this.clipMap.set(ActionType.Fight, asset.GetAnimationClip(Ani.FightIdle))
        this.clipMap.set(ActionType.Dance, asset.GetAnimationClip(Ani.Dance0))
        this.clipMap.set(ActionType.MagicH1, asset.GetAnimationClip(Ani.MagicH1))
        this.clipMap.set(ActionType.MagicH2, asset.GetAnimationClip(Ani.MagicH2))
        this.clipMap.set(ActionType.Dying, asset.GetAnimationClip(Ani.Dying))
        this.clipMap.set(ActionType.PickFruit, asset.GetAnimationClip(Ani.PickFruit))
        this.clipMap.set(ActionType.PickFruitTree, asset.GetAnimationClip(Ani.PickFruitTree))
        this.clipMap.set(ActionType.PlantAPlant, asset.GetAnimationClip(Ani.PlantAPlant))
        this.clipMap.set(ActionType.Watering, asset.GetAnimationClip(Ani.Wartering))
        this.clipMap.set(ActionType.Hammering, asset.GetAnimationClip(Ani.Hammering))
        this.clipMap.set(ActionType.Building, asset.GetAnimationClip(Ani.Hammering))
        
        this.changeAnimate(this.clipMap.get(this.currentActionType))

        const box = asset.GetBox(this.meshs)
        const center = box.getCenter(new THREE.Vector3())
        this.effector.Enable(EffectType.BloodExplosion, center)


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
            currentAction.setLoop(THREE.LoopRepeat, 10000)
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
    DamageEffect(damage: number) {
        this.effector.StartEffector(EffectType.BloodExplosion)
        this.effector.StartEffector(EffectType.Status, damage.toString(), "#fff")
    }
    HealEffect(heal: number) {
        this.effector.StartEffector(EffectType.Status, "+" + heal, "#fff")
    }
    Update() {
        const delta = this.clock.getDelta()
        this.effector.Update(delta)
        this.mixer?.update(delta)
    }
}
