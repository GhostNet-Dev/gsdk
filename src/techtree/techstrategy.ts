import { CostVector, WALLET_KEYS } from "@Glibs/inventory/wallet";
import { TechNode } from "./technode";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** 비용 계산 정책 인터페이스 */
export interface ICostPolicy {
  /** 다음 레벨 비용 계산(직접 비용 -> 곡선 순서) */
  nextCost(node: TechNode, nextLv: number): CostVector;
}

/** 환급 정책 인터페이스 (이 부분이 누락되었을 수 있습니다) */
export interface IRefundPolicy {
  /** currentLv -> targetLv로 레벨 다운 시 환급될 비용 합산 */
  refund(
    node: TechNode, 
    currentLv: number, 
    targetLv: number, 
    costOf: (lv: number) => CostVector
  ): CostVector;
}

/** 기본 비용정책: 고정 비용(cost[lv]) 우선, 없으면 curve(formula) 사용 */
export class DefaultCostPolicy implements ICostPolicy {
  nextCost(node: TechNode, nextLv: number): CostVector {
    if (node.hasDirectCost(nextLv)) return node.directCost(nextLv)!;

    const f = node.curve?.formula;
    if (!f || Object.keys(f).length === 0) {
      throw new Error(`[TechTree] 비용 정의가 없습니다: ${node.name} (Lv.${nextLv})`);
    }

    const out: CostVector = {};
    for (const k of WALLET_KEYS) {
      const base = f[`base${cap(String(k))}`] ?? 0;
      const slope = f[`perLv${cap(String(k))}`] ?? 0;
      const v = Math.round(base + slope * (nextLv - 1));
      if (v >= 0) out[k] = v;
    }
    return out;
  }
}

/** 기본 환급정책: 지정된 비율(0.0 ~ 1.0)만큼 비용을 돌려줌 */
export class FullRefundPolicy implements IRefundPolicy {
  constructor(private ratio = 1.0) {}

  refund(
    node: TechNode, 
    currentLv: number, 
    targetLv: number, 
    costOf: (lv: number) => CostVector
  ): CostVector {
    const give: CostVector = {};
    // 현재 레벨부터 목표 레벨까지 내려오면서 각 레벨에 소모되었던 비용을 합산
    for (let lv = currentLv; lv > targetLv; lv--) {
      const c = costOf(lv);
      for (const k of WALLET_KEYS) {
        const amount = c[k] ?? 0;
        const refundedAmount = Math.round(amount * this.ratio);
        give[k] = (give[k] ?? 0) + refundedAmount;
      }
    }
    return give;
  }
}