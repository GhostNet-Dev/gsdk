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

export class Legos extends Bricks {
    viliage?: THREE.InstancedMesh
    get Size(): THREE.Vector3 { return (this.brickGuide) ? this.brickGuide.Size : this.brickSize }

    constructor(
        scene: THREE.Scene,
        eventCtrl: IEventController,
        player: IPhysicsObject, 
        physics: IGPhysic,
    ) {
        super(scene, eventCtrl, physics, player, AppMode.Lego)
        this.brickType = BrickGuideType.Lego

        eventCtrl.RegisterEventListener(EventTypes.BrickInfo, (opt: BrickOption) => {
            this.ChangeOption(opt)
        })

        this.eventCtrl.RegisterEventListener(EventTypes.AppMode, (mode: AppMode, e: EventFlag) => {
            this.currentMode = mode
            this.deleteMode = (mode == AppMode.LegoDelete)

            if (mode == AppMode.Lego || mode == AppMode.LegoDelete) {
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
            if (
                p.x >= bfp.x && p.x + s.x <= bfp.x + this.fieldWidth &&
                p.z >= bfp.z && p.z + s.z <= bfp.z + this.fieldHeight){
                this.brickGuide.Creation = true
            } else {
                this.brickGuide.Creation = false
            }
        }
        eventCtrl.RegisterEventListener(EventTypes.SceneClear, () => {
            this.ClearBlock()
            this.ClearEventBrick()
            this.DeleteViliage()
        })
    }
    EditMode() {
        this.ClearBlock()
        //this.CreateBricks(this.store.Legos)
    }
    async Viliageload(): Promise<void> {
        //this.LegoStore = this.store.Legos
        //this.viliage = this.CreateInstacedMesh(this.store.Legos)
        if (this.viliage) this.scene.add(this.viliage)
    }
    async Reload(): Promise<void> {
        //this.LegoStore = this.store.Legos
        //this.CreateBricks(this.store.Legos)
    }

    DeleteViliage() {
        if (!this.viliage) return

        this.scene.remove(this.viliage)
        this.viliage.dispose()
    }
}