import { ActionRegistry } from "./actionregistry"
import { StatBoostAction } from "./itemactions/statboostact"
import { FireballAction } from "./skillactions/fireballact"

ActionRegistry.register("statBoost", def => new StatBoostAction(def.stats))
ActionRegistry.register("fireball", def => new FireballAction())
