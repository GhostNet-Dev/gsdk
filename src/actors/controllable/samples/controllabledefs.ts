import { ControllableDb } from "../controllabledb"
import { ControllableDefinition, IControllableRuntime, PolicyContext, ActorCommand } from "../controllabletypes"
import { IdleControllableState } from "../states/controllablestate"
import { CommandPlanner } from "../policy/aipolicy"

const now = () => Date.now()

export const ScoutSpaceshipDefinition: ControllableDefinition = {
  id: "ship.scout",
  role: "ship",
  model: "CharShipScout",
  defaultControlSource: "hybrid",
  stats: {
    hp: 180,
    mp: 80,
    stamina: 120,
    attackRanged: 16,
    defense: 6,
    speed: 1.6,
  },
  policyMap: {
    manual: "human",
    ai: "ship-default-ai",
  },
  stateFactory: (runtime: unknown) => new IdleControllableState(runtime as IControllableRuntime),
}

export const EscortAllyDefinition: ControllableDefinition = {
  id: "ally.escort",
  role: "ally",
  model: "CharAllyEscort",
  defaultControlSource: "hybrid",
  stats: {
    hp: 240,
    mp: 30,
    stamina: 140,
    attackMelee: 14,
    defense: 10,
    speed: 1.1,
  },
  policyMap: {
    manual: "human",
    ai: "ally-escort-ai",
  },
  stateFactory: (runtime: unknown) => new IdleControllableState(runtime as IControllableRuntime),
}

export function registerSampleDefinitions(db: ControllableDb) {
  db.register(ScoutSpaceshipDefinition)
  db.register(EscortAllyDefinition)
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
