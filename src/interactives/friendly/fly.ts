import * as THREE from "three";
import { Ani, IAsset } from "../../loader/assetmodel";
import { GhostModel } from "../models/ghostmodel";
import { IPhysicsObject } from "../models/iobject";
import { ActionType } from "../player/player";

export class Fly extends GhostModel implements IPhysicsObject { 
    mixer?: THREE.AnimationMixer
    currentAni?: THREE.AnimationAction
    currentClip?: THREE.AnimationClip

    idleClip?: THREE.AnimationClip
    runClip?: THREE.AnimationClip
    punchingClip?: THREE.AnimationClip
    dyingClip?: THREE.AnimationClip

    get BoxPos() { return this.asset.GetBoxPos(this.meshs) }

    constructor (
        asset: IAsset,
        private name: string,
    ) {
        super(asset)
    }
    async Loader(position: THREE.Vector3) {
        const [meshs, _] = await this.asset.UniqModel(this.name)
        
        this.meshs = meshs

        this.meshs.position.copy(position)

        if (this.text != undefined) {
            this.meshs.remove(this.text)
        }


        this.mixer = this.asset.GetMixer(this.name)
        if (this.mixer == undefined) throw new Error("mixer is undefined");
        
        this.idleClip = this.asset.GetAnimationClip(Ani.Idle)
        this.runClip = this.asset.GetAnimationClip(Ani.Run)
        this.punchingClip = this.asset.GetAnimationClip(Ani.Punch)
        this.dyingClip = this.asset.GetAnimationClip(Ani.Dying)
        this.changeAnimate(this.idleClip)

        this.Visible = true
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
            currentAction.setLoop(THREE.LoopRepeat, 10000)
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
    update(delta: number): void {
        this.mixer?.update(delta)
    }
}