import * as THREE from 'three';
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { IPhysicsObject } from '@Glibs/interface/iobject';
import { DropItem } from './dropitem';
import { ItemDropOptions } from '@Glibs/types/inventypes';
import { EventTypes } from '@Glibs/types/globaltypes';
import { MonDrop } from '@Glibs/types/monstertypes';


// 플레이어에게 아이템이 끌려오는 최대 거리 설정
const MAX_DROP_DISTANCE_TO_PLAYER = 5; 

export class Drops implements ILoop {
    LoopId: number = 0;
    items: DropItem[] = []

    constructor(
        private scene: THREE.Scene,
        eventCtrl: IEventController,
        private player: IPhysicsObject,
        private options?: ItemDropOptions
    ) {
        eventCtrl.RegisterEventListener(EventTypes.Drop, (pos: THREE.Vector3, 
            drop: MonDrop[] | undefined
        ) => {
            console.log("drop =>", drop)
            this.onMonsterDeath(pos)
        })
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
    }
    update(delta: number): void {
        this.items.forEach((item, i) => {
            if(item.update((delta))) {
                this.scene.remove(item.mesh);
                this.items.slice(i, 1);
            }
        })
    }

    onMonsterDeath(monsterPosition: THREE.Vector3) {
        const itemGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const itemMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(itemGeometry, itemMaterial);
        const numberOfItems = 3 + Math.floor(Math.random() * 3);

        const distanceToPlayer = monsterPosition.distanceTo(this.player.Pos);
        const canItemsTrack = distanceToPlayer <= MAX_DROP_DISTANCE_TO_PLAYER;

        for (let i = 0; i < numberOfItems; i++) {
            const item = new DropItem(mesh, monsterPosition,
                this.player, { canTrack: canItemsTrack, ...this.options });
            this.scene.add(item.mesh);
            this.items.push(item);
        }
    }
}