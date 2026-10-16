import { StrategicPlanetProfileId } from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";
import { CityRoadDef, CityRoadLayoutDef, CityRoadLayoutId } from "./cityroadtypes";

export function makeRadialRoads(count: number, width: number, offsetDeg: number): CityRoadDef[] {
  const roads: CityRoadDef[] = [];
  for (let index = 0; index < count; index++) {
    roads.push({ kind: "radial", angleDeg: offsetDeg + (360 / count) * index, width });
  }
  return roads;
}

export const CityRoadLayouts: Record<CityRoadLayoutId, CityRoadLayoutDef> = {
  // 기존 숲 도로(roadCount 5, roadWidth 12, offset -90°, clearing 100)와 같은 기하
  [CityRoadLayoutId.Radial5]: {
    id: CityRoadLayoutId.Radial5,
    clearingRadius: 100,
    roads: makeRadialRoads(5, 12, -90),
  },
  [CityRoadLayoutId.Radial4]: {
    id: CityRoadLayoutId.Radial4,
    clearingRadius: 100,
    roads: makeRadialRoads(4, 12, -90),
  },
  [CityRoadLayoutId.Radial3]: {
    id: CityRoadLayoutId.Radial3,
    clearingRadius: 100,
    roads: makeRadialRoads(3, 12, -90),
  },
};

export const PlanetProfileRoadLayouts: Partial<Record<StrategicPlanetProfileId, CityRoadLayoutId>> = {
  [StrategicPlanetProfileId.Fortress]: CityRoadLayoutId.Radial3,
  [StrategicPlanetProfileId.IceMoon]: CityRoadLayoutId.Radial4,
};

export const DefaultCityRoadLayoutId = CityRoadLayoutId.Radial5;

export function isCityRoadLayoutId(value: unknown): value is CityRoadLayoutId {
  return typeof value === "string" && value in CityRoadLayouts;
}
