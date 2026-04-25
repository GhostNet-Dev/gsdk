import * as THREE from "three";
import { AllySet } from "./allytypes";
import { AllyId } from "./allytypes";
import { AllyModel } from "./allymodel";
import { AllyCtrl } from "./allyctrl";
import { AllyDb } from "./allydb";
import IEventController from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { Effector } from "@Glibs/magical/effects/effector";
import { Loader } from "@Glibs/loader/loader";
import { StatFactory } from "@Glibs/actors/battle/statfactory";

export class CreateAlly {
    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private gphysic: IGPhysic,
        private game: THREE.Scene,
        private allyDb: AllyDb,
    ) { }

    async Call(allyId: AllyId, id: number, deckLevel: number, pos?: THREE.Vector3): Promise<AllySet> {
        const property = this.allyDb.GetItem(allyId)
        const baseStats = property.stats ?? {}
        const stat = StatFactory.getScaledStats(baseStats, deckLevel)

        if (!pos) pos = new THREE.Vector3(0, 0, 0)
        const asset = this.loader.GetAssets(property.model)
        const allyModel = new AllyModel(asset, allyId, new Effector(this.game, this.eventCtrl), this.eventCtrl)
        await allyModel.Loader(pos, allyId as string, id)

        const allyCtrl = new AllyCtrl(id, deckLevel, allyModel, this.gphysic, this.eventCtrl, property, stat)
        const allySet: AllySet = {
            allyModel,
            allyCtrl,
            live: true,
            deckLevel,
            deadtime: Date.now(),
        }
        return allySet
    }
}
