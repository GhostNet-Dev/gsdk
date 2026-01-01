import { CostVector, WALLET_KEYS, Wallet, addCost, geWallet, subWallet } from "@Glibs/inventory/wallet";
import { Requirement, Tag, TechId, TechTreeDefBase, TechTreeKind } from "./techtreedefs";
import { DefaultCostPolicy, FullRefundPolicy, ICostPolicy, IRefundPolicy } from "./techstrategy";
import { TechEvalEnv, IRequirementEvaluator, PlayerContext, RequirementEvaluator, TechLevels } from "./techeval";
import { TechIndex } from "./techindex";
import { TechNode } from "./technode";

export type CanLevelResult =
  | { ok: true; nextLv: number; cost: CostVector }
  | { ok: false; reason: string; cost?: CostVector }; // 부족한 비용 정보를 위해 cost 추가

export type AvailableNext = {
  id: TechId;
  name: string;
  kind: TechTreeKind;
  nextLv: number;
  cost: CostVector;
  tags?: Tag[];
};

export interface TechTreeServiceOptions {
  costPolicy?: ICostPolicy;
  refundPolicy?: IRefundPolicy;
  requirementEvaluator?: IRequirementEvaluator;
}

export class TechTreeService {
  readonly index: TechIndex;
  levels: TechLevels;
  readonly ctx: PlayerContext;

  private readonly costPolicy: ICostPolicy;
  private readonly refundPolicy: IRefundPolicy;
  private readonly evaluator: IRequirementEvaluator;

  constructor(
    defs: TechTreeDefBase[],
    initial: { levels?: TechLevels; ctx: PlayerContext },
    opts: TechTreeServiceOptions = {}
  ) {
    this.index = TechIndex.build(defs);
    this.levels = { ...(initial.levels ?? {}) };
    this.ctx = initial.ctx;
    this.costPolicy = opts.costPolicy ?? new DefaultCostPolicy();
    this.refundPolicy = opts.refundPolicy ?? new FullRefundPolicy(1.0);
    this.evaluator = opts.requirementEvaluator ?? new RequirementEvaluator();
  }

  costOf(nodeId: TechId, nextLv: number): CostVector {
    const node = this.mustNode(nodeId);
    return this.costPolicy.nextCost(node, nextLv);
  }

  totalCostTo(nodeId: TechId, targetLv: number): CostVector {
    const node = this.mustNode(nodeId);
    const out: CostVector = {};
    for (let lv = 1; lv <= targetLv; lv++) {
        try {
            addCost(out, this.costPolicy.nextCost(node, lv));
        } catch (e) { break; } // 정의되지 않은 레벨 도달 시 중단
    }
    return out;
  }

  canLevelUp(nodeId: TechId): CanLevelResult {
    try {
      const node = this.mustNode(nodeId);
      const curLv = this.levels[nodeId] ?? 0;
      
      // 1. 최대 레벨 체크
      if (curLv >= node.maxLv) return { ok: false, reason: "already at max level" };

      // 2. 요구사항(Requirements) 체크
      const checkList: Requirement[] = [];
      if (curLv === 0 && node.requires?.length) checkList.push(...node.requires);
      if (node.requiresPerLevel?.length) checkList.push(...node.requiresPerLevel);

      const env: TechEvalEnv = { levels: this.levels, index: this.index, ctx: this.ctx };
      for (const r of checkList) {
        if (!this.evaluator.eval(r, env)) {
          const msg = this.evaluator.describe ? this.evaluator.describe(r) : "requirement";
          return { ok: false, reason: `requirement not met: ${msg}` };
        }
      }

      // 3. 비용(Cost) 체크
      const nextLv = curLv + 1;
      const cost = this.costPolicy.nextCost(node, nextLv);
      if (!geWallet(this.ctx.wallet, cost)) {
          return { ok: false, reason: `insufficient funds`, cost };
      }

      return { ok: true, nextLv, cost };
    } catch (e: any) {
      return { ok: false, reason: e.message };
    }
  }

  levelUp(nodeId: TechId): boolean {
    const res = this.canLevelUp(nodeId);
    if (!res.ok) return false;
    subWallet(this.ctx.wallet, res.cost!);
    this.levels[nodeId] = res.nextLv;
    return true;
  }

  refundDownTo(nodeId: TechId, targetLv: number): boolean {
    const node = this.mustNode(nodeId);
    const curLv = this.levels[nodeId] ?? 0;
    if (targetLv < 0 || targetLv > curLv) return false;
    
    const give = this.refundPolicy.refund(
      node,
      curLv,
      targetLv,
      (lv) => this.costPolicy.nextCost(node, lv)
    );
    
    for (const k of WALLET_KEYS) {
        this.ctx.wallet[k] = (this.ctx.wallet[k] ?? 0) + (give[k] ?? 0);
    }
    this.levels[nodeId] = targetLv;
    return true;
  }

  listAvailableNext(): AvailableNext[] {
    const out: AvailableNext[] = [];
    for (const id of this.index.order) {
      const res = this.canLevelUp(id);
      if (res.ok) {
        const n = this.index.byId.get(id)!;
        out.push({ id, name: n.name, kind: n.kind, nextLv: res.nextLv, cost: res.cost, tags: n.tags });
      }
    }
    return out;
  }

  private mustNode(id: TechId) {
    const n = this.index.byId.get(id);
    if (!n) throw new Error(`Tech node '${id}' not found`);
    return n;
  }
}