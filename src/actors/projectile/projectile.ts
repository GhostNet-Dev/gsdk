import { MonsterId } from "@Glibs/types/monstertypes";
import { Bullet3 } from "./bullet3";
import { DefaultBall } from "./defaultball";
import { ProjectileCtrl } from "./projectilectrl";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { EventFlag } from "@Glibs/types/eventtypes";
import { MonsterDb } from "@Glibs/types/monsterdb";
import { BulletLine } from "./bulletline";
import { StatFactory } from "../battle/statfactory";
import { BaseSpec } from "../battle/basespec";

export interface IProjectileModel {
    get Meshs(): THREE.Mesh | THREE.Points | THREE.Line | undefined
    create(position: THREE.Vector3): void
    update(position:THREE.Vector3): void
    release(): void
}

export type ProjectileMsg = {
    id: MonsterId // TODO: Change Id Type
    ownerSpec: BaseSpec
    damage: number
    src: THREE.Vector3
    dir: THREE.Vector3
    range: number
}

export type ProjectileSet = {
    model: IProjectileModel
    ctrl: ProjectileCtrl
}

export class Projectile implements ILoop {
    LoopId = 0
    projectiles = new Map<MonsterId, ProjectileSet[]>()
    fab = new StatFactory()

    constructor(
        private eventCtrl: IEventController,
        private game: THREE.Scene,
        private targetList: THREE.Object3D[],
        private monDb: MonsterDb,
    ) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        eventCtrl.RegisterEventListener(EventTypes.Projectile, (opt: ProjectileMsg) => {
            this.AllocateProjPool(opt.id, opt.src, opt.dir, opt.damage, opt.ownerSpec, opt.range)
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
    CreateProjectile(id: MonsterId, src: THREE.Vector3, dir: THREE.Vector3, damage: number
        , ownerSpec: BaseSpec, range: number
    ) {
        const ball = this.GetModel(id)
        const stat = this.fab.getDefaultStats(id as string)
        const spec = new BaseSpec(stat)
        const ctrl = new ProjectileCtrl(ball, this.targetList, this.eventCtrl, range, spec)
        ctrl.start(src, dir, damage, ownerSpec)

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
    AllocateProjPool(id: MonsterId, src: THREE.Vector3, dir: THREE.Vector3, damage: number, ownerSpec: BaseSpec, range: number) {
        let pool = this.projectiles.get(id)
        if(!pool) pool = []
        let set = pool.find((e) => e.ctrl.Live == false)
        if (!set) {
            set = this.CreateProjectile(id, src, dir, damage, ownerSpec, range)
            pool.push(set)
        } else {
            set.ctrl.start(src, dir, damage, ownerSpec)
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