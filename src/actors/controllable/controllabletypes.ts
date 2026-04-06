import * as THREE from "three"
import { ActionDef, IActionComponent } from "@Glibs/types/actiontypes"
import { StatKey } from "@Glibs/inventory/stat/stattypes"
import { IActorState } from "../player/states/playerstate"
import { Char } from "@Glibs/types/assettypes"
import { MonsterId } from "@Glibs/types/monstertypes"

export type ShipProjectileDef = {
  id: MonsterId
  name?: string
  damageMultiplier?: number
  range?: number
  hitscan?: boolean
  tracerLife?: number
  tracerRange?: number
  useRaycast?: boolean
  muzzleOffset?: { x: number; y: number; z: number }
  fireCooldownSec?: number
  turnSpeed?: number
  energyCostPerSec?: number
}

export type ControllableRole = "ship" | "ally"
export type ControlSource = "manual" | "ai" | "hybrid"

export type CommandType =
  | "move"
  | "attack"
  | "hold"
  | "follow"
  | "patrol"
  | "useSkill"

export type ActorCommand = {
  type: CommandType
  actorId: string
  issuedAt: number
  issuer: "human" | "ai" | "script"
  priority?: number
  targetId?: string
  point?: THREE.Vector3
  payload?: unknown
}

export type CommandContext = {
  actorId: string
  queue: ActorCommand[]
  consume: () => ActorCommand | undefined
  peek: () => ActorCommand | undefined
}

export type ControllableProperty = {
  id: string
  role: ControllableRole
  model: Char
  scale: number
  stats?: Partial<Record<StatKey, number>>
  weapons?: ShipProjectileDef[]
  weaponSwitchDurationSec?: number
  actions?: ActionDef[]
  defaultControlSource?: ControlSource
  stateFactory: (...params: unknown[]) => IActorState
}

export type PolicyContext = {
  actorId: string
  controlSource: ControlSource
  now: number
}

export interface IControllableRuntime {
  id: string
  objs?: THREE.Object3D
  moveTo?(point: THREE.Vector3, continueDirection?: THREE.Vector3): void
  moveAlong?(direction: THREE.Vector3): void
  attackTarget?(targetId: string, payload?: unknown): void
  holdPosition?(): void
  followTarget?(targetId: string, payload?: unknown): void
  useSkill?(skillId: string, payload?: unknown): void
}

export type CommandArbiter = (commands: ActorCommand[]) => ActorCommand[]

export type ControlPolicyMap = Partial<Record<ControlSource, string>>

export type ControllableDefinition = ControllableProperty & {
  policyMap?: ControlPolicyMap
  defaultActions?: IActionComponent[]
}
