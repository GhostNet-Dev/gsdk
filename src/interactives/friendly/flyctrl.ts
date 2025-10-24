import * as THREE from "three";
import { Fly } from "./fly";
import { IFlyCtrl } from "./friendly";
import { AttackFState, DyingFState, IdleFState, RunFState } from "./states/friendlystate";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { MonsterProperty } from "@Glibs/types/monstertypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { StatKey } from "@Glibs/types/stattypes";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";
import { IMonsterAction } from "@Glibs/actors/monsters/monstertypes";


export class FlyCtrl implements ILoop, IFlyCtrl, IActionUser {
    LoopId = 0
    baseSpec: BaseSpec = new BaseSpec(this.stats, this)
    IdleSt = new IdleFState(this, this.fly, this.targetList, this.gphysic)
    AttackSt = new AttackFState(this, this.fly, this.gphysic, this.targetList, this.eventCtrl, this.property, this.baseSpec)
    RunSt = new RunFState(this, this.fly, this.gphysic, this.property, this.baseSpec)
    DyingSt = new DyingFState(this, this.fly, this.gphysic)

    currentState: IMonsterAction = this.IdleSt
    target? :IPhysicsObject
    dir = new THREE.Vector3(0, 0, 0)
    moveDirection = new THREE.Vector3()
    get objs() { return this.fly.Meshs }

    constructor(
        private fly: Fly, 
        private player: IPhysicsObject,
        private targetList: THREE.Object3D[],
        private gphysic: IGPhysic,
        private eventCtrl: IEventController,
        private property: MonsterProperty,
        private stats: Partial<Record<StatKey, number>>,
    ) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }
    applyAction(action: IActionComponent, ctx?: ActionContext) {
        action.apply?.(this, ctx)
        action.activate?.(this, ctx)
    }
    removeAction(action: IActionComponent, context?: ActionContext | undefined): void {
        action.deactivate?.(this, context)
        action.remove?.(this)
    }
    Release(): void {
    }

    update(delta: number): void {
        if (!this.fly.Visible) return
        const dist = this.fly.Pos.distanceTo(this.player.Pos)
        this.dir.subVectors(this.player.CenterPos, this.fly.CenterPos)
        this.moveDirection.copy(this.dir)

        this.currentState = this.currentState.Update(delta, this.moveDirection, this.player)
        this.fly.update(delta)
        
    }
    Respawning(): void {
        
    }
}