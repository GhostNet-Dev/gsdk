import { TechNode } from "./technode";
import { Requirement, TechId, TechTreeDefBase } from "./techtreedefs";

export class TechIndex {
  readonly byId = new Map<TechId, TechNode>();
  readonly byTechId = new Map<string, TechId>();
  readonly edges = new Map<TechId, Set<TechId>>();
  readonly indeg = new Map<TechId, number>();
  readonly order: TechId[] = [];

  static build(defs: TechTreeDefBase[]): TechIndex {
    const idx = new TechIndex();
    for (const d of defs) {
      const node = new TechNode(d);
      idx.byId.set(node.id, node);
      idx.byTechId.set(node.techId, node.id);
      idx.edges.set(node.id, new Set());
      idx.indeg.set(node.id, 0);
    }

    for (const n of idx.byId.values()) {
      for (const r of n.requires ?? []) {
        this.collectEdges(n.id, r, idx, false);
      }
    }

    const q: TechId[] = [];
    const deg = new Map(idx.indeg);
    for (const [id, d] of deg) if (d === 0) q.push(id);
    
    while (q.length) {
      const u = q.shift()!;
      idx.order.push(u);
      for (const v of idx.edges.get(u) ?? []) {
        deg.set(v, deg.get(v)! - 1);
        if (deg.get(v) === 0) q.push(v);
      }
    }

    if (idx.order.length !== idx.byId.size) {
      throw new Error("TechTree cycle detected in mandatory dependencies.");
    }
    return idx;
  }

  private static collectEdges(to: TechId, req: Requirement, idx: TechIndex, isNegative: boolean) {
    if (isNegative) return; // NOT 조건 내부의 의존성은 그래프 간선으로 치지 않음

    switch (req.type) {
      case "has":
        if (idx.byId.has(req.id)) this.addEdge(req.id, to, idx);
        break;
      case "skill":
        const from = idx.byTechId.get(String(req.id));
        if (from) this.addEdge(from, to, idx);
        break;
      case "all":
      case "any":
        for (const x of req.of) this.collectEdges(to, x, idx, isNegative);
        break;
      case "not":
        this.collectEdges(to, req.of, idx, true);
        break;
    }
  }

  private static addEdge(from: TechId, to: TechId, idx: TechIndex) {
    if (!idx.edges.get(from)!.has(to)) {
      idx.edges.get(from)!.add(to);
      idx.indeg.set(to, (idx.indeg.get(to) ?? 0) + 1);
    }
  }
}