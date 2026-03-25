import { ActorCommand, ControlSource, PolicyContext } from "../controllabletypes"

export interface IControlPolicy {
  source: ControlSource
  tick(delta: number, ctx: PolicyContext): ActorCommand[]
  onEvent?(event: unknown, ctx: PolicyContext): void
}

export class PolicyRegistry {
  private readonly policies = new Map<string, IControlPolicy>()

  register(name: string, policy: IControlPolicy) {
    this.policies.set(name, policy)
  }

  get(name: string): IControlPolicy | undefined {
    return this.policies.get(name)
  }
}
