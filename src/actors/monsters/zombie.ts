import * as THREE from "three";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { IAsset } from "@Glibs/interface/iasset";
import { MonsterId } from "./monstertypes";
import { Effector } from "@Glibs/magical/effects/effector";
import { FloatingName } from "@Glibs/ux/text/floatingtxt";
import { EffectType } from "@Glibs/types/effecttypes";
import { Ani } from "@Glibs/types/assettypes";
import { ActionType } from "@Glibs/types/playertypes";

export class Zombie extends PhysicsObject {
    mixer?: THREE.AnimationMixer
    currentAni?: THREE.AnimationAction
    currentClip?: THREE.AnimationClip
    currentActionType = ActionType.Idle

    clipMap = new Map<ActionType, THREE.AnimationClip | undefined>()

    private controllerEnable: boolean = false

    movePos = new THREE.Vector3()
    vFlag = true
    text: FloatingName

    get Model() { return this.asset.Id }
    set ControllerEnable(flag: boolean) { this.controllerEnable = flag }
    get ControllerEnable(): boolean { return this.controllerEnable }

    constructor(
        asset: IAsset,
        private monId: MonsterId,
        private effector: Effector
    ) {
        super(asset)
        this.text = new FloatingName(this.monId.toString())
        this.effector.Enable(EffectType.Damage, 0, 1, 0)
        this.effector.Enable(EffectType.Status)
    }

    async Init(text: string) {
        if(this.text == undefined) return
        this.text.SetText(text)
        this.text.position.y = 3.5
    }

    SetOpacity(opacity: number) {
        this.meshs.traverse(child => {
            if('material' in child) {
                const material = child.material as THREE.MeshStandardMaterial
                material.transparent = true;
                material.depthWrite = true;
                material.opacity = opacity;
            }
            if (opacity == 0) child.castShadow = false
            else child.castShadow = true
        })
        if(opacity > 0) this.Visible = true
        else this.Visible = false
    }
    NameView(onoff: boolean) {
        if (onoff)
            this.meshs.add(this.text)
        else
            this.meshs.remove(this.text)
    }

    async Loader(position: THREE.Vector3, text: string, id: number) {
        const [meshs, _exist] = await this.asset.UniqModel(text + id)
        
        this.meshs = meshs

        this.meshs.position.copy(position)

        if (this.text != undefined) {
            this.meshs.remove(this.text)
        }

        if (this.text != undefined) {
            this.text.SetText(text)
            this.text.position.y = 3.5
            this.meshs.add(this.text)
        }
        this.meshs.add(this.effector.meshs)
        this.effector.Enable(EffectType.BloodExplosion, this.CenterPos)

        this.mixer = this.asset.GetMixer(text + id)
        if (this.mixer == undefined) throw new Error("mixer is undefined");
        
        this.clipMap.set(ActionType.Idle, this.asset.GetAnimationClip(Ani.Idle))
        this.clipMap.set(ActionType.Run, this.asset.GetAnimationClip(Ani.Run))
        this.clipMap.set(ActionType.Punch, this.asset.GetAnimationClip(Ani.Punch))
        this.clipMap.set(ActionType.Dying, this.asset.GetAnimationClip(Ani.Dying))

        this.clipMap.set(ActionType.MonBiteNeck, this.asset.GetAnimationClip(Ani.MonBiteNeck))
        this.clipMap.set(ActionType.MonAgonizing, this.asset.GetAnimationClip(Ani.MonAgonizing))
        this.clipMap.set(ActionType.MonRunningCrawl, this.asset.GetAnimationClip(Ani.MonRunningCrawl))
        this.changeAnimate(this.clipMap.get(this.currentActionType))

        this.Visible = false

    }
    changeAnimate(animate: THREE.AnimationClip | undefined, speed?: number) {
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
        if(speed != undefined) {
            currentAction.timeScale = animate.duration / speed
        }
        currentAction.reset().fadeIn(fadeTime).play()

        this.currentAni = currentAction
        this.currentClip = animate
    }
    StopAnimation() {
        this.currentAni?.stop()
    }
    ChangeAction(action: ActionType, speed?: number) {
        let clip: THREE.AnimationClip | undefined
        this.currentActionType = action
        this.changeAnimate(this.clipMap.get(action), speed)
        return clip?.duration
    }
    clock = new THREE.Clock()
    flag = false

    stunEffect() {
        // 타격 시 애니메이션 일시 정지
        if (this.currentAni) {
            this.currentAni.paused = true

            // 예: 0.5초 후 다시 재생
            setTimeout(() => {
                this.currentAni!.paused = false
            }, 500)
        }
    }
    DamageEffect(damage: number, effect?: EffectType) {
        switch(effect) {
            case EffectType.Damage:
            default:
                //this.effector.StartEffector(EffectType.Lightning)
                this.effector.StartEffector(EffectType.BloodExplosion, this.CenterPos)
                break;
            case EffectType.LightningStrike:
                this.effector.StartEffector(EffectType.Damage)
                //this.effector.StartEffector(EffectType.Lightning)
                break;
        }
        this.effector.StartEffector(EffectType.Status, (damage > 0) ? damage.toString() : "miss", "#fff")
    }

    update(delta: number) {
        this.effector.Update(delta)
        this.mixer?.update(delta)
        this.CBoxUpdate()
    }
}