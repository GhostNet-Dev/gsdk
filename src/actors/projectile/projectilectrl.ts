import * as THREE from "three";
import { AttackType, PlayerCtrl } from "@Player/playerctrl";
import { MonsterProperty } from "@Monsters/monsterdb";
import { EventController } from "@Event/eventctrl";
import { IProjectileModel } from "./projectile";



export class ProjectileCtrl {
    raycast = new THREE.Raycaster()
    moveDirection = new THREE.Vector3()
    position = new THREE.Vector3()
    attackDist = 2
    maxTarget = 1
    lifetime = 5 // time
    currenttime = 0
    live = false
    damage = 1
    get Live() { return this.live }
    
    constructor(
        private projectile: IProjectileModel,
        private playerCtrl: PlayerCtrl,
        private eventCtrl: EventController,
        private property: MonsterProperty,
    ){
    }
    Release () {
        this.projectile.release()
        this.live = false
    }
    start(src: THREE.Vector3, dir: THREE.Vector3, damage: number) {
        this.position.copy(src)
        this.moveDirection.copy(dir)
        this.projectile.create(src)
        this.live = true
        this.currenttime = 0
        this.damage = damage
    }
    checkLifeTime(): boolean {
        return (this.currenttime < this.lifetime)
    }
    update(delta: number): void {
        if (!this.live) return
        this.currenttime += delta
        this.position.addScaledVector(this.moveDirection, this.property.speed * delta);

        this.projectile.update(this.position)
    }
    attack() {
        if (!this.live) return false
        const msgs = new Map()
        this.playerCtrl.targets.forEach(obj => {
            const dist = obj.position.distanceTo(this.position)
            if(this.attackDist < dist) return
            const mons = msgs.get(obj.name)
                const msg = {
                        type: AttackType.NormalSwing,
                        damage: this.damage,
                        obj: obj
                    }
                if(mons == undefined) {
                    msgs.set(obj.name, [msg])
                } else {
                    mons.push(msg)
                }
        })
        if (msgs.size > 0) {
            msgs.forEach((v, k) => {
                this.eventCtrl.OnAttackEvent(k, v)
            })
            return true
        }
        
        return false
    }
}