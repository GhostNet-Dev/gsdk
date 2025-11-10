import { CostVector, WALLET_KEYS } from "@Glibs/inventory/wallet";
import { TechNode } from "./technode";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export interface ICostPolicy {
  /** 다음 레벨 비용 계산(직접 비용 → 곡선 순서) */
  nextCost(node: TechNode, nextLv: number): CostVector;
}
export interface IRefundPolicy {
  /** currentLv→targetLv로 다운 시 환급 비용(합산 결과) */
  refund(node: TechNode, currentLv: number, targetLv: number, costOf: (lv: number) => CostVector): CostVector;
}

/** 기본 비용정책: cost[lv]가 있으면 우선, 없으면 curve(formula) */
export class DefaultCostPolicy implements ICostPolicy {
  nextCost(node: TechNode, nextLv: number): CostVector {
    if (node.hasDirectCost(nextLv)) return node.directCost(nextLv)!;
    const f = node.curve?.formula ?? {};
    const out: CostVector = {};
    for (const k of WALLET_KEYS) {
      const base = f[`base${cap(String(k))}`] ?? 0;
      const slope = f[`perLv${cap(String(k))}`] ?? 0;
      const v = base + slope * (nextLv - 1);
      if (v > 0) out[k] = Math.round(v);
    }
    return out;
  }
}

/** 기본 환급정책: 100% 환급(필요 시 0.8 등으로 바꾼 구현 주입) */
export class FullRefundPolicy implements IRefundPolicy {
  constructor(private ratio = 1.0) {}
  refund(node: TechNode, currentLv: number, targetLv: number, costOf: (lv: number) => CostVector): CostVector {
    const give: CostVector = {};
    for (let lv = currentLv; lv > targetLv; lv--) {
      const c = costOf(lv);
      for (const k of WALLET_KEYS) {
        const part = Math.round((c[k] ?? 0) * this.ratio);
        give[k] = (give[k] ?? 0) + part;
      }
    }
    return give;
  }
}
