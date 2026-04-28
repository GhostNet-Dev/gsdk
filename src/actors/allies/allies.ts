import * as THREE from "three";
import { AllySet, AllyId, AllyBox, IAllyCtrl } from "./allytypes";
import { AllyDb } from "./allydb";
import { CreateAlly } from "./createally";
import { AllyModel } from "./allymodel";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import IEventController from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { EffectType } from "@Glibs/types/effecttypes";
import { AttackOption } from "@Glibs/types/playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes";
import { Loader } from "@Glibs/loader/loader";
import { calculateCompositeDamage } from "@Glibs/actors/battle/damagecalc";
import {
    GetHorizontalDistanceToBoxSurface,
    IsMeleeAttackType,
    MeleeValidationResult,
    ValidateReceivedMeleeAttack,
} from "@Glibs/actors/battle/meleecombat";

export type { AllySet, IAllyCtrl }
export { AllyBox, AllyId }

export class Allies {
    allies = new Map<AllyId, AllySet[]>()
    mode = false
    maxAlly = 40
    allyCount = 0
    nameView = true

    private createAlly: CreateAlly

    get Enable() { return this.mode }
    set Enable(flag: boolean) {
        this.mode = flag
        if (!this.mode) { this.Release() }
    }

    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private game: THREE.Scene,
        private player: IPhysicsObject,
        private gphysic: IGPhysic,
        private allyDb: AllyDb,
        { maxAlly = 40, nameView = true } = {}
    ) {
        this.maxAlly = maxAlly
        this.nameView = nameView
        this.createAlly = new CreateAlly(loader, eventCtrl, gphysic, game, allyDb)

        // 몬스터가 "player" 팀에 보내는 공격을 아군 유닛도 수신
        eventCtrl.RegisterEventListener(EventTypes.Attack + "player", (opts: AttackOption[]) => {
            if (!this.mode) return
            opts.forEach((opt) => {
                const obj = opt.obj as AllyBox
                if (obj == null || !(obj instanceof AllyBox)) return
                const list = this.allies.get(obj.AllyId)
                if (!list) return
                const z = list[obj.Id]
                if (!z) return
                this.ApplyAttack(z, opt)
            })
        })
    }

    async Summon(allyId: AllyId, deckLevel: number, pos?: THREE.Vector3): Promise<AllySet | undefined> {
        if (!this.mode) return
        if (this.allyCount >= this.maxAlly) return

        let list = this.allies.get(allyId)
        if (!list) {
            list = []
            this.allies.set(allyId, list)
        }

        const allySet = await this.createAlly.Call(allyId, list.length, deckLevel, pos)

        allySet.attackListener = (opts: AttackOption[]) => {
            if (!this.mode) return
            opts.forEach((opt) => this.ApplyAttack(allySet, opt))
        }
        this.eventCtrl.RegisterEventListener(
            EventTypes.Attack + allySet.allyCtrl.TargetId,
            allySet.attackListener
        )
        list.push(allySet)

        if (!pos) {
            allySet.allyModel.Meshs.position.x = this.player.Meshs.position.x + THREE.MathUtils.randInt(-10, 10)
            allySet.allyModel.Meshs.position.z = this.player.Meshs.position.z + THREE.MathUtils.randInt(-10, 10)
        } else {
            allySet.allyModel.Meshs.position.copy(pos)
            allySet.initPos = pos
        }

        while (this.gphysic.Check(allySet.allyModel)) {
            allySet.allyModel.Meshs.position.y += 0.5
        }

        allySet.live = true
        this.allyCount++
        allySet.allyCtrl.Summoned()

        allySet.allyModel.Meshs.name = allySet.allyCtrl.TargetId
        allySet.allyModel.Meshs.userData.targetMeta = {
            id: allySet.allyCtrl.TargetId,
            teamId: TargetTeamId.Player,
            kind: "unit",
        }

        this.eventCtrl.SendEventMessage(EventTypes.RegisterTarget, {
            id: allySet.allyCtrl.TargetId,
            object: allySet.allyModel.Meshs,
            teamId: TargetTeamId.Player,
            kind: "unit",
            alive: true,
            targetable: true,
            collidable: true,
        })

        allySet.allyModel.Visible = true;
        (allySet.allyModel as AllyModel).NameView(this.nameView)

        this.eventCtrl.SendEventMessage(EventTypes.AddInteractive, allySet.allyCtrl.AllyBox)
        this.game.add(allySet.allyModel.Meshs, allySet.allyCtrl.AllyBox)

        return allySet
    }

    Release(): void {
        this.allies.forEach((list) => {
            list.forEach((z) => {
                if (z.live) {
                    this.eventCtrl.SendEventMessage(EventTypes.DelInteractive, z.allyCtrl.AllyBox)
                }
                z.allyModel.Visible = false
                z.live = false
                this.eventCtrl.SendEventMessage(EventTypes.DeregisterTarget, z.allyCtrl.TargetId)
                if (z.attackListener) {
                    this.eventCtrl.DeregisterEventListener(
                        EventTypes.Attack + z.allyCtrl.TargetId,
                        z.attackListener
                    )
                    z.attackListener = undefined
                }
                z.allyCtrl.Dispose()
                if (z.allyModel.Meshs.parent) {
                    this.game.remove(z.allyModel.Meshs)
                }
                if (z.allyCtrl.AllyBox.parent) {
                    this.game.remove(z.allyCtrl.AllyBox)
                }
            })
        })
        this.allies.clear()
        this.allyCount = 0
    }

    private getMeleeDefenderBounds(box: AllyBox): THREE.Box3 | undefined {
        const bounds = new THREE.Box3().setFromObject(box)
        return bounds.isEmpty() ? undefined : bounds
    }

    ReceiveDemage(
        z: AllySet,
        damage: number,
        effect?: EffectType,
        attackRange?: number,
        knockbackDist?: number,
    ): void {
        if (!z.live) return

        if (!z.allyCtrl.ReceiveDemage(damage, effect, attackRange, knockbackDist)) {
            z.live = false
            z.deadtime = Date.now()
            this.allyCount = Math.max(0, this.allyCount - 1)

            this.eventCtrl.SendEventMessage(EventTypes.AllyDeath, {
                allyId: z.allyCtrl.AllyBox.AllyId,
                targetId: z.allyCtrl.TargetId,
                deckLevel: z.deckLevel,
                deadAt: z.deadtime,
                position: z.allyModel.Meshs.position.clone(),
            })
            this.eventCtrl.SendEventMessage(EventTypes.DelInteractive, z.allyCtrl.AllyBox)
            this.eventCtrl.SendEventMessage(EventTypes.UpdateTargetState, {
                id: z.allyCtrl.TargetId,
                alive: false,
                targetable: false,
                collidable: false,
            })
        }
    }

    private ApplyAttack(z: AllySet, opt: AttackOption): void {
        if (!z.live) return
        if (IsMeleeAttackType(opt.type) && opt.targetId != undefined) {
            const defenderBounds = this.getMeleeDefenderBounds(z.allyCtrl.AllyBox)
            const validation = ValidateReceivedMeleeAttack(
                opt,
                z.allyCtrl.TargetId,
                z.allyModel.Pos,
                z.live,
                defenderBounds,
            )
            if (validation !== MeleeValidationResult.InRange) {
                console.log("[CombatDebug] ReceiveRejected", {
                    receiver: "ally",
                    actorId: opt.attackerObjectId,
                    targetId: opt.targetId,
                    currentTargetId: z.allyCtrl.TargetId,
                    actorPos: opt.obj
                        ? { x: opt.obj.position.x, y: opt.obj.position.y, z: opt.obj.position.z }
                        : undefined,
                    targetPos: { x: z.allyModel.Pos.x, y: z.allyModel.Pos.y, z: z.allyModel.Pos.z },
                    distance: opt.obj
                        ? GetHorizontalDistanceToBoxSurface(opt.obj.position, defenderBounds, z.allyModel.Pos)
                        : undefined,
                    attackRange: opt.distance,
                    validation,
                    boundsEmpty: defenderBounds == undefined,
                })
                return
            }
        }
        if (opt.spec == undefined) throw new Error("unexpected value")
        const damage = calculateCompositeDamage({
            attacker: opt.spec,
            defender: z.allyCtrl.Spec,
            type: opt.damageType,
        })

        const attackRange = IsMeleeAttackType(opt.type) ? opt.distance : undefined
        const knockbackDist = IsMeleeAttackType(opt.type) ? opt.knockbackDistance : undefined

        this.ReceiveDemage(z, damage.finalDamage, opt.effect, attackRange, knockbackDist)
    }
}
