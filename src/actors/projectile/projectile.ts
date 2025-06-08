import { MonsterId } from "@Glibs/types/monstertypes";
import { Bullet3 } from "./bullet3";
import { DefaultBall } from "./defaultball";
import { ProjectileCtrl } from "./projectilectrl";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { EventFlag } from "@Glibs/types/eventtypes";
import { MonsterDb } from "@Glibs/types/monsterdb";
import { BulletLine } from "./bulletline";

export interface IProjectileModel {
    get Meshs(): THREE.Mesh | THREE.Points | THREE.Line | undefined
    create(position: THREE.Vector3): void
    update(position:THREE.Vector3): void
    release(): void
}

export type ProjectileMsg = {
    id: MonsterId // TODO: Change Id Type
    damage: number
    src: THREE.Vector3
    dir: THREE.Vector3
}

export type ProjectileSet = {
    model: IProjectileModel
    ctrl: ProjectileCtrl
}

export class Projectile implements ILoop {
    LoopId = 0
    projectiles = new Map<MonsterId, ProjectileSet[]>()

    constructor(
        private eventCtrl: IEventController,
        private game: THREE.Scene,
        private targetList: THREE.Object3D[],
        private monDb: MonsterDb,
    ) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        eventCtrl.RegisterEventListener(EventTypes.Projectile, (opt: ProjectileMsg) => {
            this.AllocateProjPool(opt.id, opt.src, opt.dir, opt.damage)
        })
    }
    
    GetModel(id: MonsterId) {
        switch(id) {
            case MonsterId.DefaultBullet:
                return new Bullet3()
            case MonsterId.BulletLine:
                return new BulletLine()
            case MonsterId.DefaultBall:
            default:
                return new DefaultBall(.1)
        }
    }
    CreateProjectile(id: MonsterId, src: THREE.Vector3, dir: THREE.Vector3, damage: number) {
        const property = this.monDb.GetItem(id)
        const ball = this.GetModel(id)
        const ctrl = new ProjectileCtrl(ball, this.targetList, this.eventCtrl, property)
        ctrl.start(src, dir, damage)

        const set: ProjectileSet = {
            model: ball, ctrl: ctrl
        }
        return set
    }
    update(delta: number): void {
        this.projectiles.forEach(a => {
            a.forEach(s => {
                s.ctrl.update(delta)
                if (s.ctrl.attack() || !s.ctrl.checkLifeTime()) {
                    this.Release(s)
                }
            })
        })
    }
    resize(): void { }

    Release(entry: ProjectileSet) {
        if (entry.model.Meshs) this.game.remove(entry.model.Meshs)
        entry.ctrl.Release()
    }
    AllocateProjPool(id: MonsterId, src: THREE.Vector3, dir: THREE.Vector3, damage: number) {
        let pool = this.projectiles.get(id)
        if(!pool) pool = []
        let set = pool.find((e) => e.ctrl.Live == false)
        if (!set) {
            set = this.CreateProjectile(id, src, dir, damage)
            pool.push(set)
        } else {
            set.ctrl.start(src, dir, damage)
        }
        this.projectiles.set(id, pool)
        if (set.model.Meshs) this.game.add(set.model.Meshs)
        return set
    }
    ReleaseAllProjPool() {
        this.projectiles.forEach(a => {
            a.forEach(s => {
                s.ctrl.Release()
                if (s.model.Meshs) this.game.remove(s.model.Meshs)
            })
        })
    }
    async NewFurnEntryPool() {
    }
}