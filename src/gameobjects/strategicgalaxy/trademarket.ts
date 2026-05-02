import { CurrencyType } from "@Glibs/inventory/wallet";
import { CityTurnOutput } from "@Glibs/gameobjects/turntypes";
import { PlanetMarketState } from "./strategicgalaxytypes";

export type TradeableCurrencyType = Exclude<
  CurrencyType,
  CurrencyType.Gold | CurrencyType.People | CurrencyType.Points | CurrencyType.Exp
>;

export const TRADEABLE_CURRENCY_TYPES = [
  CurrencyType.Wood,
  CurrencyType.Water,
  CurrencyType.Electric,
  CurrencyType.Food,
  CurrencyType.Materials,
  CurrencyType.Gems,
] as const satisfies readonly TradeableCurrencyType[];

export const BASE_DEMAND: Record<TradeableCurrencyType, number> = {
  [CurrencyType.Wood]: 80,
  [CurrencyType.Water]: 70,
  [CurrencyType.Electric]: 50,
  [CurrencyType.Food]: 90,
  [CurrencyType.Materials]: 60,
  [CurrencyType.Gems]: 12,
};

export const BASE_PRICE: Record<TradeableCurrencyType, number> = {
  [CurrencyType.Wood]: 3,
  [CurrencyType.Water]: 4,
  [CurrencyType.Electric]: 8,
  [CurrencyType.Food]: 5,
  [CurrencyType.Materials]: 7,
  [CurrencyType.Gems]: 40,
};

export function isTradeableCurrencyType(value: unknown): value is TradeableCurrencyType {
  return TRADEABLE_CURRENCY_TYPES.includes(value as TradeableCurrencyType);
}

export function updateMarketFromCityOutputs(
  market: PlanetMarketState,
  cityOutputs: CityTurnOutput[],
  marketScale: number,
): PlanetMarketState {
  const supply: Partial<Record<CurrencyType, number>> = {};
  const demand: Partial<Record<CurrencyType, number>> = {};

  for (const output of cityOutputs) {
    for (const [rawKey, amount] of Object.entries(output.resourceOutput)) {
      const key = rawKey as CurrencyType;
      if (!isTradeableCurrencyType(key)) continue;
      supply[key] = (supply[key] ?? 0) + (amount ?? 0);
    }
  }

  const baseScale = Math.max(0, marketScale / 100);
  for (const key of TRADEABLE_CURRENCY_TYPES) {
    demand[key] = BASE_DEMAND[key] * baseScale;
  }

  const saturation: Partial<Record<CurrencyType, number>> = {};
  const pricePressure: Partial<Record<CurrencyType, number>> = {};

  for (const key of TRADEABLE_CURRENCY_TYPES) {
    const s = supply[key] ?? 0;
    const d = demand[key] ?? 0;
    saturation[key] = d > 0 ? Math.min(2, s / d) : 0;
    pricePressure[key] = resolvePricePressure(saturation[key]!);
  }

  return { supply, demand, saturation, pricePressure };
}

export function computePricePressure(
  market: PlanetMarketState,
): Partial<Record<CurrencyType, number>> {
  return { ...market.pricePressure };
}

function resolvePricePressure(saturation: number): number {
  if (saturation > 1) {
    return Math.max(-0.2, -(saturation - 1) * 0.2);
  }
  return Math.min(0.15, (1 - saturation) * 0.15);
}
