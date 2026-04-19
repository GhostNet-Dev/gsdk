import { CurrencyType } from "@Glibs/inventory/wallet";
import { CityTurnOutput } from "@Glibs/gameobjects/turntypes";
import { PlanetMarketState } from "./strategicgalaxytypes";

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
      supply[key] = (supply[key] ?? 0) + (amount ?? 0);
    }
  }

  const baseScale = Math.max(1, marketScale / 100);
  for (const key of Object.values(CurrencyType)) {
    demand[key] = (supply[key] ?? 0) * baseScale * 0.8;
  }

  const saturation: Partial<Record<CurrencyType, number>> = {};
  const pricePressure: Partial<Record<CurrencyType, number>> = {};

  for (const key of Object.values(CurrencyType)) {
    const s = supply[key] ?? 0;
    const d = demand[key] ?? 0;
    if (d > 0) {
      saturation[key] = Math.min(2, s / d);
      pricePressure[key] = saturation[key]! > 1.2 ? -(saturation[key]! - 1) * 0.2 : (1 - saturation[key]!) * 0.15;
    }
  }

  return { supply, demand, saturation, pricePressure };
}

export function computePricePressure(
  market: PlanetMarketState,
): Partial<Record<CurrencyType, number>> {
  return { ...market.pricePressure };
}
