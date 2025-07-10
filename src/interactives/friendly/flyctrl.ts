import * as THREE from "three";
import { Fly } from "./fly";
import { IFlyCtrl } from "./friendly";
import { AttackFState, DyingFState, IdleFState, RunFState } from "./friendlystate";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { MonsterProperty } from "@Glibs/types/monstertypes";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { IMonsterAction } from "@Glibs/interface/imonsters";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BaseSpec } from "@Glibs/actors/battle/basespec";
import { StatKey } from "@Glibs/types/stattypes";
import { ActionContext, IActionComponent, IActionUser } from "@Glibs/types/actiontypes";


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
    Release(): void {
    }

    update(delta: number): void {
        if (!this.fly.Visible) return
        const dist = this.fly.Pos.distanceTo(this.player.Pos)
        this.dir.subVectors(this.player.CenterPos, this.fly.CenterPos)
        this.moveDirection.copy(this.dir)

        /*
        if (this.target && this.fly.CannonPos.distanceTo(this.target.CannonPos)) { // attack 
        }
        if (this.fly.CannonPos.distanceTo(this.player.CannonPos)) { // two far 
        }
        */
        this.currentState = this.currentState.Update(delta, this.moveDirection, dist)
        this.fly.update(delta)
        
    }
    Respawning(): void {
        
    }
}