import { CurrencyType, Wallet, WalletManager } from "@Glibs/inventory/wallet";
import { PlanetMarketState, StrategicPlanetId } from "./strategicgalaxytypes";
import {
  BASE_PRICE,
  isTradeableCurrencyType,
  TradeableCurrencyType,
} from "./trademarket";

export type TradeAction = "buy" | "sell";

export interface TradeRequest {
  action: TradeAction;
  resource: TradeableCurrencyType;
  quantity: number;
  planetId: StrategicPlanetId;
}

export interface TradeQuote {
  unitPrice: number;
  totalGold: number;
  pricePressure: number;
}

export type TradeResult =
  | { ok: true; quote: TradeQuote }
  | { ok: false; reason: string };

export class TradeService {
  constructor(
    private readonly wallet: WalletManager,
    private readonly getMarketState: (planetId: StrategicPlanetId) => PlanetMarketState | undefined,
  ) {}

  getWallet(): Readonly<Wallet> {
    return this.wallet.getWallet();
  }

  quote(request: TradeRequest): TradeResult {
    const validation = this.validateRequest(request);
    if (validation) return validation;

    const market = this.getMarketState(request.planetId);
    if (!market) {
      return { ok: false, reason: "시장 정보를 찾을 수 없습니다." };
    }

    const pricePressure = market.pricePressure[request.resource] ?? 0;
    const unitPrice = BASE_PRICE[request.resource] * (1 + pricePressure);
    const totalGold = Math.floor(unitPrice * request.quantity);

    if (!Number.isFinite(totalGold) || totalGold <= 0) {
      return { ok: false, reason: "거래 금액을 계산할 수 없습니다." };
    }

    return {
      ok: true,
      quote: {
        unitPrice,
        totalGold,
        pricePressure,
      },
    };
  }

  execute(request: TradeRequest): TradeResult {
    const quoteResult = this.quote(request);
    if (!quoteResult.ok) return quoteResult;

    const { totalGold } = quoteResult.quote;
    if (request.action === "sell") {
      if (this.wallet.getAmount(request.resource) < request.quantity) {
        return { ok: false, reason: "보유 자원이 부족합니다." };
      }

      const subtracted = this.wallet.subtract(request.resource, request.quantity);
      if (!subtracted) {
        return { ok: false, reason: "보유 자원이 부족합니다." };
      }
      this.wallet.add(CurrencyType.Gold, totalGold);
      return quoteResult;
    }

    if (this.wallet.getAmount(CurrencyType.Gold) < totalGold) {
      return { ok: false, reason: "골드가 부족합니다." };
    }

    const paid = this.wallet.subtract(CurrencyType.Gold, totalGold);
    if (!paid) {
      return { ok: false, reason: "골드가 부족합니다." };
    }
    this.wallet.add(request.resource, request.quantity);
    return quoteResult;
  }

  private validateRequest(request: TradeRequest): TradeResult | undefined {
    if (!request) {
      return { ok: false, reason: "거래 요청이 없습니다." };
    }
    if (request.action !== "buy" && request.action !== "sell") {
      return { ok: false, reason: "지원하지 않는 거래 방식입니다." };
    }
    if (!isTradeableCurrencyType(request.resource)) {
      return { ok: false, reason: "거래할 수 없는 자원입니다." };
    }
    if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
      return { ok: false, reason: "거래 수량은 1 이상의 정수여야 합니다." };
    }
    if (!request.planetId) {
      return { ok: false, reason: "행성 정보가 없습니다." };
    }
    return undefined;
  }
}
