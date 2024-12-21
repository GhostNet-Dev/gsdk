import * as THREE from "three";
import { BrickGuideType } from "./brickguide";
import { BrickOption, Bricks } from "./bricks";
import IEventController from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { AppMode, EventTypes } from "@Glibs/types/globaltypes";
import { EventFlag } from "@Glibs/types/eventtypes";

export enum BrickShapeType {
    Rectangle,
    RoundCorner,
}

export class NonLegos extends Bricks {
    get Size(): THREE.Vector3 { return (this.brickGuide) ? this.brickGuide.Size : this.brickSize }

    constructor(
        scene: THREE.Scene,
        eventCtrl: IEventController,
        physics: IGPhysic,
        player: IPhysicsObject
    ) {
        super(scene, eventCtrl, physics, player, AppMode.NonLego)
        this.brickType = BrickGuideType.NonLego

        eventCtrl.RegisterEventListener(EventTypes.BrickInfo, (opt: BrickOption) => {
            this.ChangeOption(opt)
        })

        this.eventCtrl.RegisterEventListener(EventTypes.AppMode, (mode: AppMode, e: EventFlag) => {
            this.currentMode = mode
            this.deleteMode = (mode == AppMode.LegoDelete)

            if (mode == AppMode.NonLego || mode == AppMode.LegoDelete) {
                this.ChangeEvent(e)
            }
        })
        this.checkEx = () => {
            if(!this.brickGuide) return

            const bfp = new THREE.Vector3().copy(this.brickfield.position)
            bfp.x -= this.fieldWidth / 2
            bfp.z -= this.fieldHeight / 2
            const p = new THREE.Vector3().copy(this.brickGuide.position)
            const s = this.brickGuide.Size // rotatio 이 적용된 형상
            p.x -= s.x / 2
            p.z -= s.z / 2
            if ( p.x >= bfp.x && p.x <= bfp.x + this.fieldWidth &&
                p.z >= bfp.z && p.z <= bfp.z + this.fieldHeight){
                this.brickGuide.Creation = false
            } else {
                this.brickGuide.Creation = true
            }
        }
        eventCtrl.RegisterEventListener(EventTypes.SceneClear, () => {
            this.ClearBlock()
            this.ClearEventBrick()
        })
    }
    EditMode() {
        this.ClearBlock()
        //this.CreateBricks(this.store.NonLegos)
    }
    async Viliageload(): Promise<void> { }
    async Reload(): Promise<void> {
        // this.LegoStore = this.store.NonLegos
        // this.CreateBricks(this.store.NonLegos)
    }
    async Cityload(): Promise<void> {
        // this.LegoStore = this.store.CityNonlego
        // this.CreateBricks(this.store.CityNonlego)
        
    }
}