import * as THREE from "three"
import { IActorState } from "../../player/states/playerstate"
import {
  ActorCommand,
  CommandContext,
} from "../controllabletypes"
import { IFighterShipRuntime } from "../samples/fightershipruntime"

type NavigationState = "idle" | "hold" | "move" | "follow"
type CombatState = "idle" | "attack"

export function NewFighterShipState(runtime: IFighterShipRuntime): IActorState {
  return new FighterShipCoordinatorState(runtime)
}

class FighterShipCoordinatorState implements IActorState {
  private navigationState: NavigationState = "idle"
  private combatState: CombatState = "idle"

  constructor(private readonly runtime: IFighterShipRuntime) {}

  Init(): void {}
  Uninit(): void {}

  Update(_delta: number, ctx?: unknown): IActorState {
    const commandCtx = ctx as CommandContext | undefined
    if (!commandCtx) return this

    while (commandCtx.peek()) {
      const command = commandCtx.consume()
      if (!command) break
      this.applyCommand(command)
    }

    return this
  }

  private applyCommand(command: ActorCommand) {
    switch (command.type) {
      case "move":
        // console.log("[FighterShipState] move command", this.runtime.id, {
        //   point: command.point?.toArray?.(),
        //   direction: (command.payload as { direction?: THREE.Vector3 } | undefined)?.direction?.toArray?.(),
        // })
        this.navigationState = "move"
        if (command.point) {
          this.runtime.moveTo(command.point)
          return
        }

        if ((command.payload as { direction?: THREE.Vector3 } | undefined)?.direction) {
          this.runtime.moveAlong((command.payload as { direction?: THREE.Vector3 }).direction!)
        }
        return
      case "attack":
        if (!command.targetId) return
        this.combatState = "attack"
        this.runtime.attackTarget(command.targetId)
        return
      case "follow":
        if (!command.targetId) return
        this.navigationState = "follow"
        this.runtime.followTarget(command.targetId)
        return
      case "hold":
        this.navigationState = "hold"
        this.runtime.holdPosition()
        return
      default:
        // console.warn("[FighterShipState] dropping unsupported command", this.runtime.id, command.type, command)
        return
    }
  }
}
