import * as THREE from "three";
import { TargetRecord } from "@Glibs/systems/targeting/targettypes";

export enum NavPathStatus {
  NoGrid = "no-grid",
  Complete = "complete",
  NoPath = "no-path",
}

export enum NavObstacleSource {
  StructureTarget = "structure-target",
  BuildingDestroyed = "building-destroyed",
}

export type NavGridCell = {
  x: number;
  z: number;
}

export type NavGridObstacle = {
  id: string;
  source: NavObstacleSource;
  position: THREE.Vector3;
  width: number;
  depth: number;
  bounds?: THREE.Box3;
}

export type NavGridBuildOptions = {
  center: THREE.Vector3;
  radius: number;
  gridSize: number;
  obstacles: readonly NavGridObstacle[];
  heightProvider?: { getHeightAt(worldX: number, worldZ: number): number };
  inflateWorld?: number;
}

export type NavPathRequest = {
  start: THREE.Vector3;
  target: TargetRecord;
  attackRange: number;
}

export type NavPathResult = {
  status: NavPathStatus;
  gridVersion: number;
  waypoints: THREE.Vector3[];
}

export interface INavGridService {
  readonly Version: number;
  readonly IsReady: boolean;
  build(options: NavGridBuildOptions): void;
  clear(): void;
  findPath(request: NavPathRequest): NavPathResult;
  snapToWalkable(pos: THREE.Vector3, maxRing?: number): THREE.Vector3;
  getHeightAt(worldX: number, worldZ: number, fallbackY?: number): number;
}
