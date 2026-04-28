import * as THREE from "three";
import { CreateMon } from "./createmon";
import { IPhysicsObject } from "@Glibs/interface/iobject";
import { MonDrop, MonsterId } from "@Glibs/types/monstertypes";
import { EffectType } from "@Glibs/types/effecttypes";
import { AttackOption } from "@Glibs/types/playertypes";
import { EventTypes } from "@Glibs/types/globaltypes";
import { DeckType } from "@Glibs/types/inventypes";
import IEventController from "@Glibs/interface/ievent";
import { IGPhysic } from "@Glibs/interface/igphysics";
import { MonsterDb } from "./monsterdb";
import { Loader } from "@Glibs/loader/loader";
import { Effector } from "@Glibs/magical/effects/effector";
import { calculateCompositeDamage } from "../battle/damagecalc";
import {
    GetHorizontalDistanceToBoxSurface,
    IsMeleeAttackType,
    MeleeValidationResult,
    ValidateReceivedMeleeAttack,
} from "../battle/meleecombat";
import { BaseSpec } from "../battle/basespec";
import { Zombie } from "./zombie";
import { itemDefs } from "@Glibs/inventory/items/itemdefs";
import { TargetTeamId } from "@Glibs/systems/targeting/targettypes";
import { FactionId } from "@Glibs/gameobjects/turntypes";

export type MonsterSpawnOptions = {
    respawn?: boolean
    timer?: number
    teamId?: TargetTeamId | FactionId
}

export type MonsterSet = {
    monModel: IPhysicsObject,
    monCtrl: IMonsterCtrl
    live: boolean
    respawn: boolean
    deadtime: number
    initPos?: THREE.Vector3
    attackListener?: (opts: AttackOption[]) => void
}
export interface IMonsterCtrl {
    get Spec(): BaseSpec
    get MonsterBox(): MonsterBox
    get Drop(): MonDrop[] | undefined
    get TargetId(): string
    Respawning(): void
    Dispose(): void
    ValidateMeleeAttackTarget(targetId: string, attackRange: number): MeleeValidationResult
    ValidateRangedAttackTarget(targetId: string, attackRange: number): boolean
    ReceiveDemage(demage: number, effect?: EffectType, attackRange?: number, knockbackDist?: number): boolean 
}

export class MonsterBox extends THREE.Mesh {
    constructor(public Id: number, public ObjName: string, public MonId: MonsterId,
        geo: THREE.BoxGeometry, mat: THREE.MeshBasicMaterial
    ) {
        super(geo, mat)
        this.name = ObjName
    }
}

export class Monsters {
    monsters = new Map<MonsterId, MonsterSet[]>()
    private readonly nextMonsterIds = new Map<MonsterId, number>()
    keytimeout?:NodeJS.Timeout
    respawntimeout?:NodeJS.Timeout
    mode = false
    createMon = new CreateMon(this.loader, this.eventCtrl, this.player,
        this.gphysic, this.game, this.monDb)

    get Enable() { return this.mode }
    set Enable(flag: boolean) { 
        this.mode = flag 
        if(!this.mode) { this.ReleaseMonster() }
    }
    maxMob = 100
    mobCount = 0
    nameView = true

    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private game: THREE.Scene,
        private player: IPhysicsObject,
        private gphysic: IGPhysic,
        private monDb: MonsterDb,
        { maxMob = 100, nameView = true } = {}
    ) {
        this.maxMob = maxMob
        this.nameView = nameView
        eventCtrl.RegisterEventListener(EventTypes.Attack + "mon", (opts: AttackOption[]) => {
            if (!this.mode) return
            opts.forEach((opt) => {
                const obj = opt.obj as MonsterBox
                if (obj == null) return

                const mon = this.monsters.get(obj.MonId)
                if(!mon) throw new Error("unexpected value");
                
                const z = mon[obj.Id]
                if (!z) return
                this.ApplyAttack(z, opt)
            })
        })
    }

    private hasExpDrop(drop?: MonDrop[]) {
        return !!drop?.some(d => d.itemId === itemDefs.Exp.id)
    }

    private resolveExpReward(baseExp: number, baseDrop: MonDrop[] | undefined) {
        // auto 정책: EXP 아이템 드랍이 정의되어 있으면 item 경로, 없으면 direct 경로
        if (this.hasExpDrop(baseDrop)) {
            return { drop: baseDrop, directExp: 0 }
        }
        return { drop: baseDrop, directExp: baseExp }
    }

    private reserveMonsterId(monId: MonsterId, mon: MonsterSet[]): number {
        const id = this.nextMonsterIds.get(monId) ?? mon.length
        this.nextMonsterIds.set(monId, id + 1)
        return id
    }

    private getMeleeDefenderBounds(box: MonsterBox): THREE.Box3 | undefined {
        const bounds = new THREE.Box3().setFromObject(box)
        return bounds.isEmpty() ? undefined : bounds
    }

    ReceiveDemage(z: MonsterSet, damage: number, effect?: EffectType, attackRange?: number, knockbackDist?: number) {
        if (!z.live) return

        if (!z.monCtrl.ReceiveDemage(damage, effect, attackRange, knockbackDist)) {
            z.live = false
            z.deadtime = new Date().getTime()
            this.mobCount = Math.max(0, this.mobCount - 1)
            const property = this.monDb.GetItem(z.monCtrl.MonsterBox.MonId)
            const baseExp = property.stats?.expBonus ?? 0
            const expReward = this.resolveExpReward(baseExp, z.monCtrl.Drop)

            this.eventCtrl.SendEventMessage(EventTypes.Drop,
                new THREE.Vector3(z.monModel.Meshs.position.x, this.player.CenterPos.y, z.monModel.Meshs.position.z), 
                expReward.drop, z.monCtrl.MonsterBox.MonId
            )
            if (expReward.directExp > 0) {
                this.eventCtrl.SendEventMessage(EventTypes.Exp, expReward.directExp)
            }
            
            this.eventCtrl.SendEventMessage(EventTypes.Death, z.monCtrl.MonsterBox.MonId)
            this.eventCtrl.SendEventMessage(EventTypes.DelInteractive, z.monCtrl.MonsterBox)
            this.eventCtrl.SendEventMessage(EventTypes.UpdateTargetState, {
                id: z.monCtrl.TargetId,
                alive: false,
                targetable: false,
                collidable: false,
            })
            this.respawntimeout = setTimeout(() => {
                if (z.respawn) {
                    this.Spawning(z.monCtrl.MonsterBox.MonId, z.respawn, z, z.initPos)
                }
            }, THREE.MathUtils.randInt(8000, 15000))
        }
    }
    private ApplyAttack(z: MonsterSet, opt: AttackOption) {
        if (!z.live) return
        if (IsMeleeAttackType(opt.type) && opt.targetId != undefined) {
            const defenderBounds = this.getMeleeDefenderBounds(z.monCtrl.MonsterBox)
            const validation = ValidateReceivedMeleeAttack(
                opt,
                z.monCtrl.TargetId,
                z.monModel.Pos,
                z.live,
                defenderBounds,
            )
            if (validation !== MeleeValidationResult.InRange) {
                console.log("[CombatDebug] ReceiveRejected", {
                    receiver: "monster",
                    actorId: opt.attackerObjectId,
                    targetId: opt.targetId,
                    currentTargetId: z.monCtrl.TargetId,
                    actorPos: opt.obj
                        ? { x: opt.obj.position.x, y: opt.obj.position.y, z: opt.obj.position.z }
                        : undefined,
                    targetPos: { x: z.monModel.Pos.x, y: z.monModel.Pos.y, z: z.monModel.Pos.z },
                    distance: opt.obj
                        ? GetHorizontalDistanceToBoxSurface(opt.obj.position, defenderBounds, z.monModel.Pos)
                        : undefined,
                    attackRange: opt.distance,
                    validation,
                    boundsEmpty: defenderBounds == undefined,
                })
                return
            }
        }
        if(opt.spec == undefined) throw new Error("unexpected value");
        const damage = calculateCompositeDamage({
            attacker: opt.spec,
            defender: z.monCtrl.Spec,
            type: opt.damageType,
        })

        const attackRange = IsMeleeAttackType(opt.type) ? opt.distance : undefined;
        const knockbackDist = IsMeleeAttackType(opt.type) ? opt.knockbackDistance : undefined;

        this.ReceiveDemage(z, damage.finalDamage, opt.effect, attackRange, knockbackDist)
    }
    async RandomDeckMonsters(deck: DeckType) {
        console.log("Start Random Deck---------------", deck.id)

        this.RandomSpawning(deck)
    }
    RandomSpawning(deck: DeckType) {
        let mon = this.monsters.get(deck.monId)
        if (!mon) {
            mon = []
            this.monsters.set(deck.monId, mon)
        }
        
        if(mon.length < deck.maxSpawn) {
            this.Spawning(deck.monId, true)
            this.keytimeout = setTimeout(() => {
                this.RandomSpawning(deck)
            }, 5000)
        }
    }
    async Resurrection(id: MonsterId, timer: number) {
        let mon = this.monsters.get(id)
        if(!mon) {
            mon = []
            this.monsters.set(id, mon)
        }
        const now = new Date().getTime()
        const set = mon.find((e) => e.live == false && now - e.deadtime > timer)
        return set
    }
    async CreateMonster(
        monId: MonsterId,
        { respawn = false, timer = 5000, teamId = TargetTeamId.Monster }: MonsterSpawnOptions = {},
        pos?: THREE.Vector3,
    ) {
        let set
        if (!respawn) {
            // respawn 이 트루면 죽을 때 타이머로 부활이 설정되어 있다.
            set = await this.Resurrection(monId, timer)
        }
        console.log("Create", set, this.monsters.get(monId))
        return this.Spawning(monId, respawn, set, pos, teamId)
    }
    ReleaseMonster() {
        this.monsters.forEach((mon) => {
            mon.forEach((z) => {
                if (z.live) {
                    this.eventCtrl.SendEventMessage(EventTypes.DelInteractive, z.monCtrl.MonsterBox)
                }
                z.monModel.Visible = false
                z.live = false
                this.eventCtrl.SendEventMessage(EventTypes.DeregisterTarget, z.monCtrl.TargetId)
                if (z.attackListener) {
                    this.eventCtrl.DeregisterEventListener(EventTypes.Attack + z.monCtrl.TargetId, z.attackListener)
                    z.attackListener = undefined
                }
                z.monCtrl.Dispose()
                if (z.monModel.Meshs.parent) {
                    this.game.remove(z.monModel.Meshs)
                }
                if (z.monCtrl.MonsterBox.parent) {
                    this.game.remove(z.monCtrl.MonsterBox)
                }
            })
            console.log("Release", mon)
        })
        this.monsters.clear()
        this.nextMonsterIds.clear()
        this.mobCount = 0
        
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
        if (this.respawntimeout != undefined) clearTimeout(this.respawntimeout)
    }

    async Spawning(
        monId: MonsterId,
        respawn: boolean,
        monSet?: MonsterSet,
        pos?: THREE.Vector3,
        teamId: TargetTeamId | FactionId = TargetTeamId.Monster,
    ) {
        //const zSet = await this.CreateZombie()
        if (!this.mode) return
        if (this.mobCount >= this.maxMob) return
        let mon = this.monsters.get(monId)
        if (!mon) {
            mon = []
            this.monsters.set(monId, mon)
        }

        if (!monSet) {
            // called resurrection
            const reservedId = this.reserveMonsterId(monId, mon)

            try {
                monSet = await this.createMon.Call(monId, reservedId)
                monSet.attackListener = (opts: AttackOption[]) => {
                    if (!this.mode) return
                    opts.forEach((opt) => this.ApplyAttack(monSet!, opt))
                }
                this.eventCtrl.RegisterEventListener(EventTypes.Attack + monSet.monCtrl.TargetId, monSet.attackListener)
                mon[reservedId] = monSet
            } catch (error) {
                delete mon[reservedId]
                throw error
            }
        }

        if(!pos) {
            monSet.monModel.Meshs.position.x = this.player.Meshs.position.x + THREE.MathUtils.randInt(-20, 20)
            monSet.monModel.Meshs.position.z = this.player.Meshs.position.z + THREE.MathUtils.randInt(-20, 20)
        } else {
            monSet.monModel.Meshs.position.copy(pos)
            monSet.initPos = pos
        }

        while (this.gphysic.Check(monSet.monModel)) {
            monSet.monModel.Meshs.position.y += 0.5
        }
        monSet.respawn = respawn
        monSet.live = true
        this.mobCount++
        monSet.monCtrl.Respawning()
        monSet.monModel.Meshs.name = monSet.monCtrl.TargetId
        monSet.monModel.Meshs.userData.targetMeta = {
            id: monSet.monCtrl.TargetId,
            teamId,
            kind: "unit",
        }
        monSet.monModel.Meshs.updateWorldMatrix(true, true)
        const monBox = new THREE.Box3().setFromObject(monSet.monModel.Meshs)
        this.eventCtrl.SendEventMessage(EventTypes.RegisterTarget, {
            id: monSet.monCtrl.TargetId,
            object: monSet.monModel.Meshs,
            teamId,
            kind: "unit",
            alive: true,
            targetable: true,
            collidable: true,
            bounds: monBox,
        })

        monSet.monModel.Visible = true;
        (monSet.monModel as Zombie).NameView(this.nameView)
        console.log("Spawning", monSet.monCtrl.MonsterBox.Id, monSet, mon)

        this.eventCtrl.SendEventMessage(EventTypes.AddInteractive, monSet.monCtrl.MonsterBox)
        this.game.add(monSet.monModel.Meshs, monSet.monCtrl.MonsterBox)
        return monSet
    }
}
