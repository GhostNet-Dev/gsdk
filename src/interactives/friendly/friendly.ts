import * as THREE from "three";
import { Loader } from "../../loader/loader";
import { Game } from "../game";
import { Player } from "../player/player";
import { Fly } from "./fly";
import { FlyCtrl } from "./flyctrl";
import { IPhysicsObject } from "../models/iobject";
import { GPhysics } from "../../common/physics/gphysics";
import { MonsterDb } from "../monsters/monsterdb";
import { MonsterId } from "../monsters/monsterid";
import { EventController, EventFlag } from "../../event/eventctrl";
import { PlayerCtrl } from "../player/playerctrl";
import { AppMode } from "../../app";

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
    friendly = new Map<MonsterId, FriendlySet>()
    mode = AppMode.Close

    constructor(
        private loader: Loader,
        private eventCtrl: EventController,
        private gphysic: GPhysics,
        private game: Game,
        private player: Player,
        private playerCtrl: PlayerCtrl,
        private monDb: MonsterDb,
    ) { 
        eventCtrl.RegisterAppModeEvent((mode: AppMode, e: EventFlag) => {
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

        const zCtrl = new FlyCtrl(friendly, this.player, this.playerCtrl,
            this.gphysic, this.eventCtrl, property)
        const monSet: FriendlySet =  { 
            friendlyModel: friendly, friendlyCtrl: zCtrl, live: true, respawn: false, deadtime: new Date().getTime()
        }
        this.friendly.set(id, monSet)
        this.game.add(friendly.Meshs)
    }
}