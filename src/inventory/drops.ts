import * as THREE from 'three';
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { DropItem } from './dropitem';
import { ItemDropOptions } from '@Glibs/types/inventypes';
import { EventTypes } from '@Glibs/types/globaltypes';
import { MonDrop } from '@Glibs/types/monstertypes';
import { ItemId, itemDefs } from './items/itemdefs';
import { Loader } from '@Glibs/loader/loader';
import { Char } from '@Glibs/types/assettypes';
import { StatKey } from '@Glibs/inventory/stat/stattypes';


// 플레이어에게 아이템이 끌려오는 최대 거리 설정
const MAX_DROP_DISTANCE_TO_PLAYER = 5; 

export class Drops implements ILoop {
    LoopId: number = 0;
    items: DropItem[] = []

    constructor(
        private loader: Loader,
        private scene: THREE.Scene,
        private eventCtrl: IEventController,
        private player: IPhysicsObject,
        private options?: ItemDropOptions
    ) {
        eventCtrl.RegisterEventListener(EventTypes.Drop, (pos: THREE.Vector3, 
            drop: MonDrop[] | undefined
        ) => {
            if (drop && drop.length > 0) {
                drop.forEach(async (item) => {
                    const ticket = Math.random()
                    const luck = this.getPlayerStatBonus("luck", 1)
                    const luckDropMultiplier = 1 + Math.max(0, luck - 1) * 0.03
                    const finalRatio = Math.min(1, item.ratio * luckDropMultiplier)
                    if (finalRatio < ticket) return

                    const itemPros = itemDefs[item.itemId]
                    console.log("drop =>", drop)
                    const modelKey = ("assetDrop" in itemPros) ? itemPros.assetDrop : undefined
                    await this.onMonsterDeath(pos, item, modelKey)
                })
            }
        })
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }

    private getPlayerStatBonus(stat: StatKey, fallback = 1): number {
        const v = (this.player as any)?.baseSpec?.stats?.getStat?.(stat)
        if (typeof v !== 'number' || Number.isNaN(v)) return fallback
        return Math.max(0, v)
    }


    private buildMagnetizedDropOptions(): ItemDropOptions {
        const magnet = this.getPlayerStatBonus("itemDropRate", 1)
        const clamped = Math.max(1, magnet)

        return {
            ...(this.options ?? {}),
            acquisitionRange: (this.options?.acquisitionRange ?? 1) * clamped,
            maxTrackingDistance: (this.options?.maxTrackingDistance ?? 8) * clamped,
        }
    }

    update(delta: number): void {
        this.items = this.items.filter((item) => {
            if(item.update(delta)) {
                this.eventCtrl.SendEventMessage(EventTypes.Pickup, item.drop)
                this.scene.remove(item.mesh);
                return false
            }
            return true
        })
    }

    async onMonsterDeath(monsterPosition: THREE.Vector3, drop: MonDrop, assetKey?: Char) {
        const itemId = drop.itemId
        let mesh: THREE.Mesh | THREE.Group

        if (assetKey) {
            const asset = this.loader.GetAssets(assetKey)
            mesh = await asset.CloneModel()
        } else {
            const itemGeometry = new THREE.SphereGeometry(0.2, 16, 16);
            const itemMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            mesh = new THREE.Mesh(itemGeometry, itemMaterial);
            mesh.receiveShadow = true
        }

        const item = new DropItem(mesh, monsterPosition,
            this.player, drop, this.buildMagnetizedDropOptions());
        this.scene.add(item.mesh);
        this.items.push(item);
    }
}