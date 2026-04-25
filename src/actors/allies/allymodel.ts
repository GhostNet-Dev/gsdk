import * as THREE from "three";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { IAsset } from "@Glibs/interface/iasset";
import { AllyId } from "./allytypes";
import { Effector } from "@Glibs/magical/effects/effector";
import { EffectType, GlobalEffectType } from "@Glibs/types/effecttypes";
import { Ani } from "@Glibs/types/assettypes";
import { ActionType } from "@Glibs/types/playertypes";
import IEventController from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { FloatingName } from "@Glibs/ux/text/floatingtxt";

export class AllyModel extends PhysicsObject {
    mixer?: THREE.AnimationMixer
    currentAni?: THREE.AnimationAction
    currentClip?: THREE.AnimationClip
    currentActionType = ActionType.Idle

    clipMap = new Map<ActionType, THREE.AnimationClip | undefined>()
    text: FloatingName

    get Model() { return this.asset.Id }

    constructor(
        asset: IAsset,
        private allyId: AllyId,
        private effector: Effector,
        private readonly eventCtrl: IEventController,
    ) {
        super(asset)
        this.text = new FloatingName(this.allyId.toString())
        this.effector.Enable(EffectType.Damage, 0, 1, 0)
    }

    SetOpacity(opacity: number) {
        this.meshs.traverse(child => {
            if ('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial
                material.transparent = true
                material.depthWrite = true
                material.opacity = opacity
            }
            if (opacity == 0) child.castShadow = false
            else child.castShadow = true
        })
        if (opacity > 0) this.Visible = true
        else this.Visible = false
    }

    NameView(onoff: boolean) {
        if (onoff) this.meshs.add(this.text)
        else this.meshs.remove(this.text)
    }

    async Loader(position: THREE.Vector3, text: string, id: number) {
        const [meshs] = await this.asset.UniqModel(text + id)
        this.meshs = meshs
        this.meshs.position.copy(position)

        this.meshs.remove(this.text)
        this.text.SetText(text)
        this.text.position.y = 3.5
        this.meshs.add(this.text)
        this.meshs.add(this.effector.meshs)
        this.effector.Enable(EffectType.BloodExplosion, this.CenterPos)

        this.mixer = this.asset.GetMixer(text + id)
        if (this.mixer == undefined) throw new Error("ally mixer is undefined")

        this.clipMap.set(ActionType.Idle, this.asset.GetAnimationClip(Ani.Idle))
        this.clipMap.set(ActionType.Run, this.asset.GetAnimationClip(Ani.Run))
        this.clipMap.set(ActionType.Punch, this.asset.GetAnimationClip(Ani.Punch))
        this.clipMap.set(ActionType.Dying, this.asset.GetAnimationClip(Ani.Dying))
        this.clipMap.set(ActionType.MonHurt2, this.asset.GetAnimationClip(Ani.MonHurt2))

        this.changeAnimate(this.clipMap.get(this.currentActionType))
        this.Visible = false
    }

    private changeAnimate(animate: THREE.AnimationClip | undefined, speed?: number) {
        if (animate == undefined) return
        const currentAction = this.mixer?.clipAction(animate)
        if (currentAction == undefined) return

        let fadeTime = 0.2
        this.currentAni?.fadeOut(0.2)
        if (animate == this.clipMap.get(ActionType.Dying)) {
            fadeTime = 0
            currentAction.clampWhenFinished = true
            currentAction.setLoop(THREE.LoopOnce, 1)
        } else {
            currentAction.setLoop(THREE.LoopRepeat, Infinity)
        }
        if (speed != undefined) {
            currentAction.timeScale = animate.duration / speed
        }
        currentAction.reset().fadeIn(fadeTime).play()
        this.currentAni = currentAction
        this.currentClip = animate
    }

    ChangeAction(action: ActionType, speed?: number) {
        this.currentActionType = action
        this.changeAnimate(this.clipMap.get(action), speed)
        return this.clipMap.get(action)?.duration
    }

    DamageEffect(damage: number, effect?: EffectType) {
        switch (effect) {
            case EffectType.LightningStrike:
                this.effector.StartEffector(EffectType.Damage)
                break
            default:
                this.effector.StartEffector(EffectType.BloodExplosion, this.CenterPos)
                break
        }
        this.eventCtrl.SendEventMessage(
            EventTypes.GlobalEffect,
            GlobalEffectType.FloatingText,
            this.CenterPos.clone(),
            damage > 0 ? damage.toString() : "miss",
            "#aff",
            { scale: 3.2, yOffset: 2.8 },
        )
    }

    update(delta: number) {
        this.effector.Update(delta)
        this.mixer?.update(delta)
        this.CBoxUpdate()
    }
}
