import * as THREE from "three";
import { Loader } from "../../loader/loader";
import { Fly } from "./fly";
import { FlyCtrl } from "./flyctrl";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { MonsterId } from "@Glibs/types/monstertypes";
import { AppMode, EventTypes } from "@Glibs/types/globaltypes";
import IEventController from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { MonsterDb } from "@Glibs/types/monsterdb";
import { EventFlag } from "@Glibs/types/eventtypes";
import { StatFactory } from "@Glibs/actors/battle/statfactory";
import { BaseSpec } from "@Glibs/actors/battle/basespec";

export type FriendlySet = {
    friendlyModel: IPhysicsObject,
    friendlyCtrl: IFlyCtrl
    live: boolean
    respawn: boolean
    deadtime: number
    initPos?: THREE.Vector3
}
export interface IFlyCtrl {
    Respawning(): void
    Release(): void
}
export class Friendly {
    fab = new StatFactory()
    friendly = new Map<MonsterId, FriendlySet>()
    mode = AppMode.Close

    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private gphysic: IGPhysic,
        private game: THREE.Scene,
        private player: IPhysicsObject,
        private targetList: THREE.Object3D[],
        private monDb: MonsterDb,
    ) { 
        eventCtrl.RegisterEventListener(EventTypes.AppMode, (mode: AppMode, e: EventFlag) => {
            this.mode = mode
            if(mode != AppMode.Play) return
            switch (e) {
                case EventFlag.Start:
                    //this.InitMonster()
                    break
                case EventFlag.End:
                    this.Release()
                    break
            }
        })
    }

    Release() {
        this.friendly.forEach(s => {
            s.friendlyModel.Meshs.visible = false
            s.friendlyCtrl.Release()
            this.game.remove(s.friendlyModel.Meshs)
        })
    }

    async CreateFriendly(id: MonsterId, pos?: THREE.Vector3) {
        if (!pos) pos = new THREE.Vector3(10, 0, 15)
        const property = this.monDb.GetItem(id)
        const asset = this.loader.GetAssets(property.model)
        const friendly = new Fly(asset, id as string)
        await friendly.Loader(pos)

        const stat = this.fab.getDefaultStats(id as string)
        const spec = new BaseSpec(stat)

        const zCtrl = new FlyCtrl(friendly, this.player, this.targetList,
            this.gphysic, this.eventCtrl, property, spec)
        const monSet: FriendlySet =  { 
            friendlyModel: friendly, friendlyCtrl: zCtrl, live: true, respawn: false, deadtime: new Date().getTime()
        }
        this.friendly.set(id, monSet)
        this.game.add(friendly.Meshs)
    }
}