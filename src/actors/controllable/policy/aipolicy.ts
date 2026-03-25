import { ActorCommand, ControlSource, PolicyContext } from "../controllabletypes"
import { IControlPolicy } from "./controlpolicy"

export type CommandPlanner = (delta: number, ctx: PolicyContext) => ActorCommand[]

export class AiPolicy implements IControlPolicy {
  source: ControlSource = "ai"

  constructor(private planner: CommandPlanner) {}

  tick(delta: number, ctx: PolicyContext): ActorCommand[] {
    return this.planner(delta, ctx)
  }
}
