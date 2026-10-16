import { StrategicPlanetCityPlacement, StrategicPlanetDef } from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";
import { CityRoadLayoutDef, CityRoadLayoutId } from "./cityroadtypes";
import { CityRoadLayouts, DefaultCityRoadLayoutId, isCityRoadLayoutId, PlanetProfileRoadLayouts } from "./cityroaddefs";

export interface CityRoadLayoutResolveInput {
  planetDef?: Pick<StrategicPlanetDef, "id" | "profileId" | "playerCityRoadLayoutId">;
  placementDef?: Pick<StrategicPlanetCityPlacement, "id" | "roadLayoutId">;
  cityDef?: { id: string; roadLayoutId?: CityRoadLayoutId };
  isPlayerCity: boolean;
}

export function getCityRoadLayout(id: unknown): CityRoadLayoutDef | undefined {
  return isCityRoadLayoutId(id) ? CityRoadLayouts[id] : undefined;
}

/**
 * 도시 도로 레이아웃 id를 정의 데이터만으로 결정한다.
 * SimcityState(숲), CitySceneService(NPC/라이벌 도시 뷰), PlayerDefenseState(진입점)가 공통으로 사용한다.
 */
export function resolveCityRoadLayoutId(input: CityRoadLayoutResolveInput): CityRoadLayoutId {
  const candidates: Array<[unknown, string]> = input.isPlayerCity
    ? [[input.planetDef?.playerCityRoadLayoutId, `planet ${input.planetDef?.id} playerCityRoadLayoutId`]]
    : [
        [input.placementDef?.roadLayoutId, `placement ${input.placementDef?.id} roadLayoutId`],
        [input.cityDef?.roadLayoutId, `city def ${input.cityDef?.id} roadLayoutId`],
      ];
  if (input.planetDef) {
    candidates.push([PlanetProfileRoadLayouts[input.planetDef.profileId], `profile ${input.planetDef.profileId}`]);
  }

  for (const [value, label] of candidates) {
    if (value === undefined) continue;
    if (isCityRoadLayoutId(value)) return value;
    console.warn(`[CityRoad] Unknown road layout id '${String(value)}' from ${label}; falling back.`);
  }
  return DefaultCityRoadLayoutId;
}

export function resolveCityRoadLayout(input: CityRoadLayoutResolveInput): CityRoadLayoutDef {
  return CityRoadLayouts[resolveCityRoadLayoutId(input)];
}
