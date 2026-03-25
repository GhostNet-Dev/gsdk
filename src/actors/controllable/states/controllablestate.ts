import { ActorCommand, CommandContext, IControllableRuntime, IControllableState } from "../controllabletypes"

export class IdleControllableState implements IControllableState {
  constructor(private runtime: IControllableRuntime) {}

  Init(): void {}
  Uninit(): void {}

  Update(_delta: number, ctx: CommandContext): IControllableState {
    const next = ctx.peek()
    if (!next) return this

    this.applyCommand(next)
    ctx.consume()
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
