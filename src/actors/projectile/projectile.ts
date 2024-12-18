import { Canvas } from "@Commons/canvas";
import { EventController, EventFlag } from "@Event/eventctrl";
import { Loader } from "@Loader/loader";
import { IViewer } from "@Models/iviewer";
import { MonsterDb } from "@Monsters/monsterdb";
import { MonsterId } from "@Monsters/monsterid";
import { PlayerCtrl } from "@Player/playerctrl";
import { Bullet3 } from "./bullet3";
import { DefaultBall } from "./defaultball";
import { ProjectileCtrl } from "./projectilectrl";

export interface IProjectileModel {
    get Meshs(): THREE.Mesh | THREE.Points | undefined
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

export class Projectile implements IViewer {
    projectiles = new Map<MonsterId, ProjectileSet[]>()
    processing = false

    constructor(
        _: Loader,
        canvas: Canvas,
        private eventCtrl: EventController,
        private game: THREE.Scene,
        private playerCtrl: PlayerCtrl,
        private monDb: MonsterDb,
    ) {
        canvas.RegisterViewer(this)
        eventCtrl.RegisterPlayModeEvent((e: EventFlag) => {
            switch (e) {
                case EventFlag.Start:
                    this.processing = true
                    //this.InitMonster()
                    break
                case EventFlag.End:
                    this.processing = false
                    this.ReleaseAllProjPool()
                    break
            }
        })
        eventCtrl.RegisterProjectileEvent((opt: ProjectileMsg) => {
                this.AllocateProjPool(opt.id, opt.src, opt.dir, opt.damage)
        })
    }
    
    GetModel(id: MonsterId) {
        switch(id) {
            case MonsterId.DefaultBullet:
                return new Bullet3()
            case MonsterId.DefaultBall:
            default:
                return new DefaultBall(.1)
        }
    }
    CreateProjectile(id: MonsterId, src: THREE.Vector3, dir: THREE.Vector3, damage: number) {
        const property = this.monDb.GetItem(id)
        const ball = this.GetModel(id)
        const ctrl = new ProjectileCtrl(ball, this.playerCtrl, this.eventCtrl, property)
        ctrl.start(src, dir, damage)

        const set: ProjectileSet = {
            model: ball, ctrl: ctrl
        }
        return set
    }
    update(delta: number): void {
        if (!this.processing) return
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
        entry.ctrl.Release()
        if (entry.model.Meshs) this.game.remove(entry.model.Meshs)
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