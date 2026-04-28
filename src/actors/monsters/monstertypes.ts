import { ItemId } from "@Glibs/inventory/items/itemdefs"
import { StatKey } from "@Glibs/inventory/stat/stattypes"
import { Char } from "@Glibs/types/assettypes"
import { ActionDef } from "@Glibs/actions/actiontypes"
import { IActorState } from "@Glibs/actors/player/states/playerstate"
import { ActionType } from "@Glibs/types/playertypes"
import { ProjectileWeaponDef } from "@Glibs/actors/projectile/projectiletypes"

export { IActorState }

export enum MonsterId {
    Zombie = "Zombie",
    DashZombie = "DashZombie",
    Minotaur = "Minataur",
    Batpig = "Batpig",
    Bilby = "Bilby",
    Birdmon = "Birdmon",
    Crab = "Crab",
    Builder = "Builder",
    Golem = "Golem",
    BigGolem = "Biggolem",
    KittenMonk = "Kittenmonk",
    Skeleton = "Skeleton",
    Snake = "Snake",
    ToadMage = "Toadmage",
    Viking = "Viking",
    WereWolf = "Werewolf",

    Stone = "stone",
    Tree = "tree",
    Bee = "Bee",

    DefaultBall = "DefaultBall",
    DefaultBullet = "DefaultBullet",
    WarhamerTracer = "WarT",
    BulletLine = "BulletL",
    Fireball = "fb",
    Knife = "knife",
    EnergyHoming = "EnergyHoming",
}

export const MonsterIdList = [
    MonsterId.Zombie, MonsterId.Minotaur, MonsterId.Batpig, MonsterId.Bilby, MonsterId.Birdmon,
    MonsterId.Crab, MonsterId.Builder, MonsterId.Golem, MonsterId.BigGolem, MonsterId.KittenMonk,
    MonsterId.Skeleton, MonsterId.Snake, MonsterId.ToadMage, MonsterId.Viking, MonsterId.WereWolf
]

export type MonsterIdType = MonsterId;

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
    projectileDef?: ProjectileWeaponDef
    attackAction?: ActionType
    idleStates?: (...params: any) => IActorState
}
