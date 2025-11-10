import { CostVector, WALLET_KEYS, Wallet, addCost, geWallet, subWallet } from "@Glibs/inventory/wallet";
import { Requirement, Tag, TechId, TechTreeDefBase, TechTreeKind } from "./techtreedefs";
import { DefaultCostPolicy, FullRefundPolicy, ICostPolicy, IRefundPolicy } from "./techstrategy";
import { TechEvalEnv, IRequirementEvaluator, PlayerContext, RequirementEvaluator, TechLevels } from "./techeval";
import { TechIndex } from "./techindex";
import { TechNode } from "./technode";

export type CanLevelResult =
  | { ok: true; nextLv: number; cost: CostVector }
  | { ok: false; reason: string };

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

/** TechTree 전체 동작을 감싸는 퍼사드 */
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

  /** nextLv 비용(정책 반영) */
  costOf(nodeId: TechId, nextLv: number): CostVector {
    const node = this.mustNode(nodeId);
    return this.costPolicy.nextCost(node, nextLv);
  }

  /** 1→targetLv 누적 비용 */
  totalCostTo(nodeId: TechId, targetLv: number): CostVector {
    const node = this.mustNode(nodeId);
    const out: CostVector = {};
    for (let lv = 1; lv <= targetLv; lv++) addCost(out, this.costPolicy.nextCost(node, lv));
    return out;
  }

  canLevelUp(nodeId: TechId): CanLevelResult {
    const node = this.mustNode(nodeId);
    const curLv = this.levels[nodeId] ?? 0;
    if (curLv >= node.maxLv) return { ok: false, reason: "already at max level" };

    // 레벨1 해금 시 requires, 그 외에는 requiresPerLevel 포함
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

    const nextLv = curLv + 1;
    const cost = this.costPolicy.nextCost(node, nextLv);
    if (!geWallet(this.ctx.wallet, cost)) return { ok: false, reason: `insufficient cost for lv ${nextLv}` };

    return { ok: true, nextLv, cost };
  }

  levelUp(nodeId: TechId): boolean {
    const res = this.canLevelUp(nodeId);
    if (!res.ok) return false;
    subWallet(this.ctx.wallet, res.cost);
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
    for (const k of WALLET_KEYS) this.ctx.wallet[k] = (this.ctx.wallet[k] ?? 0) + (give[k] ?? 0);
    this.levels[nodeId] = targetLv;
    return true;
  }

  listAvailableNext(): AvailableNext[] {
    const env: TechEvalEnv = { levels: this.levels, index: this.index, ctx: this.ctx };
    const out: AvailableNext[] = [];
    for (const id of this.index.order) {
      const n = this.index.byId.get(id)!;
      const cur = this.levels[id] ?? 0;
      if (cur >= n.maxLv) continue;
      // 즉시 가능 여부만 필터
      const res = this.canLevelUp(id);
      if (res.ok) {
        out.push({ id, name: n.name, kind: n.kind, nextLv: res.nextLv, cost: res.cost, tags: n.tags });
      }
    }
    return out;
  }

  findByTags(tags: Tag[]): TechNode[] {
    const set = new Set(tags);
    const bag: TechNode[] = [];
    for (const n of this.index.byId.values()) {
      if (!n.tags?.length) continue;
      if (n.tags.some(t => set.has(t))) bag.push(n);
    }
    return bag;
  }

  recommendByTags(tags: Tag[]): AvailableNext[] {
    const ids = new Set(this.findByTags(tags).map(n => n.id));
    return this.listAvailableNext().filter(x => ids.has(x.id));
  }

  serialize() {
    return {
      levels: { ...this.levels },
      wallet: { ...this.ctx.wallet },
      playerLv: this.ctx.playerLv,
    };
  }
  restore(data: { levels: TechLevels; wallet: Wallet; playerLv: number }) {
    this.levels = { ...data.levels };
    this.ctx.wallet = { ...data.wallet };
    this.ctx.playerLv = data.playerLv;
  }

  private mustNode(id: TechId) {
    const n = this.index.byId.get(id);
    if (!n) throw new Error(`Tech node '${id}' not found`);
    return n;
  }
}