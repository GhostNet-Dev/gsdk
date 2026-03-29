import { BaseSpec } from "@Glibs/actors/battle/basespec"
import IEventController, { ILoop } from "@Glibs/interface/ievent"
import { IActionComponent, IActionUser, ActionContext } from "@Glibs/types/actiontypes"
import { EventTypes } from "@Glibs/types/globaltypes"
import {
  ActorCommand,
  CommandArbiter,
  CommandContext,
  ControlSource,
  IControllableRuntime,
  PolicyContext,
} from "./controllabletypes"
import { IControlPolicy } from "./policy/controlpolicy"
import { IActorState } from "../player/states/playerstate"

export class ControllableCtrl implements ILoop, IActionUser {
  LoopId = 0
  actions: IActionComponent[] = []
  commandQueue: ActorCommand[] = []

  private lastHumanCommandAt = 0
  private activeSource: ControlSource

  readonly baseSpec: BaseSpec

  constructor(
    public name: string,
    private runtime: IControllableRuntime,
    private eventCtrl: IEventController,
    private state: IActorState,
    private policies: Partial<Record<ControlSource, IControlPolicy>>,
    stats: ConstructorParameters<typeof BaseSpec>[0],
    private arbiter: CommandArbiter = ControllableCtrl.defaultArbiter,
    private readonly humanPriorityWindowMs = 1200,
    source: ControlSource = "manual",
  ) {
    this.baseSpec = new BaseSpec(stats, this)
    this.activeSource = source

    this.eventCtrl.SendEventMessage(EventTypes.RegisterLoop, this)
  }

  get objs() {
    return undefined
  }

  setControlSource(source: ControlSource) {
    this.activeSource = source
  }

  enqueue(command: ActorCommand) {
    this.commandQueue.push(command)
    if (command.issuer === "human") this.lastHumanCommandAt = command.issuedAt
  }

  update(delta: number): void {
    this.collectCommands(delta)

    const ctx: CommandContext = {
      actorId: this.runtime.id,
      queue: this.commandQueue,
      consume: () => this.commandQueue.shift(),
      peek: () => this.commandQueue[0],
    }
    this.state = this.state.Update(delta, ctx as unknown as undefined)
  }

  applyAction(action: IActionComponent, context?: ActionContext): void {
    action.apply?.(this, context)
    action.activate?.(this, context)
  }

  removeAction(action: IActionComponent, context?: ActionContext): void {
    action.deactivate?.(this, context)
    action.remove?.(this)
  }

  release() {
    this.eventCtrl.SendEventMessage(EventTypes.DeregisterLoop, this)
  }

  private collectCommands(delta: number) {
    const now = Date.now()
    const candidates: ActorCommand[] = []
    const sources = this.resolveSources(now)
    for (const source of sources) {
      const policy = this.policies[source]
      if (!policy) continue
      const generated = policy.tick(delta, this.policyCtx(now))
      for (const command of generated) candidates.push(command)
    }

    if (candidates.length === 0) return

    const filtered = candidates.filter((command: ActorCommand) => command.actorId === this.runtime.id)
    this.commandQueue.push(...this.arbiter(filtered))
  }

  private resolveSources(now: number): ControlSource[] {
    if (this.activeSource !== "hybrid") return [this.activeSource]

    const withinHumanWindow = now - this.lastHumanCommandAt <= this.humanPriorityWindowMs
    return withinHumanWindow ? ["manual", "ai"] : ["ai", "manual"]
  }

  private policyCtx(now: number): PolicyContext {
    return {
      actorId: this.runtime.id,
      controlSource: this.activeSource,
      now,
    }
  }

  private static defaultArbiter(commands: ActorCommand[]): ActorCommand[] {
    return [...commands].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }
}
