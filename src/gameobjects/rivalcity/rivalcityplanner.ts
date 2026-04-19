import { FactionTurnModifier } from "@Glibs/gameobjects/turntypes";
import { CostVector, CurrencyType } from "@Glibs/inventory/wallet";
import { BuildingProperty } from "@Glibs/interactives/building/buildingdefs";
import { DefaultTechTreeDefs } from "@Glibs/techtree/techtreedefs";
import { RivalCityDef, RivalCityState, RivalResourceBag } from "./rivalcitytypes";
import { canAfford } from "./rivalcityrules";

export interface BuildCandidate {
  buildingId: string;
  score: number;
}

export function scoreCandidates(
  state: RivalCityState,
  def: RivalCityDef,
  factionModifier: FactionTurnModifier | undefined,
  planetBonus: Partial<Record<CurrencyType, number>>,
  buildingDefs: Map<string, BuildingProperty>,
  allBuildingIds: string[],
): BuildCandidate[] {
  const existingCount: Record<string, number> = {};
  for (const b of state.buildings) {
    existingCount[b.buildingId] = (existingCount[b.buildingId] ?? 0) + 1;
  }

  const candidates: BuildCandidate[] = [];

  for (const buildingId of allBuildingIds) {
    const bDef = buildingDefs.get(buildingId);
    if (!bDef) continue;
    if (bDef.isUnique && (existingCount[buildingId] ?? 0) > 0) continue;

    const cost = buildingCost(bDef);
    if (!cost) {
      console.warn(`[RivalCityPlanner] Building cost is missing, excluded: ${buildingId}`);
      continue;
    }
    if (!canAfford(state.resources, cost)) continue;
    if (def.avoidedBuildings?.includes(buildingId)) continue;

    let score = 10;

    if (def.preferredBuildings.includes(buildingId)) score += 20;
    if (def.openingBuildOrder?.includes(buildingId) && state.buildings.length < 6) score += 15;

    const policyWeight = def.policyWeights[activePolicyForBuilding(buildingId) as keyof typeof def.policyWeights] ?? 1;
    score += policyWeight * 2;

    const factionBias = factionModifier?.cityPolicyBias[buildingId] ?? 0;
    score += factionBias * 10;

    const planetBonusScore = Object.values(planetBonus).reduce((a, b) => a + b, 0);
    score += planetBonusScore * 5;

    score += resourceNeedScore(state.resources, bDef);

    const dupes = existingCount[buildingId] ?? 0;
    score -= dupes * 8;

    if (score > 0) candidates.push({ buildingId, score });
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export function choosePlan(candidates: BuildCandidate[]): string | null {
  if (candidates.length === 0) return null;
  const top = candidates.slice(0, Math.min(3, candidates.length));
  const totalScore = top.reduce((s, c) => s + c.score, 0);
  let rand = Math.random() * totalScore;
  for (const c of top) {
    rand -= c.score;
    if (rand <= 0) return c.buildingId;
  }
  return top[0].buildingId;
}

function resourceNeedScore(resources: RivalResourceBag, bDef: BuildingProperty): number {
  if (!bDef.production?.resources) return 0;
  let score = 0;
  for (const [type, amount] of Object.entries(bDef.production.resources)) {
    const current = resources[type as keyof RivalResourceBag] ?? 0;
    if (current < 50) score += (amount ?? 0) * 2;
  }
  return score;
}

export function buildingCost(bDef: BuildingProperty): RivalResourceBag | undefined {
  const definedCost = bDef.buildRequirements?.cost ?? findTechTreeCost(bDef);
  if (!definedCost || Object.keys(definedCost).length === 0) return undefined;
  return toRivalResourceBag(definedCost);
}

function findTechTreeCost(bDef: BuildingProperty): CostVector | undefined {
  const node = DefaultTechTreeDefs.find((def) => {
    if (def.kind !== "building") return false;
    return (def.tech as BuildingProperty).id === bDef.id;
  });
  return node?.cost?.find((cost) => cost.lv === 1)?.cost;
}

function toRivalResourceBag(cost: CostVector): RivalResourceBag {
  const result: RivalResourceBag = {};
  for (const [key, amount] of Object.entries(cost)) {
    if ((amount ?? 0) > 0) result[key as CurrencyType] = amount;
  }
  return result;
}

function activePolicyForBuilding(buildingId: string): string {
  const map: Record<string, string> = {
    lumbermill: "resourceExpansion",
    mine:       "industrialFocus",
    blacksmith: "industrialFocus",
    market:     "marketDominance",
    home_b:     "housingBoom",
    supply:     "housingBoom",
  };
  return map[buildingId] ?? "";
}
