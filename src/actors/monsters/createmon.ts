import * as THREE from "three";
import { MonsterSet } from "./monsters"
import { Zombie } from "./zombie"
import { MonsterCtrl } from "./monctrl"
import { MonsterDb } from "./monsterdb"
import { IPhysicsObject } from "@Glibs/interface/iobject";
import IEventController from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { MonsterId } from "./monstertypes";
import { Effector } from "@Glibs/magical/effects/effector";
import { Loader } from "@Glibs/loader/loader";
import { StatFactory } from "../battle/statfactory";

export class CreateMon {
    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private player: IPhysicsObject,
        private gphysic: IGPhysic,
        private game: THREE.Scene,
        private monDb: MonsterDb,
    ) {
    }
    async Call(monId: MonsterId, id: number, pos?: THREE.Vector3): Promise<MonsterSet> {
        const stat = StatFactory.getDefaultStats(monId as string)
        
        if(!pos) pos = new THREE.Vector3(10, 0, 15)
        const property = this.monDb.GetItem(monId)
        const asset = this.loader.GetAssets(property.model)
        const monster = new Zombie(asset, monId, new Effector(this.game, this.eventCtrl))
        await monster.Loader(pos, monId as string, id)

        const zCtrl = new MonsterCtrl(id, this.player, monster, 
            this.gphysic, this.eventCtrl, property, stat)
        const monSet: MonsterSet =  { 
            monModel: monster, monCtrl: zCtrl, live: true, respawn: false, deadtime: new Date().getTime()
        }
        return monSet
    }
}