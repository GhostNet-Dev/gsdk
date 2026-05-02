import { CurrencyType } from "@Glibs/inventory/wallet";
import { FactionTurnModifier } from "@Glibs/gameobjects/turntypes";
import { RivalCityDef, RivalCityState, RivalResourceBag, RivalSpecialResourceBag } from "./rivalcitytypes";
import { BuildingProperty } from "@Glibs/interactives/building/buildingdefs";

export function computeBaseProduction(
  buildings: { buildingId: string; level: number }[],
  buildingDefs: Map<string, BuildingProperty>,
): RivalResourceBag {
  const result: RivalResourceBag = {};

  for (const b of buildings) {
    const def = buildingDefs.get(b.buildingId);
    if (!def?.production?.resources) continue;
    for (const [type, amount] of Object.entries(def.production.resources)) {
      const key = type as CurrencyType;
      result[key] = (result[key] ?? 0) + amount * b.level;
    }
  }

  return result;
}

export function applyBiases(
  base: RivalResourceBag,
  cityDef: RivalCityDef,
  factionModifier: FactionTurnModifier | undefined,
  planetBonus: Partial<Record<CurrencyType, number>>,
): RivalResourceBag {
  const result: RivalResourceBag = {};

  for (const [rawKey, rawAmount] of Object.entries(base)) {
    const key = rawKey as CurrencyType;
    let amount = rawAmount ?? 0;

    const cityBias     = cityDef.resourceBias[key] ?? 1;
    const factionBias  = factionModifier?.resourceBias[key] ?? 1;
    const planetBias   = planetBonus[key] ?? 1;

    result[key] = amount * cityBias * factionBias * planetBias;
  }

  return result;
}

export function computeSpecialResourceProduction(
  state: RivalCityState,
  def: RivalCityDef,
): RivalSpecialResourceBag {
  const result: RivalSpecialResourceBag = {};

  if (!def.specialResourceBias) return result;

  const buildingIds = state.buildings.map((b) => b.buildingId);

  for (const [resType, bias] of Object.entries(def.specialResourceBias)) {
    const key = resType as keyof RivalSpecialResourceBag;
    const base = computeSpecialBase(key, buildingIds);
    if (base > 0) {
      result[key] = (result[key] ?? 0) + base * (bias ?? 1);
    }
  }

  return result;
}

function computeSpecialBase(
  resType: keyof RivalSpecialResourceBag,
  buildingIds: string[],
): number {
  const count = (id: string) => buildingIds.filter((b) => b === id).length;

  switch (resType) {
    case "rareWood":
      return count("lumbermill") >= 3 && count("watermill") >= 1 ? 1 : 0;
    case "crystal":
      return count("mine") >= 2 && count("blacksmith") >= 1 ? 0.5 : 0;
    case "tradeInfluence":
      return count("market") >= 2 ? 2 : 0;
    case "knowledge":
      return count("blacksmith") >= 2 ? 1 : 0;
    case "civicTrust":
      return count("home_b") >= 2 || count("supply") >= 2 ? 1 : 0;
    default:
      return 0;
  }
}
