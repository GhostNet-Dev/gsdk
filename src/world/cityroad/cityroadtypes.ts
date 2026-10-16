import * as THREE from "three";

export enum CityRoadLayoutId {
  Radial5 = "radial5",
  Radial3 = "radial3",
  Radial4 = "radial4",
}

// 좌표 규약(기존 isInsideRadialPathOpening과 동일): 방향 = (cos θ, 0, sin θ).
// 0° = +X, 90° = +Z, -90° = -Z.
export type CityRoadPoint = { x: number; z: number }; // 도시 중심 기준 로컬 좌표(m)

export type CityRoadDef =
  | {
      kind: "radial";
      angleDeg: number;
      width: number;
      startRadius?: number; // 기본 = layout.clearingRadius. clearingRadius 이하여야 함
    }
  | {
      kind: "polyline";
      points: CityRoadPoint[]; // 첫 점: 빈터 안, 마지막 점: 바깥쪽 끝
      width: number;
      extendToEdge?: boolean; // 기본 true
    };

export interface CityRoadLayoutDef {
  id: CityRoadLayoutId;
  clearingRadius: number;
  roads: CityRoadDef[];
  rotationDeg?: number;
  entryEdgeMargin?: number; // 기본 16m
  entryZoneLength?: number; // 기본 30m
  blockConstruction?: boolean; // 기본 false
}

export const DefaultEntryEdgeMargin = 16;
export const DefaultEntryZoneLength = 30;

/** 수평 사각 범위(world). y는 무시한다. */
export interface CityRoadBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** 도로 판정용 선분. ray면 b 방향으로 무한히 연장된 반직선으로 판정한다. */
export interface CityRoadSegment {
  roadIndex: number;
  ax: number;
  az: number;
  bx: number;
  bz: number;
  halfWidth: number;
  ray: boolean;
  /** 시작점 뒤쪽을 판정에서 제외(radial 도로의 평평한 시작). 기존 isInsideRadialPathOpening과 같은 결과를 낸다. */
  flatStart: boolean;
}

export interface CityRoadEntry {
  roadIndex: number;
  /** 진입점(지면 끝에서 entryEdgeMargin만큼 안쪽) */
  entry: THREE.Vector3;
  /** 도시에서 바깥쪽을 향하는 진입 방향 */
  dir: THREE.Vector3;
  /** 진입점 → 도로 꺾임점들 → 빈터 경계 지점 */
  waypoints: THREE.Vector3[];
  width: number;
  /** 도로 방향의 각도(도, 0° = +X). 진입 예고 방위 계산용 */
  headingDeg: number;
}

export function boundsFromBox3(box: THREE.Box3): CityRoadBounds {
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z };
}
