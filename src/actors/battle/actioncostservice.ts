import IInventory from "@Glibs/interface/iinven"
import { ItemId } from "@Glibs/inventory/items/itemdefs"
import { ResourceChangedPayload } from "@Glibs/types/globaltypes"
import { BaseSpec } from "./basespec"
import { CombatResourcePool, CostEngine } from "./resourcecost"
import { ActionCostSpec } from "./resourcecosttypes"

export type ActionCostConsumeOptions = {
  inventory?: IInventory
  consumeInventoryItem?: (id: ItemId, count: number) => void
  actorId?: string
  sourceId?: string
  onResourceChanged?: (payload: ResourceChangedPayload) => void
}

export class ActionCostService {
  private readonly costEngine = new CostEngine()

  tryConsume(spec: ActionCostSpec, baseSpec: BaseSpec, options?: ActionCostConsumeOptions) {
    const pool = new CombatResourcePool({
      spec: baseSpec,
      inventory: options?.inventory,
      consumeInventoryItem: options?.consumeInventoryItem,
      actorId: options?.actorId,
      sourceId: options?.sourceId ?? spec.id,
      onResourceChanged: options?.onResourceChanged,
    })

    const resolved = this.costEngine.resolve(spec, pool)
    if (!resolved.ok) return false
    return this.costEngine.commit(resolved, pool)
  }
}

export const actionCostService = new ActionCostService()
