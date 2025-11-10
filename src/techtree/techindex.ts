import { TechNode } from "./technode";
import { Requirement, TechId, TechTreeDefBase } from "./techtreedefs";

export class TechIndex {
  readonly byId = new Map<TechId, TechNode>();
  readonly byTechId = new Map<string, TechId>();
  readonly edges = new Map<TechId, Set<TechId>>(); // u→v : v depends on u
  readonly indeg = new Map<TechId, number>();
  readonly order: TechId[]; // topological order

  private constructor() {
    this.order = [];
  }

  static build(defs: TechTreeDefBase[]): TechIndex {
    const idx = new TechIndex();

    // 1) 노드 등록
    for (const d of defs) {
      const node = new TechNode(d);
      idx.byId.set(node.id, node);
      idx.byTechId.set(node.techId, node.id);
      idx.edges.set(node.id, new Set());
      idx.indeg.set(node.id, 0);
    }

    // 2) 간선 구축 (requires 중 has/skill만 DAG 간선)
    for (const n of idx.byId.values()) {
      for (const r of n.requires ?? []) {
        TechIndex.collectEdges(n.id, r, idx);
      }
    }

    // 3) 위상 정렬/검증
    idx.order.push(...TechIndex.topo(idx.edges, idx.indeg));
    if (idx.order.length !== idx.byId.size) {
      throw new Error("TechTree cycle detected or invalid dependency.");
    }
    return idx;
  }

  private static collectEdges(to: TechId, req: Requirement, idx: TechIndex) {
    switch (req.type) {
      case "has": {
        if (idx.byId.has(req.id)) {
          const from = req.id;
          if (!idx.edges.get(from)!.has(to)) {
            idx.edges.get(from)!.add(to);
            idx.indeg.set(to, (idx.indeg.get(to) ?? 0) + 1);
          }
        }
        break;
      }
      case "skill": {
        const from = idx.byTechId.get(String(req.id));
        if (from && idx.byId.has(from)) {
          if (!idx.edges.get(from)!.has(to)) {
            idx.edges.get(from)!.add(to);
            idx.indeg.set(to, (idx.indeg.get(to) ?? 0) + 1);
          }
        }
        break;
      }
      case "all":
      case "any":
        for (const x of req.of) TechIndex.collectEdges(to, x, idx);
        break;
      case "not":
        TechIndex.collectEdges(to, req.of, idx);
        break;
      default:
        // tag/playerLv/points/quest/stat 등은 DAG 간선 아님
        break;
    }
  }

  private static topo(
    edges: Map<TechId, Set<TechId>>,
    indeg: Map<TechId, number>
  ): TechId[] {
    const q: TechId[] = [];
    const deg = new Map(indeg);
    for (const [id, d] of deg) if (d === 0) q.push(id);
    const out: TechId[] = [];
    while (q.length) {
      const u = q.shift()!;
      out.push(u);
      for (const v of edges.get(u) ?? []) {
        deg.set(v, (deg.get(v) ?? 0) - 1);
        if ((deg.get(v) ?? 0) === 0) q.push(v);
      }
    }
    return out;
  }
}