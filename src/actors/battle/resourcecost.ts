import { BaseSpec } from "./basespec";
import IInventory from "@Glibs/interface/iinven";
import { ItemId } from "@Glibs/inventory/items/itemdefs";
import { ActionCostSpec, CostAtom, CostNode, ResourceKey } from "./resourcecosttypes";
import { CombatResourceChangedPayload } from "@Glibs/types/globaltypes";

export type CostFailureReason = "NOT_ENOUGH_RESOURCE" | "INVALID_COST";

export type CostShortage = {
  key: ResourceKey;
  need: number;
  have: number;
};

export type CostResolution = {
  ok: boolean;
  ops: CostAtom[];
  optionalOps: CostAtom[];
  shortages: CostShortage[];
  reason?: CostFailureReason;
};

export type ResourceContext = {
  spec: BaseSpec;
  inventory?: IInventory;
  consumeInventoryItem?: (id: ItemId, count: number) => void;
  onResourceChanged?: (payload: CombatResourceChangedPayload) => void;
  actorId?: string;
  sourceId?: string;
};

export interface ResourceAdapter {
  supports(key: ResourceKey): boolean;
  get(key: ResourceKey): number;
  consume(atom: CostAtom): boolean;
}

class StatusResourceAdapter implements ResourceAdapter {
  constructor(private ctx: ResourceContext) {}

  supports(key: ResourceKey): boolean {
    return key === "hp" || key === "mp" || key === "stamina";
  }

  get(key: ResourceKey): number {
    if (key === "hp") return this.ctx.spec.status.health;
    if (key === "mp") return this.ctx.spec.status.mana;
    if (key === "stamina") return this.ctx.spec.status.stamina;
    return 0;
  }

  consume(atom: CostAtom): boolean {
    const prev = this.get(atom.key);

    let consumed = false;
    if (atom.key === "hp") consumed = this.ctx.spec.TryConsumeHealth(atom.amount);
    else if (atom.key === "mp") consumed = this.ctx.spec.TryConsumeMana(atom.amount);
    else if (atom.key === "stamina") consumed = this.ctx.spec.TryConsumeStamina(atom.amount);
    else return false;

    if (!consumed) return false;

    const maxByKey: Partial<Record<ResourceKey, number>> = {
      hp: this.ctx.spec.stats.getStat("hp"),
      mp: this.ctx.spec.stats.getStat("mp"),
      stamina: this.ctx.spec.stats.getStat("stamina"),
    };

    this.ctx.onResourceChanged?.({
      actorId: this.ctx.actorId ?? "unknown",
      key: atom.key,
      prev,
      next: this.get(atom.key),
      max: maxByKey[atom.key],
      reason: "cost",
      sourceId: this.ctx.sourceId,
    });

    return true;
  }
}

class InventoryResourceAdapter implements ResourceAdapter {
  constructor(private inventory?: IInventory, private consumeInventoryItem?: (id: ItemId, count: number) => void) {}

  supports(key: ResourceKey): boolean {
    return key.startsWith("item:");
  }

  get(key: ResourceKey): number {
    const itemId = key.substring(5) as ItemId;
    const slot = this.inventory?.GetItemSlot(itemId);
    return slot?.count ?? 0;
  }

  consume(atom: CostAtom): boolean {
    const itemId = atom.key.substring(5) as ItemId;
    const slot = this.inventory?.GetItemSlot(itemId);
    if (!slot || slot.count < atom.amount) return false;
    this.consumeInventoryItem?.(itemId, atom.amount);
    return true;
  }
}

export class CombatResourcePool {
  private readonly adapters: ResourceAdapter[];

  constructor(private ctx: ResourceContext, extraAdapters: ResourceAdapter[] = []) {
    this.adapters = [
      new StatusResourceAdapter(ctx),
      new InventoryResourceAdapter(ctx.inventory, ctx.consumeInventoryItem),
      ...extraAdapters,
    ];
  }

  private findAdapter(key: ResourceKey): ResourceAdapter | undefined {
    return this.adapters.find((adapter) => adapter.supports(key));
  }

  get(key: ResourceKey): number {
    const adapter = this.findAdapter(key);
    if (!adapter) return 0;
    return adapter.get(key);
  }

  consume(atom: CostAtom): boolean {
    if (atom.amount <= 0) return true;
    const adapter = this.findAdapter(atom.key);
    if (!adapter) return false;
    return adapter.consume(atom);
  }
}

export class CostEngine {
  resolve(spec: ActionCostSpec, pool: CombatResourcePool): CostResolution {
    const virtual = new Map<ResourceKey, number>();
    const getVirtual = (key: ResourceKey) => {
      if (!virtual.has(key)) virtual.set(key, pool.get(key));
      return virtual.get(key) ?? 0;
    };
    const applyVirtual = (key: ResourceKey, amount: number) => {
      virtual.set(key, getVirtual(key) - amount);
    };

    const requiredOps: CostAtom[] = [];
    const optionalOps: CostAtom[] = [];
    const shortages: CostShortage[] = [];

    const visit = (node: CostNode, optionalBranch = false): boolean => {
      if (node.type === "atom") {
        if (node.atom.amount <= 0) return true;
        const have = getVirtual(node.atom.key);
        if (have >= node.atom.amount) {
          applyVirtual(node.atom.key, node.atom.amount);
          (optionalBranch ? optionalOps : requiredOps).push(node.atom);
          return true;
        }

        if (optionalBranch) return false;
        shortages.push({ key: node.atom.key, need: node.atom.amount, have });
        return false;
      }

      if (node.type === "all") {
        for (const child of node.nodes) {
          if (!visit(child, optionalBranch)) return false;
        }
        return true;
      }

      if (node.type === "any") {
        for (const child of node.nodes) {
          const snap = new Map(virtual);
          const reqLen = requiredOps.length;
          const optLen = optionalOps.length;
          const shortageLen = shortages.length;

          if (visit(child, optionalBranch)) return true;

          virtual.clear();
          snap.forEach((v, k) => virtual.set(k, v));
          requiredOps.splice(reqLen);
          optionalOps.splice(optLen);
          shortages.splice(shortageLen);
        }

        if (!optionalBranch) shortages.push({ key: "any", need: 1, have: 0 });
        return false;
      }

      if (node.type === "optional") {
        visit(node.node, true);
        return true;
      }

      return false;
    };

    const ok = visit(spec.cost);
    return {
      ok,
      ops: requiredOps,
      optionalOps,
      shortages,
      reason: ok ? undefined : "NOT_ENOUGH_RESOURCE",
    };
  }

  commit(resolution: CostResolution, pool: CombatResourcePool): boolean {
    if (!resolution.ok) return false;

    for (const op of resolution.ops) {
      if (!pool.consume(op)) return false;
    }
    for (const op of resolution.optionalOps) {
      pool.consume(op);
    }
    return true;
  }
}
