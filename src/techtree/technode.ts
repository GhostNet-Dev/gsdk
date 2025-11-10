import { CostVector } from "@Glibs/inventory/wallet";
import { Requirement, Tag, TechId, TechTreeDefBase, TechTreeKind, TechTreeTypes } from "./techtreedefs";

export class TechNode {
  readonly id: TechId;
  readonly kind: TechTreeKind;
  readonly name: string;
  readonly desc?: string;
  readonly tags?: Tag[];
  readonly requires?: Requirement[];
  readonly requiresPerLevel?: Requirement[];
  readonly tech: TechTreeTypes;

  /** 선언형 비용표(직접 지정) */
  private readonly costByLv = new Map<number, CostVector>();
  /** 곡선 비용(백업) */
  readonly curve?: { formula: Record<string, number> };
  /** 최대 레벨 */
  readonly maxLv: number;
  /** 원천 tech.id(Action/Buff 등) */
  readonly techId: string;

  constructor(def: TechTreeDefBase) {
    this.id = def.id;
    this.kind = def.kind;
    this.name = def.name;
    this.desc = def.desc;
    this.tags = def.tags;
    this.requires = def.requires;
    this.requiresPerLevel = def.requiresPerLevel;
    this.tech = def.tech;
    this.curve = def.curve;
    const techId = (def.tech as any)?.id ?? def.id;
    this.techId = String(techId);

    let max = 0;
    for (const c of def.cost ?? []) {
      this.costByLv.set(c.lv, { ...c.cost });
      max = Math.max(max, c.lv);
    }
    // cost 정의가 없으면 곡선만 사용 → 기본 상한 (옵션으로 외부 주입 가능)
    this.maxLv = max || 50;
  }

  hasDirectCost(lv: number) {
    return this.costByLv.has(lv);
  }
  directCost(lv: number): CostVector | undefined {
    const c = this.costByLv.get(lv);
    return c ? { ...c } : undefined;
  }
}
