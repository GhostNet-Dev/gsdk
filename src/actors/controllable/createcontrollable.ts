import IEventController from "@Glibs/interface/ievent"
import { ControllableCtrl } from "./controllablectrl"
import { ControllableDb } from "./controllabledb"
import { IControllableRuntime } from "./controllabletypes"
import { IdleControllableState } from "./states/controllablestate"
import { IControlPolicy } from "./policy/controlpolicy"

export class CreateControllable {
  constructor(
    private readonly eventCtrl: IEventController,
    private readonly db: ControllableDb,
    private readonly policyFactory: (name: string) => IControlPolicy | undefined,
  ) {}

  create(id: string, runtime: IControllableRuntime): ControllableCtrl {
    const def = this.db.get(id)

    const manualName = def.policyMap?.manual ?? "human"
    const aiName = def.policyMap?.ai ?? "ai"

    const state = def.stateFactory(runtime) ?? new IdleControllableState(runtime)

    return new ControllableCtrl(
      id,
      runtime,
      this.eventCtrl,
      state,
      {
        manual: this.policyFactory(manualName),
        ai: this.policyFactory(aiName),
      },
      def.stats ?? { hp: 100, mp: 20, stamina: 100, attackMelee: 5, attackRanged: 5, defense: 5, speed: 1 },
      undefined,
      1200,
      def.defaultControlSource ?? "manual",
    )
  }
}
