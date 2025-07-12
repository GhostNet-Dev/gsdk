import { ActionContext, ActionDef, IActionComponent, IActionUser } from "@Glibs/types/actiontypes"
import { ActionRegistry } from "../actionregistry"
import { ActionDefs } from "../actiontypes"

export class Skill {
  constructor(
    public id: string,
    public actions: IActionComponent[],
    public defs: ActionDef[],
    public level: number
  ) {}

  cast(caster: IActionUser, target: IActionUser) {
    const ctx: ActionContext = { source: caster, via: "skill" }

    for (let i = 0; i < this.actions.length; i++) {
      const def = this.defs[i]
      if (def.trigger === "onCast") {
        this.actions[i].activate?.(target, ctx)
      }
    }
  }
}

// export function createSkillFromActionDefs(
//   skillId: string,
//   level: number
// ): Skill | null {
//   const def = ActionDefs.find(d => d.id === skillId)
//   if (!def) return null

//   const levelData = def.levels?.[level - 1]
//   if (!levelData) return null

//   const mergedDef = {
//     ...def,
//     ...levelData
//   } as ActionDef

//   const action = ActionRegistry.create(mergedDef)
//   return new Skill(skillId, [action], [mergedDef], level)
// }
