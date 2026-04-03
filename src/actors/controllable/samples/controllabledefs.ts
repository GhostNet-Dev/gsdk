import { ControllableDb } from "../controllabledb"
import { ControllableDefinition, IControllableRuntime, PolicyContext, ActorCommand } from "../controllabletypes"
import { IdleControllableState } from "../states/controllablestate"
import { CommandPlanner } from "../policy/aipolicy"
import { NewFighterShipState } from "../states/fightershipstate"
import { IFighterShipRuntime } from "./fightershipruntime"
import { shipWeaponDefs } from "./shipweapondefs"
import { Char } from "@Glibs/types/assettypes"
import { MonsterId } from "@Glibs/types/monstertypes"

const now = () => Date.now()

export const controllableDefs = {
  ScoutSpaceship: {
    id: "ship.scout",
    role: "ship",
    model: Char.SpaceShipPack1Bomber,
    defaultControlSource: "hybrid",
    scale: 0.01,
    stats: {
      hp: 180,
      mp: 80,
      stamina: 120,
      attackRanged: 10,
      attackRange: 36,
      defense: 6,
      speed: 1.,
    },
    weapons: [shipWeaponDefs.ScoutLaser],
    policyMap: {
      manual: "human",
      ai: "ship-default-ai",
    },
    stateFactory: (runtime: unknown) => new IdleControllableState(runtime as IControllableRuntime),
  },
  FighterShip: {
    id: "ship.fighter",
    role: "ship",
    model: Char.SpaceShipPack1Fighter,
    defaultControlSource: "hybrid",
    scale: 0.01,
    stats: {
      hp: 160,
      mp: 60,
      stamina: 120,
      attackRanged: 10,
      attackRange: 42,
      defense: 5,
      speed: 1.2,
    },
    weapons: [shipWeaponDefs.FighterAutocannon],
    policyMap: {
      manual: "human",
      ai: "ship-default-ai",
    },
    stateFactory: (runtime: unknown) => NewFighterShipState(runtime as IFighterShipRuntime),
  },
  EscortAlly: {
    id: "ally.escort",
    role: "ally",
    model: Char.SpaceShipPack1Carrier,
    defaultControlSource: "hybrid",
    scale: 0.01,
    stats: {
      hp: 240,
      mp: 30,
      stamina: 140,
      attackMelee: 14,
      attackRange: 10,
      defense: 10,
      speed: .5,
    },
    weapons: [shipWeaponDefs.AllySupportGun],
    policyMap: {
      manual: "human",
      ai: "ally-escort-ai",
    },
    stateFactory: (runtime: unknown) => new IdleControllableState(runtime as IControllableRuntime),
  },
} satisfies Record<string, ControllableDefinition>

export type SampleControllableDefs = typeof controllableDefs
export type SampleControllableDefKey = keyof SampleControllableDefs
export type SampleControllableDef = SampleControllableDefs[SampleControllableDefKey]

export const ScoutSpaceshipDefinition = controllableDefs.ScoutSpaceship
export const FighterShipDefinition = controllableDefs.FighterShip
export const EscortAllyDefinition = controllableDefs.EscortAlly

export function registerSampleDefinitions(db: ControllableDb) {
  for (const def of Object.values(controllableDefs)) {
    db.register(def)
  }
}

export const defaultShipAiPlanner: CommandPlanner = (_delta: number, ctx: PolicyContext): ActorCommand[] => {
  // 예시: 일정 주기로 패트롤 명령을 만든다.
  if (ctx.now % 2000 > 32) return []
  return [{
    type: "patrol",
    actorId: ctx.actorId,
    issuer: "ai",
    issuedAt: now(),
    priority: 5,
    payload: { radius: 8 },
  }]
}

export const defaultEscortAiPlanner: CommandPlanner = (_delta: number, ctx: PolicyContext): ActorCommand[] => {
  // 예시: 수동 입력이 없을 때 follow 유지 명령.
  return [{
    type: "follow",
    actorId: ctx.actorId,
    issuer: "ai",
    issuedAt: now(),
    priority: 4,
    targetId: "player-main",
  }]
}
