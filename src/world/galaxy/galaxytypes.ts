import IEventController from "@Glibs/interface/ievent";
import * as THREE from "three";

export type FactionKey = "alliance" | "empire" | "guild" | "neutral";

export interface PlanetStats {
  economy: number;
  industry: number;
  defense: number;
  stationedFleet: number;
  population: number;
  resource: string;
}

export interface PlanetRingDef {
  textureKey: string;
  tiltX?: number;
  tiltY?: number;
}

export interface PlanetDef {
  id: string;
  name: string;
  faction: FactionKey;
  radius: number;
  assetKey: string;
  ring?: PlanetRingDef;
  stats: PlanetStats;
  description: string;
  links?: string[];
  position?: [number, number, number];
  manualPosition?: [number, number, number];
}

export interface GalaxyMapDef {
  selectedPlanetId: string;
  planets: PlanetDef[];
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
  economy: number;
  industry: number;
  defense: number;
  fleet: number;
  population: number;
  resource: string;
  degree: number;
  chokeScore: number;
  description: string;
  neighbors: { name: string, id: string }[];
}
