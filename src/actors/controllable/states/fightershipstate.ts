import * as THREE from "three"
import { IActorState } from "../../player/states/playerstate"
import {
  ActorCommand,
  CommandContext,
} from "../controllabletypes"
import { IFighterShipRuntime } from "../samples/fightershipruntime"

type ShipStates = {
  IdleSt: IdleShipState
  MoveSt: MoveShipState
  AttackTargetSt: AttackTargetShipState
  HoldSt: HoldShipState
}

export function NewFighterShipState(runtime: IFighterShipRuntime): IActorState {
  const states = {} as ShipStates

  states.IdleSt = new IdleShipState(states, runtime)
  states.MoveSt = new MoveShipState(states, runtime)
  states.AttackTargetSt = new AttackTargetShipState(states, runtime)
  states.HoldSt = new HoldShipState(states, runtime)

  return states.IdleSt
}

abstract class FighterShipState implements IActorState {
  constructor(
    protected readonly states: ShipStates,
    protected readonly runtime: IFighterShipRuntime,
  ) {}

  Init(_param?: unknown): void {}
  Uninit(): void {}

  protected routeCommand(command: ActorCommand, ctx: CommandContext): IActorState {
    switch (command.type) {
      case "move":
        ctx.consume()
        this.states.MoveSt.Init(command.point?.clone())
        return this.states.MoveSt
      case "attack":
        ctx.consume()
        this.states.AttackTargetSt.Init(command.targetId)
        return this.states.AttackTargetSt
      case "hold":
        ctx.consume()
        this.states.HoldSt.Init()
        return this.states.HoldSt
      default:
        return this
    }
  }

  abstract Update(delta: number, ctx?: unknown): IActorState
}

class IdleShipState extends FighterShipState {
  Update(_delta: number, ctx?: unknown): IActorState {
    const commandCtx = ctx as CommandContext | undefined
    if (!commandCtx) return this

    const next = commandCtx.peek()
    if (!next) return this
    return this.routeCommand(next, commandCtx)
  }
}

class MoveShipState extends FighterShipState {
  private destination?: THREE.Vector3

  Init(point?: unknown): void {
    this.destination = point instanceof THREE.Vector3 ? point.clone() : undefined
    if (this.destination) this.runtime.moveTo(this.destination)
  }

  Uninit(): void {
    this.destination = undefined
  }

  Update(_delta: number, ctx?: unknown): IActorState {
    const commandCtx = ctx as CommandContext | undefined
    if (!commandCtx) return this

    const next = commandCtx.peek()
    if (next) {
      const redirected = this.routeCommand(next, commandCtx)
      if (redirected !== this) {
        this.Uninit()
        return redirected
      }
    }

    if (!this.destination) return this.states.IdleSt
    if (this.runtime.hasArrived(this.destination)) {
      this.Uninit()
      this.states.IdleSt.Init()
      return this.states.IdleSt
    }

    return this
  }
}

class AttackTargetShipState extends FighterShipState {
  private targetId?: string

  Init(targetId?: unknown): void {
    this.targetId = typeof targetId === "string" ? targetId : undefined
    if (this.targetId) this.runtime.attackTarget(this.targetId)
  }

  Uninit(): void {
    this.targetId = undefined
  }

  Update(_delta: number, ctx?: unknown): IActorState {
    const commandCtx = ctx as CommandContext | undefined
    if (!commandCtx) return this

    const next = commandCtx.peek()
    if (next) {
      const redirected = this.routeCommand(next, commandCtx)
      if (redirected !== this) {
        this.Uninit()
        return redirected
      }
    }

    if (!this.targetId) return this.states.IdleSt
    if (!this.runtime.canAttackTarget(this.targetId)) {
      this.Uninit()
      this.states.IdleSt.Init()
      return this.states.IdleSt
    }

    return this
  }
}

class HoldShipState extends FighterShipState {
  Init(): void {
    this.runtime.holdPosition()
  }

  Update(_delta: number, ctx?: unknown): IActorState {
    const commandCtx = ctx as CommandContext | undefined
    if (!commandCtx) return this

    const next = commandCtx.peek()
    if (!next) return this

    const redirected = this.routeCommand(next, commandCtx)
    if (redirected !== this) return redirected
    return this
  }
}
