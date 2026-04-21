import IEventController from "@Glibs/interface/ievent";
import { CurrencyType } from "@Glibs/inventory/wallet";
import * as THREE from "three";

export type FactionKey = "alliance" | "empire" | "guild" | "neutral";

export const GalaxyCityKind = {
  Player: "player",
  Rival: "rival",
  Native: "native",
} as const;

export type GalaxyCityKind = typeof GalaxyCityKind[keyof typeof GalaxyCityKind];

export const GalaxyPlanetAssetKey = {
  AmberBands: "amberBands",
  RoseSpots: "roseSpots",
  AzureIce: "azureIce",
  BasaltCracks: "basaltCracks",
  CobaltSwirl: "cobaltSwirl",
  GoldenRings: "goldenRings",
  GreenGlow: "greenGlow",
  DarkRock: "darkRock",
  VoidMatter: "voidMatter",
  SolarFlare: "solarFlare",
} as const;

export type GalaxyPlanetAssetKey =
  typeof GalaxyPlanetAssetKey[keyof typeof GalaxyPlanetAssetKey];

export const GalaxyRingTextureKey = {
  Aurora: "aurora",
  Prism: "prism",
} as const;

export type GalaxyRingTextureKey =
  typeof GalaxyRingTextureKey[keyof typeof GalaxyRingTextureKey];

export interface PlanetStats {
  economy: number;
  industry: number;
  defense: number;
  stationedFleet: number;
  population: number;
  resource: string;
}

export interface GalaxyResourceBonusViewModel {
  type: CurrencyType;
  label: string;
  multiplier: number;
  percentText: string;
}

export interface GalaxySpecialResourceViewModel {
  id: string;
  label: string;
  amount?: number;
}

export interface GalaxyMarketResourceViewModel {
  type: CurrencyType;
  label: string;
  supply: number;
  demand: number;
  pricePressure: number;
  pricePressureText: string;
}

export interface GalaxyCityViewModel {
  id: string;
  name: string;
  kind: GalaxyCityKind;
  kindLabel: string;
  factionId: FactionKey;
  factionLabel: string;
  cityDefId?: string;
  score?: number;
  description?: string;
}

export interface PlanetRingDef {
  textureKey: GalaxyRingTextureKey;
  tiltX?: number;
  tiltY?: number;
}

export interface PlanetDef<TPlanetId extends string = string> {
  id: TPlanetId;
  name: string;
  factionId: FactionKey;
  radius: number;
  assetKey: GalaxyPlanetAssetKey;
  ring?: PlanetRingDef;
  stats: PlanetStats;
  resourceBonuses?: GalaxyResourceBonusViewModel[];
  specialResources?: GalaxySpecialResourceViewModel[];
  marketResources?: GalaxyMarketResourceViewModel[];
  cities?: GalaxyCityViewModel[];
  cityCount?: number;
  stability?: number;
  blockadeLevel?: number;
  description: string;
  links?: TPlanetId[];
  position?: [number, number, number];
  manualPosition?: [number, number, number];
}

export interface GalaxyRouteDef<
  TPlanetId extends string = string,
  TRouteId extends string = string,
> {
  id: TRouteId;
  fromPlanetId: TPlanetId;
  toPlanetId: TPlanetId;
}

export interface GalaxyMapDef<
  TPlanetId extends string = string,
  TRouteId extends string = string,
> {
  selectedPlanetId: TPlanetId;
  planets: PlanetDef<TPlanetId>[];
  routes?: GalaxyRouteDef<TPlanetId, TRouteId>[];
}

export interface GalaxyLayoutOptions {
  pattern: "radialMindMap";
  seed?: number;
  planeY?: number;
  ringSpacing?: number;
  radialJitter?: number;
  tangentJitter?: number;
  rootSectorPadding?: number;
  sectorPadding?: number;
}

export interface GalaxyFocusOptions {
  neighborDepth?: number;
  distance?: number;
  tweenSeconds?: number;
}

export interface GalaxyLabelOptions {
  fontSize?: number;
  baseScale?: number;
  offset?: number;
}

export interface GalaxyPlanetNetworkOptions {
  placementMode?: "optimized" | "manual";
  layout?: GalaxyLayoutOptions;
  focus?: GalaxyFocusOptions;
  label?: GalaxyLabelOptions;
}

export interface GalaxySkyboxOptions {
  starCount?: number;
  starRadius?: number;
  dustCount?: number;
}

export interface CameraRigAdapter {
  target: THREE.Vector3;
  minDistance?: number;
  maxDistance?: number;
  domElement?: HTMLElement;
  update?: () => void;
}

export interface GalaxyContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  eventCtrl: IEventController
  controls?: CameraRigAdapter;
  interactionDom?: HTMLElement;
  uiRoot?: HTMLElement;
}

export interface PlanetInfoViewModel {
  id: string;
  name: string;
  factionLabel: string;
  factionTextColor: string;
  factionBgColor: string;
  factionBorderColor: string;
  isChokepoint: boolean;
  subtitle: string;
  fleet: number;
  resource: string;
  resourceBonuses: GalaxyResourceBonusViewModel[];
  specialResources: GalaxySpecialResourceViewModel[];
  marketResources: GalaxyMarketResourceViewModel[];
  cities: GalaxyCityViewModel[];
  cityCount: number;
  selectedCityId?: string;
  stability: number;
  blockadeLevel: number;
  degree: number;
  chokeScore: number;
  description: string;
  neighbors: { name: string, id: string }[];
}
