import * as THREE from "three";
import { PhysicsObject } from "@Glibs/interface/iobject";
import { IAsset } from "@Glibs/interface/iasset";
import { MonsterId } from "../monstertypes";
import { Effector } from "@Glibs/magical/effects/effector";
import { FloatingName } from "@Glibs/ux/text/floatingtxt";
import { EffectType } from "@Glibs/types/effecttypes";
import { Ani } from "@Glibs/types/assettypes";
import { ActionType } from "@Glibs/types/playertypes";

export class Zombie extends PhysicsObject {
    mixer?: THREE.AnimationMixer
    currentAni?: THREE.AnimationAction
    currentClip?: THREE.AnimationClip

    idleClip?: THREE.AnimationClip
    runClip?: THREE.AnimationClip
    punchingClip?: THREE.AnimationClip
    dyingClip?: THREE.AnimationClip

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
        
        this.idleClip = this.asset.GetAnimationClip(Ani.Idle)
        this.runClip = this.asset.GetAnimationClip(Ani.Run)
        this.punchingClip = this.asset.GetAnimationClip(Ani.Punch)
        this.dyingClip = this.asset.GetAnimationClip(Ani.Dying)
        this.changeAnimate(this.idleClip)

        this.Visible = false

    }
    changeAnimate(animate: THREE.AnimationClip | undefined, ) {
        if (animate == undefined) return

        const currentAction = this.mixer?.clipAction(animate)
        if (currentAction == undefined) return

        let fadeTime = 0.2
        this.currentAni?.fadeOut(0.2)
        if (animate == this.dyingClip) {
            fadeTime = 0
            currentAction.clampWhenFinished = true
            currentAction.setLoop(THREE.LoopOnce, 1)
        } else {
            currentAction.setLoop(THREE.LoopRepeat, Infinity)
        }
        currentAction.reset().fadeIn(fadeTime).play()

        this.currentAni = currentAction
        this.currentClip = animate
    }
    StopAnimation() {
        this.currentAni?.stop()
    }
    ChangeAction(action: ActionType) {
        let clip: THREE.AnimationClip | undefined
        switch(action) {
            case ActionType.Idle:
                clip = this.idleClip
                break
            case ActionType.Run:
                clip = this.runClip
                break
            case ActionType.Punch:
                clip = this.punchingClip
                break
            case ActionType.Dying:
                clip = this.dyingClip
                break

        }
        this.changeAnimate(clip)
        return clip?.duration
    }
    clock = new THREE.Clock()
    flag = false

    DamageEffect(damage: number, effect?: EffectType) {
        switch(effect) {
            case EffectType.Damage:
            default:
                //this.effector.StartEffector(EffectType.Lightning)
                this.effector.StartEffector(EffectType.BloodExplosion)
                break;
            case EffectType.LightningStrike:
                this.effector.StartEffector(EffectType.Damage)
                //this.effector.StartEffector(EffectType.Lightning)
                break;
        }
        this.effector.StartEffector(EffectType.Status, damage.toString(), "#fff")
    }

    update(delta: number) {
        this.effector.Update(delta)
        this.mixer?.update(delta)
        this.CBoxUpdate()
    }
}