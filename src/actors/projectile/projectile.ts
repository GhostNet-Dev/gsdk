import { MonsterId } from "@Glibs/types/monstertypes";
import { Bullet3 } from "./bullet3";
import { DefaultBall } from "./defaultball";
import { ProjectileCtrl } from "./projectilectrl";
import IEventController, { ILoop } from "@Glibs/interface/ievent";
import { EventTypes } from "@Glibs/types/globaltypes";
import { BulletLine } from "./bulletline";
import { StatFactory } from "../battle/statfactory";
import { BaseSpec } from "../battle/basespec";
import { FireballModel } from "./fireballmodel";
import { KnifeModel } from "./knifemodel";
import { Loader } from "@Glibs/loader/loader";
import { Char } from "@Glibs/types/assettypes";

export interface IProjectileModel {
    get Meshs(): THREE.Mesh | THREE.Object3D | THREE.Points | THREE.Line | undefined
    create(position: THREE.Vector3, direction?: THREE.Vector3): void
    update(position: THREE.Vector3): void
    release(): void
    init?(): Promise<void>
}

type ReleaseAnimatedProjectile = IProjectileModel & {
    updateRelease?: (delta: number) => void
    isReleaseFinished?: () => boolean
}

export type ProjectileMsg = {
    id: MonsterId 
    ownerSpec: BaseSpec
    damage: number
    src: THREE.Vector3
    dir: THREE.Vector3
    range: number
}

export type ProjectileSet = {
    model: IProjectileModel
    ctrl: ProjectileCtrl
    releasing: boolean
}

export class Projectile implements ILoop {
    LoopId = 0
    projectiles = new Map<MonsterId, ProjectileSet[]>()

    constructor(
        private eventCtrl: IEventController,
        private game: THREE.Scene,
        private targetList: THREE.Object3D[],
        private loader?: Loader,
    ) {
        eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
        eventCtrl.RegisterEventListener(EventTypes.Projectile, (opt: ProjectileMsg) => {
            this.AllocateProjPool(opt.id, opt.src, opt.dir, opt.damage, opt.ownerSpec, opt.range)
        })
    }
    
    GetModel(id: MonsterId): IProjectileModel {
        switch(id) {
            case MonsterId.DefaultBullet:
                return new Bullet3()
            case MonsterId.BulletLine:
                return new BulletLine()
            case MonsterId.Fireball:
                return new FireballModel()
            case MonsterId.Knife:
                return new KnifeModel(this.loader?.GetAssets(Char.KayKitAdvDagger))
            case MonsterId.DefaultBall:
            default:
                return new DefaultBall(.1)
        }
    }

    update(delta: number): void {
        this.projectiles.forEach(a => {
            a.forEach(s => {
                if (!s.ctrl.Live && !s.releasing) return;

                if (s.releasing) {
                    const releaseModel = s.model as ReleaseAnimatedProjectile
                    releaseModel.updateRelease?.(delta)
                    if (releaseModel.isReleaseFinished?.() ?? true) {
                        this.FinalizeRelease(s)
                    }
                    return
                }

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
        const releaseModel = entry.model as ReleaseAnimatedProjectile
        if (releaseModel.updateRelease && releaseModel.isReleaseFinished) {
            entry.releasing = true
            return
        }
        this.FinalizeRelease(entry)
    }

    FinalizeRelease(entry: ProjectileSet) {
        entry.releasing = false
        if (entry.model.Meshs) this.game.remove(entry.model.Meshs)
    }

    /**
     * 투사체 풀 할당 (레이스 컨디션 방지를 위해 동기적으로 풀 관리)
     */
    AllocateProjPool(id: MonsterId, src: THREE.Vector3, dir: THREE.Vector3, damage: number, ownerSpec: BaseSpec, range: number) {
        let pool = this.projectiles.get(id)
        if(!pool) {
            pool = []
            this.projectiles.set(id, pool)
        }
        
        let set = pool.find((e) => e.ctrl.Live == false && !e.releasing)
        
        if (!set) {
            // 새 객체 생성 및 즉시 풀에 등록하여 다음 호출에서 중복 생성을 방지함
            const model = this.GetModel(id)
            const stat = StatFactory.getDefaultStats(id as string)
            const ctrl = new ProjectileCtrl(model, this.targetList, this.eventCtrl, range, stat)
            
            set = { model, ctrl, releasing: false }
            pool.push(set)

            // 비동기 초기화는 별도로 수행
            if (typeof model.init === "function") {
                model.init().then(() => {
                    this.startProjectile(set!, src, dir, damage, ownerSpec)
                })
            } else {
                this.startProjectile(set, src, dir, damage, ownerSpec)
            }
        } else {
            this.startProjectile(set, src, dir, damage, ownerSpec)
        }
    }

    private startProjectile(set: ProjectileSet, src: THREE.Vector3, dir: THREE.Vector3, damage: number, ownerSpec: BaseSpec) {
        set.releasing = false
        set.ctrl.start(src, dir, damage, ownerSpec)
        if (set.model.Meshs) this.game.add(set.model.Meshs)
    }

    ReleaseAllProjPool() {
        this.projectiles.forEach(a => {
            a.forEach(s => {
                s.releasing = false
                s.ctrl.Release()
                if (s.model.Meshs) this.game.remove(s.model.Meshs)
            })
        })
    }
}
