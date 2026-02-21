import { ItemId } from "@Glibs/inventory/items/itemdefs"
import { StatKey } from "@Glibs/inventory/stat/stattypes"
import { Char } from "@Glibs/types/assettypes"
import IEventController from "@Glibs/interface/ievent"
import { IGPhysic } from "@Glibs/interface/igphysics"
import { Zombie } from "@Glibs/actors/monsters/zombie"
import { BaseSpec } from "@Glibs/actors/battle/basespec"
import { IPhysicsObject } from "@Glibs/interface/iobject"
import { ActionDef } from "@Glibs/actions/actiontypes"

export class MonsterId {
    public static Zombie = "Zombie"
    public static DashZombie = "DashZombie"
    public static Minotaur = "Minataur"
    public static Batpig = "Batpig"
    public static Bilby = "Bilby"
    public static Birdmon = "Birdmon"
    public static Crab = "Crab"
    public static Builder = "Builder"
    public static Golem = "Golem"
    public static BigGolem = "Biggolem"
    public static KittenMonk = "Kittenmonk"
    public static Skeleton = "Skeleton"
    public static Snake = "Snake"
    public static ToadMage = "Toadmage"
    public static Viking = "Viking"
    public static WereWolf = "Werewolf"

    public static Stone = "stone"
    public static Tree = "tree"
    public static Bee = "Bee"

    public static DefaultBall = "DefaultBall"
    public static DefaultBullet = "DefaultBullet"
    public static BulletLine = "BulletL"
    public static Fireball = "fb"
    public static Knife = "knife"
    public static List = [
        this.Zombie, this.Minotaur, this.Batpig, this.Bilby, this.Birdmon,
        this.Crab, this.Builder, this.Golem, this.BigGolem, this.KittenMonk,
        this.Skeleton, this.Snake, this.ToadMage, this.Viking, this.WereWolf
    ]
}

export type MonsterIdType = typeof MonsterId.List[number];

export enum MonsterType {
    Undead, Dragon, Machine, Warrior, Angel, Element,
    Fish, Plant, Insect, Reptile,
    Wizard, Alien, Beast, Dinosaur,
    Lightning, Flame, Rock
}

export type MonDrop = {
    itemId: ItemId,
    value?: number
    ratio: number,
}

export type MonsterProperty = {
    id: MonsterId
    type: MonsterType
    model: Char
    stats?: Partial<Record<StatKey, number>>
    drop?: MonDrop[]
    actions?: ActionDef[],
    idleStates?: (...params: any) => IMonsterAction
}

export interface IMonsterAction {
    Init(param?: any): void
    Uninit(): void
    Update(delta: number, v: THREE.Vector3, target: IPhysicsObject): IMonsterAction
}
