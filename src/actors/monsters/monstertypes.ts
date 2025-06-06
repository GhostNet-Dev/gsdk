import { Char } from "@Glibs/types/assettypes"

export class MonsterId {
    public static Zombie = "Zombie"
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
    public static List = [
        this.Zombie, this.Minotaur, this.Batpig, this.Bilby, this.Birdmon,
        this.Crab, this.Builder, this.Golem, this.BigGolem, this.KittenMonk,
        this.Skeleton, this.Snake, this.ToadMage, this.Viking, this.WereWolf
    ]
}
export enum MonsterType {
    Undead, Dragon, Machine, Warrior, Angel, Element,
    Fish, Plant, Insect, Reptile,
    Wizard, Alien, Beast, Dinosaur,
    Lightning, Flame, Rock
}

export type MonDrop = {
    itemId: string,
    ratio: number
}

export type MonsterProperty = {
    id: MonsterId
    type: MonsterType
    model: Char
    health: number
    speed: number
    damageMin: number
    damageMax: number
    attackSpeed: number
    drop?: MonDrop[]
}

