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
  /** 숲 나무 등 환경 장애물. 도로·빈터 mask로 셀을 제외할 수 있다. */
  EnvironmentTree = "environment-tree",
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
  /** 장애물별 확장 폭. 미지정 시 build 기본값 */
  inflateWorld?: number;
}

/**
 * 같은 source의 장애물 셀 중 셀 중심이 walkable 조건을 만족하는 셀을 막지 않는다.
 * 다른 source(예: structure)의 block은 해제하지 않는다.
 */
export type NavGridObstacleCellMask = {
  source: NavObstacleSource;
  isWalkableAt(worldX: number, worldZ: number): boolean;
}

export type NavGridBuildOptions = {
  center: THREE.Vector3;
  radius: number;
  gridSize: number;
  obstacles: readonly NavGridObstacle[];
  heightProvider?: { getHeightAt(worldX: number, worldZ: number): number };
  inflateWorld?: number;
  obstacleCellMasks?: readonly NavGridObstacleCellMask[];
}

/** 지형 연결성 검증처럼 특정 source의 장애물을 통과 가능으로 볼 때 쓴다. */
export type NavQueryOptions = {
  ignoreSources?: readonly NavObstacleSource[];
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
  /** 월드 지점까지의 경로. 진군 명령의 공성 접근처럼 타겟 레코드가 아닌 목표에 쓴다. */
  findPathToPoint(start: THREE.Vector3, goal: THREE.Vector3, options?: NavQueryOptions): NavPathResult;
  isWalkableAt(pos: THREE.Vector3, options?: NavQueryOptions): boolean;
  snapToWalkable(pos: THREE.Vector3, maxRing?: number): THREE.Vector3;
  getHeightAt(worldX: number, worldZ: number, fallbackY?: number): number;
}
