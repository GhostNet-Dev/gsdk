import * as THREE from "three";
import { FactionId } from "@Glibs/gameobjects/turntypes";
import { CurrencyType } from "@Glibs/inventory/wallet";
import { Char } from "@Glibs/loader/assettypes";
import {
  RivalCityDefId,
  RivalPolicyState,
  RivalScore,
  RivalSpecialResourceBag,
} from "@Glibs/gameobjects/rivalcity/rivalcitytypes";
import {
  StrategicPlanetId,
  StrategicPlanetProfileId,
} from "@Glibs/gameobjects/strategicgalaxy/strategicgalaxytypes";
import { BuildingType } from "@Glibs/interactives/building/ibuildingobj";
import { environmentDefs } from "@Glibs/interactives/environment/environmentdefs";
import { CitySceneSelection } from "@Glibs/systems/gamecenter/cityscenesessionstore";

export const ReadonlyCityObjectKind = {
  CivicCore: "civic-core",
  Building: "building",
  ConstructionSite: "construction-site",
} as const;

export type ReadonlyCityObjectKind =
  typeof ReadonlyCityObjectKind[keyof typeof ReadonlyCityObjectKind];

export type NpcEnvironmentNodeId = keyof typeof environmentDefs;

export interface ReadonlyCityObjectSnapshot {
  key: string;
  kind: ReadonlyCityObjectKind;
  nodeId: string;
  buildingType: BuildingType;
  assetKey: Char;
  position: THREE.Vector3;
  rotationY: number;
  scale: number;
  width: number;
  depth: number;
  level: number;
  buildProgress?: number;
}

export interface NpcEnvironmentObjectSnapshot {
  key: string;
  nodeId: NpcEnvironmentNodeId;
  position: THREE.Vector3;
  rotationY: number;
  scale: number;
}

export interface CityGroundTheme {
  color: THREE.Color;
}

export interface CitySceneSummary {
  cityId: string;
  name: string;
  planetId: StrategicPlanetId;
  profileId: StrategicPlanetProfileId;
  factionId: FactionId;
  factionLabel: string;
  kindLabel: string;
  cityDefId: RivalCityDefId;
  status: string;
  turn: number;
  score: RivalScore;
  policies: RivalPolicyState[];
  specialResources: RivalSpecialResourceBag;
  resourceOutput: Partial<Record<CurrencyType, number>>;
}

export interface ReadonlyCityLayoutSnapshot {
  selection: CitySceneSelection;
  ground: CityGroundTheme;
  cameraTarget: THREE.Vector3;
  objects: ReadonlyCityObjectSnapshot[];
  environment: NpcEnvironmentObjectSnapshot[];
  summary: CitySceneSummary;
}
