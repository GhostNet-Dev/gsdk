import * as THREE from "three";
import { Loader } from "@Loader/loader"
import { MonsterSet } from "./monsters"
import { EventController } from "@Event/eventctrl"
import { Player } from "@Player/player"
import { GPhysics } from "@Commons/physics/gphysics"
import { Zombie } from "./zombie/zombie"
import { MonsterCtrl } from "./zombie/monctrl"
import { MonsterDb } from "./monsterdb"
import { MonsterId } from "./monsterid";
import { Effector } from "@Effector/effector";

export class CreateMon {
    constructor(
        private loader: Loader,
        private eventCtrl: EventController,
        private player: Player,
        private instanceBlock: (THREE.InstancedMesh | undefined)[],
        private meshBlock: THREE.Mesh[],
        private gphysic: GPhysics,
        private game: THREE.Scene,
        private monDb: MonsterDb,
    ) {
    }
    async Call(monId: MonsterId, id: number, pos?: THREE.Vector3): Promise<MonsterSet> {
        if(!pos) pos = new THREE.Vector3(10, 0, 15)
        const property = this.monDb.GetItem(monId)
        const asset = this.loader.GetAssets(property.model)
        const monster = new Zombie(asset, monId, new Effector(this.game))
        await monster.Loader(pos, monId as string, id)

        const zCtrl = new MonsterCtrl(id, this.player, monster, 
            this.instanceBlock, this.meshBlock, this.gphysic, this.eventCtrl, property)
        const monSet: MonsterSet =  { 
            monModel: monster, monCtrl: zCtrl, live: true, respawn: false, deadtime: new Date().getTime()
        }
        return monSet
    }
}