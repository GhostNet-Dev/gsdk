import { IActorState } from "../../player/states/playerstate"
import { ActorCommand, CommandContext, IControllableRuntime } from "../controllabletypes"

export class IdleControllableState implements IActorState {
  constructor(private runtime: IControllableRuntime) {}

  Init(): void {}
  Uninit(): void {}

  Update(_delta: number, ctx?: unknown): IActorState {
    const commandCtx = ctx as CommandContext | undefined
    if (!commandCtx) return this

    const next = commandCtx.peek()
    if (!next) return this

    this.applyCommand(next)
    commandCtx.consume()
    return this
  }

  private applyCommand(command: ActorCommand) {
    switch (command.type) {
      case "move":
        if (command.point) this.runtime.moveTo?.(command.point)
        return
      case "attack":
        if (command.targetId) this.runtime.attackTarget?.(command.targetId)
        return
      case "hold":
        this.runtime.holdPosition?.()
        return
      case "follow":
        if (command.targetId) this.runtime.followTarget?.(command.targetId)
        return
      case "useSkill":
        if (typeof command.payload === "string") {
          this.runtime.useSkill?.(command.payload, undefined)
        }
        return
      default:
        return
    }
  }
}
