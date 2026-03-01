import { MonsterId, MonsterIdType } from "@Glibs/types/monstertypes";
import { StatKey } from "@Glibs/types/stattypes";

export type StatPreset = Partial<Record<StatKey, number>>

export const baseStatPresets: Record<MonsterIdType, Partial<Record<StatKey, number>>> = {
  [MonsterId.Zombie]: {
    hp: 10,
    mp: 0,
    expBonus: 20,
    attackMelee: 12,
    defense: 8,
    intelligence: 2,
    speed: 0.6,
    lifeSteal: 0.1,
    attackSpeedMelee: 2,
  },
  [MonsterId.DashZombie]: {
    hp: 10,
    mp: 0,
    expBonus: 20,
    attackMelee: 12,
    defense: 8,
    intelligence: 2,
    speed: 0.6,
    lifeSteal: 0.1,
    attackSpeedMelee: 2,
  },
  'Minotaur': {
    'hp': 200,
     'attackMelee': 20,
    'defense': 10,
    'strength': 15,
    'speed': 0.9
  },
  'Batpig': {
    'hp': 80,
     'attackMelee': 8,
    'speed': 1.8,
    'evasion': 10
  },
  'Bilby': {
    'hp': 90,
     'attackMelee': 10,
    'speed': 1.4,
    'evasion': 8
  },
  'Birdmon': {
    'hp': 80,
     'attackMelee': 8,
    'speed': 1.8,
    'evasion': 10
  },
  'Crab': {
    'hp': 110,
    'defense': 15,
    'block': 10
  },
  'Builder': {
    'hp': 100,
    'defense': 10,
    'strength': 8
  },
  'Golem': {
    'hp': 300,
    'defense': 30,
     'attackMelee': 15,
    'speed': 0.4
  },
  'BigGolem': {
    'hp': 300,
    'defense': 30,
     'attackMelee': 15,
    'speed': 0.4
  },
  'KittenMonk': {
    'hp': 120,
     'attackMelee': 10,
    'wisdom': 12,
    'hpRegen': 2
  },
  'Skeleton': {
    'hp': 150,
     'attackMelee': 12,
    'defense': 8,
    'speed': 0.6,
    'lifeSteal': 0.1
  },
  'Snake': {
    'hp': 90,
     'attackMelee': 10,
    'speed': 1.4,
    'evasion': 8
  },
  'ToadMage': {
    'hp': 100,
    'magicAttack': 18,
    'intelligence': 15,
    'mp': 50
  },
  'Viking': {
    'hp': 200,
     'attackMelee': 20,
    'defense': 10,
    'strength': 15,
    'speed': 0.9
  },
  'WereWolf': {
    'hp': 200,
     'attackMelee': 20,
    'defense': 10,
    'strength': 15,
    'speed': 0.9
  },
  'Stone': {
    'hp': 250,
    'defense': 20,
    'speed': 0.2
  },
  'Tree': {
    'hp': 250,
    'defense': 20,
    'speed': 0.2
  },
  'Bee': {
    'hp': 80,
     'attackMelee': 8,
    'speed': 1.8,
    'evasion': 10
  },
  'DefaultBall': {
    'hp': 1,
     'attackMelee': 1,
    'speed': 5.0
  },
  'DefaultBullet': {
    'hp': 1,
     'attackMelee': 1,
    'speed': 10.0
  },
  'BulletL': {
    'hp': 1,
     'attackMelee': 2,
    'speed': 10.0
  },
  [MonsterId.Fireball]: {
    hp: 1,
    attackMelee: 8,
    speed: 10.0,
  },
  [MonsterId.Knife]: {
    hp: 1,
    attackMelee: 5,
    speed: 10.0,
  },
  [MonsterId.WarhamerTracer]: {
    hp: 1,
    attackMelee: 1,
    speed: 100.0, // High speed for tracer
  },
};


export type MonsterGrade = 'normal' | 'elite' | 'boss';
