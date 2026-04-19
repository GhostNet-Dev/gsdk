import { FactionId, CityTurnOutput } from "@Glibs/gameobjects/turntypes";
import { StrategicPlanetDef } from "./strategicgalaxytypes";

export interface LocalInfluenceResult {
  cityId: string;
  factionId: FactionId;
  score: number;
}

export function computeLocalInfluences(
  cityOutputs: Record<string, CityTurnOutput>,
  planetId: string,
  _planetDef: StrategicPlanetDef,
): LocalInfluenceResult[] {
  const results: LocalInfluenceResult[] = [];

  for (const [cityId, output] of Object.entries(cityOutputs)) {
    if (output.planetId !== planetId) continue;
    const score = output.score.total + output.score.prestige * 0.5;
    results.push({ cityId, factionId: output.factionId, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function computeFactionInfluence(
  localInfluences: LocalInfluenceResult[],
  existingInfluence: Partial<Record<FactionId, number>>,
  decayRate = 0.1,
): Partial<Record<FactionId, number>> {
  const result: Partial<Record<FactionId, number>> = {};

  // 기존 influence 감쇄
  for (const [factionId, value] of Object.entries(existingInfluence)) {
    result[factionId as FactionId] = (value ?? 0) * (1 - decayRate);
  }

  // 이번 턴 도시 기여분 추가
  for (const item of localInfluences) {
    result[item.factionId] = (result[item.factionId] ?? 0) + item.score * 0.05;
  }

  return result;
}

export function resolveControl(factionInfluence: Partial<Record<FactionId, number>>): {
  controllingFactionId?: FactionId;
  contested: boolean;
} {
  const entries = Object.entries(factionInfluence).sort(([, a], [, b]) => (b ?? 0) - (a ?? 0));
  if (entries.length === 0) return { contested: false };

  const [topId, topVal] = entries[0];
  const secondVal = entries[1]?.[1] ?? 0;

  const contested = secondVal > (topVal ?? 0) * 0.7;
  const controllingFactionId = (topVal ?? 0) > 0 ? (topId as FactionId) : undefined;

  return { controllingFactionId, contested };
}
