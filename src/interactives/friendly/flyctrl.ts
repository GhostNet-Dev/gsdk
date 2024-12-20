import * as THREE from "three";
import { GPhysics, IGPhysic } from "../../common/physics/gphysics";
import { IPhysicsObject } from "../models/iobject";
import { MonsterProperty } from "../monsters/monsterdb";
import { Player } from "../player/player";
import { Fly } from "./fly";
import { IFlyCtrl } from "./friendly";
import { AttackFState, DyingFState, IdleFState, RunFState } from "./friendlystate";
import { IMonsterAction } from "../monsters/monsters";
import { PlayerCtrl } from "../player/playerctrl";
import { EventController } from "../../event/eventctrl";


export class FlyCtrl implements IGPhysic, IFlyCtrl {
    IdleSt = new IdleFState(this, this.fly, this.playerCtrl, this.gphysic)
    AttackSt = new AttackFState(this, this.fly, this.gphysic, this.playerCtrl, this.eventCtrl, this.property)
    RunSt = new RunFState(this, this.fly, this.gphysic, this.property)
    DyingSt = new DyingFState(this, this.fly, this.gphysic)

    currentState: IMonsterAction = this.IdleSt
    target? :IPhysicsObject
    dir = new THREE.Vector3(0, 0, 0)
    moveDirection = new THREE.Vector3()

    constructor(
        private fly: Fly, 
        private player: Player,
        private playerCtrl: PlayerCtrl,
        private gphysic: GPhysics,
        private eventCtrl: EventController,
        private property: MonsterProperty
    ) {
        this.Init()
    }

    Init() {
        this.gphysic.Register(this)
    }
    Release() {
        this.gphysic.Deregister(this)
    }
    update(delta: number): void {
        if (!this.fly.Visible) return
        const dist = this.fly.CannonPos.distanceTo(this.player.CannonPos)
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