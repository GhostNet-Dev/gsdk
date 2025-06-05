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

export type MonsterSet = {
    monModel: IPhysicsObject,
    monCtrl: IMonsterCtrl
    live: boolean
    respawn: boolean
    deadtime: number
    initPos?: THREE.Vector3
}
export interface IMonsterCtrl {
    get MonsterBox(): MonsterBox
    get Drop(): MonDrop[] | undefined
    Respawning(): void
    ReceiveDemage(demage: number, effect?: EffectType): boolean 
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

    constructor(
        private loader: Loader,
        private eventCtrl: IEventController,
        private game: THREE.Scene,
        private player: IPhysicsObject,
        private gphysic: IGPhysic,
        private monDb: MonsterDb
    ) {
        eventCtrl.RegisterEventListener(EventTypes.Attack + "mon", (opts: AttackOption[]) => {
            if (!this.mode) return
            opts.forEach((opt) => {
                let obj = opt.obj as MonsterBox
                if (obj == null) return

                const mon = this.monsters.get(obj.MonId)
                if(!mon) throw new Error("unexpected value");
                
                const z = mon[obj.Id]
                if (!z.live) return

                this.ReceiveDemage(z, opt.damage, opt.effect)
            })
        })
        eventCtrl.RegisterEventListener(EventTypes.Attack + "monster", (opts: AttackOption[]) => {
            if (!this.mode) return
            const pos = this.player.Meshs.position
            const dist = opts[0].distance
            const damage = opts[0].damage
            const effect = opts[0].effect
            if(dist == undefined) return
            this.monsters.forEach((mon) => {
                for (let i = 0; i < mon.length; i++) {
                    const z = mon[i]
                    if (!z.live) continue
                    const betw = z.monModel.Meshs.position.distanceTo(pos)
                    if (betw < dist) {
                        this.ReceiveDemage(z, damage, effect)
                    }
                }
            })
        })
    }
    ReceiveDemage(z: MonsterSet, damage: number, effect?: EffectType) {
        if (z && !z.monCtrl.ReceiveDemage(damage, effect)) {
            z.live = false
            z.deadtime = new Date().getTime()
            this.eventCtrl.SendEventMessage(EventTypes.Drop,
                new THREE.Vector3(z.monModel.Meshs.position.x, this.player.CenterPos.y, z.monModel.Meshs.position.z), 
                z.monCtrl.Drop
            )
            this.eventCtrl.SendEventMessage(EventTypes.DelInteractive, z.monCtrl.MonsterBox)
            this.respawntimeout = setTimeout(() => {
                if(z.respawn) {
                    this.Spawning(z.monCtrl.MonsterBox.MonId, z.respawn, z, z.initPos)
                }
            }, THREE.MathUtils.randInt(8000, 15000))
        }
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
    async Resurrection(id: MonsterId) {
        let mon = this.monsters.get(id)
        if(!mon) {
            mon = []
            this.monsters.set(id, mon)
        }
        const now = new Date().getTime()
        const set = mon.find((e) => e.live == false && now - e.deadtime > 5000)
        return set
    }
    async CreateMonster(id: MonsterId, respawn: boolean, pos?: THREE.Vector3) {
        let set
        if (!respawn) {
            // respawn 이 트루면 죽을 때 타이머로 부활이 설정되어 있다.
            set = await this.Resurrection(id)
        }
        console.log("Create", set, this.monsters.get(id))
        return this.Spawning(id, respawn, set, pos)
    }
    ReleaseMonster() {
        this.monsters.forEach((mon) => {
            mon.forEach((z) => {
                z.monModel.Visible = false
                z.live = false
                this.eventCtrl.SendEventMessage(EventTypes.DelInteractive, z.monCtrl.MonsterBox)
                this.game.remove(z.monModel.Meshs, z.monCtrl.MonsterBox)
            })
            console.log("Release", mon)
        })
        
        if (this.keytimeout != undefined) clearTimeout(this.keytimeout)
        if (this.respawntimeout != undefined) clearTimeout(this.respawntimeout)
    }

    async Spawning(monId: MonsterId, respawn:boolean, monSet?: MonsterSet, pos?: THREE.Vector3) {
        //const zSet = await this.CreateZombie()
        if (!this.mode) return
        let mon = this.monsters.get(monId)
        if (!mon) {
            mon = []
            this.monsters.set(monId, mon)
        }

        if (!monSet) {
            monSet = await this.createMon.Call(monId, mon.length)
        }
        mon.push(monSet)

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
        monSet.monCtrl.Respawning()

        monSet.monModel.Visible = true
        console.log("Spawning", monSet, mon)

        this.eventCtrl.SendEventMessage(EventTypes.AddInteractive, monSet.monCtrl.MonsterBox)
        this.game.add(monSet.monModel.Meshs, monSet.monCtrl.MonsterBox)
        return monSet
    }
}