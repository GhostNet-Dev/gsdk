import * as THREE from "three";
import { GridCell } from "@Glibs/interactives/placement/gridrangeutils";
import {
  CityRoadBounds,
  CityRoadEntry,
  CityRoadLayoutDef,
  CityRoadPoint,
  CityRoadSegment,
  DefaultEntryEdgeMargin,
  DefaultEntryZoneLength,
} from "./cityroadtypes";

const DIR_EPSILON = 1e-6;
const DEG2RAD = Math.PI / 180;

/** 도로 판정은 지면 bounds와 무관하게 중심 기준이므로 레이아웃·중심별로 캐시한다. */
const segmentCache = new WeakMap<CityRoadLayoutDef, Map<string, CityRoadSegment[]>>();

interface ResolvedRoadPath {
  roadIndex: number;
  width: number;
  /** world 좌표의 도로 중심선 점. 첫 점은 빈터 쪽 */
  points: THREE.Vector3[];
  /** 마지막 점에서 지면 경계까지 연장하는지 여부 */
  extendToEdge: boolean;
  /** radial처럼 시작 쪽 캡이 없는(평평한) 도로인지 여부 */
  flatStart: boolean;
}

function rotatePoint(point: CityRoadPoint, rotationDeg: number): CityRoadPoint {
  if (!rotationDeg) return { x: point.x, z: point.z };
  const angle = rotationDeg * DEG2RAD;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: point.x * cos - point.z * sin, z: point.x * sin + point.z * cos };
}

function resolveRoadPaths(layout: CityRoadLayoutDef, center: THREE.Vector3): ResolvedRoadPath[] {
  const rotationDeg = layout.rotationDeg ?? 0;
  const paths: ResolvedRoadPath[] = [];

  layout.roads.forEach((road, roadIndex) => {
    if (road.width <= 0) return;
    if (road.kind === "radial") {
      const angle = (road.angleDeg + rotationDeg) * DEG2RAD;
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);
      const startRadius = road.startRadius ?? layout.clearingRadius;
      paths.push({
        roadIndex,
        width: road.width,
        points: [
          new THREE.Vector3(center.x + dirX * startRadius, 0, center.z + dirZ * startRadius),
          new THREE.Vector3(center.x + dirX * (startRadius + 1), 0, center.z + dirZ * (startRadius + 1)),
        ],
        extendToEdge: true,
        flatStart: true,
      });
      return;
    }

    if (road.points.length < 2) return;
    paths.push({
      roadIndex,
      width: road.width,
      points: road.points.map((point) => {
        const rotated = rotatePoint(point, rotationDeg);
        return new THREE.Vector3(center.x + rotated.x, 0, center.z + rotated.z);
      }),
      extendToEdge: road.extendToEdge ?? true,
      flatStart: false,
    });
  });

  return paths;
}

/** 레이아웃의 도로 판정 선분 목록. 레이아웃·중심마다 한 번만 계산한다. */
export function buildRoadSegments(layout: CityRoadLayoutDef, center: THREE.Vector3): CityRoadSegment[] {
  const key = `${center.x.toFixed(3)},${center.z.toFixed(3)}`;
  let byCenter = segmentCache.get(layout);
  const cached = byCenter?.get(key);
  if (cached) return cached;

  const segments: CityRoadSegment[] = [];
  for (const path of resolveRoadPaths(layout, center)) {
    const halfWidth = path.width * 0.5;
    const last = path.points.length - 1;
    for (let index = 0; index < last; index++) {
      const a = path.points[index];
      const b = path.points[index + 1];
      const isLast = index === last - 1;
      if (isLast && path.extendToEdge) {
        // 바깥 끝은 반직선으로 판정해 지면 경계에서 둥근 캡 틈이 생기지 않게 한다.
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const len = Math.hypot(dx, dz);
        if (len < DIR_EPSILON) continue;
        segments.push({
          roadIndex: path.roadIndex,
          ax: a.x,
          az: a.z,
          bx: a.x + dx / len,
          bz: a.z + dz / len,
          halfWidth,
          ray: true,
          flatStart: path.flatStart && index === 0,
        });
        continue;
      }
      segments.push({
        roadIndex: path.roadIndex,
        ax: a.x,
        az: a.z,
        bx: b.x,
        bz: b.z,
        halfWidth,
        ray: false,
        flatStart: path.flatStart && index === 0,
      });
    }
  }

  if (!byCenter) {
    byCenter = new Map();
    segmentCache.set(layout, byCenter);
  }
  byCenter.set(key, segments);
  return segments;
}

/** 점에서 선분(또는 반직선)까지의 수평 거리. flatStart 선분의 시작점 뒤쪽은 Infinity */
export function distanceToRoadSegment(x: number, z: number, segment: CityRoadSegment): number {
  const dx = segment.bx - segment.ax;
  const dz = segment.bz - segment.az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < DIR_EPSILON) return Math.hypot(x - segment.ax, z - segment.az);

  let t = ((x - segment.ax) * dx + (z - segment.az) * dz) / lenSq;
  if (t < 0) {
    if (segment.flatStart) return Infinity;
    t = 0;
  } else if (!segment.ray && t > 1) {
    t = 1;
  }
  return Math.hypot(x - (segment.ax + dx * t), z - (segment.az + dz * t));
}

/** 빈터를 제외한 도로 영역 판정. 맞으면 해당 도로 index, 아니면 -1 */
export function findRoadAt(
  x: number,
  z: number,
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
  clearanceRadius = 0,
): number {
  for (const segment of buildRoadSegments(layout, center)) {
    if (distanceToRoadSegment(x, z, segment) <= segment.halfWidth + clearanceRadius) {
      return segment.roadIndex;
    }
  }
  return -1;
}

export function isInsideRoadClearing(
  x: number,
  z: number,
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
  clearanceRadius = 0,
): boolean {
  const radius = layout.clearingRadius + clearanceRadius;
  const dx = x - center.x;
  const dz = z - center.z;
  return dx * dx + dz * dz <= radius * radius;
}

/**
 * 빈터 또는 도로 위인지 판정한다.
 * clearanceRadius는 footprint/콜라이더가 있는 오브젝트의 점유 반경으로, 도로 폭을 그만큼 보수적으로 넓힌다.
 */
export function isInsideRoadLayoutOpening(
  position: THREE.Vector3,
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
  clearanceRadius = 0,
): boolean {
  return isInsideRoadClearing(position.x, position.z, layout, center, clearanceRadius)
    || findRoadAt(position.x, position.z, layout, center, clearanceRadius) >= 0;
}

/** 사각 bounds 경계까지의 거리(p에서 dir 방향). 경계 밖에서 시작하면 음수일 수 있다. */
export function distanceToBoundsEdge(p: THREE.Vector3, dir: THREE.Vector3, bounds: CityRoadBounds): number {
  const tX = Math.abs(dir.x) > DIR_EPSILON
    ? (dir.x > 0 ? bounds.maxX - p.x : p.x - bounds.minX) / Math.abs(dir.x)
    : Infinity;
  const tZ = Math.abs(dir.z) > DIR_EPSILON
    ? (dir.z > 0 ? bounds.maxZ - p.z : p.z - bounds.minZ) / Math.abs(dir.z)
    : Infinity;
  return Math.min(tX, tZ);
}

function distanceToNearestEdge(p: THREE.Vector3, bounds: CityRoadBounds): number {
  return Math.min(p.x - bounds.minX, bounds.maxX - p.x, p.z - bounds.minZ, bounds.maxZ - p.z);
}

function clampToBounds(p: THREE.Vector3, bounds: CityRoadBounds): THREE.Vector3 {
  return new THREE.Vector3(
    THREE.MathUtils.clamp(p.x, bounds.minX, bounds.maxX),
    0,
    THREE.MathUtils.clamp(p.z, bounds.minZ, bounds.maxZ),
  );
}

/** 바깥(o) → 안(i) 선분이 빈터 원과 만나는 지점 */
function intersectClearing(o: THREE.Vector3, i: THREE.Vector3, center: THREE.Vector3, radius: number): THREE.Vector3 {
  const dx = i.x - o.x;
  const dz = i.z - o.z;
  const fx = o.x - center.x;
  const fz = o.z - center.z;
  const a = dx * dx + dz * dz;
  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (a < DIR_EPSILON || disc < 0) return i.clone();
  const t = THREE.MathUtils.clamp((-b - Math.sqrt(disc)) / (2 * a), 0, 1);
  return new THREE.Vector3(o.x + dx * t, 0, o.z + dz * t);
}

/**
 * 도로별 진입점과 진입 방향, 진군 waypoint를 계산한다.
 * EnvironmentManager나 NavGrid에 의존하지 않는 순수 함수다.
 */
export function computeRoadEntries(
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
  bounds: CityRoadBounds,
): CityRoadEntry[] {
  const margin = layout.entryEdgeMargin ?? DefaultEntryEdgeMargin;
  const entries: CityRoadEntry[] = [];

  for (const path of resolveRoadPaths(layout, center)) {
    const last = path.points[path.points.length - 1];
    const prev = path.points[path.points.length - 2];
    const dir = new THREE.Vector3(last.x - prev.x, 0, last.z - prev.z);
    if (dir.lengthSq() < DIR_EPSILON) continue;
    dir.normalize();

    let origin = last;
    if (!path.extendToEdge) {
      origin = clampToBounds(last, bounds);
      // 맵 내부에서 끝나는 polyline은 preset 오류로 제외한다.
      if (distanceToNearestEdge(origin, bounds) > margin) continue;
    }

    const edgeDist = distanceToBoundsEdge(origin, dir, bounds);
    if (!Number.isFinite(edgeDist)) continue;
    const entry = origin.clone().addScaledVector(dir, edgeDist - margin);
    if (isInsideRoadClearing(entry.x, entry.z, layout, center)) continue;

    entries.push({
      roadIndex: path.roadIndex,
      entry,
      dir,
      waypoints: buildMarchWaypoints(path, entry, layout, center),
      width: path.width,
      headingDeg: Math.atan2(dir.z, dir.x) / DEG2RAD,
    });
  }

  return entries;
}

function buildMarchWaypoints(
  path: ResolvedRoadPath,
  entry: THREE.Vector3,
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
): THREE.Vector3[] {
  const waypoints = [entry.clone()];
  // radial의 두 번째 점은 방향 계산용 보조점이므로 꺾임점에서 제외한다.
  const bends = path.flatStart && path.points.length === 2 ? [path.points[0]] : path.points.slice(0, -1);
  let outer = entry;

  for (let index = bends.length - 1; index >= 0; index--) {
    const point = bends[index];
    if (isInsideRoadClearing(point.x, point.z, layout, center)) {
      waypoints.push(intersectClearing(outer, point, center, layout.clearingRadius));
      return waypoints;
    }
    waypoints.push(point.clone());
    outer = point;
  }

  return waypoints;
}

/** 빈터를 제외한 도로 셀(셀 중심 기준, 4m 격자). */
export function resolveRoadCells(
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
  bounds: CityRoadBounds,
  gridSize: number,
): GridCell[] {
  const cells: GridCell[] = [];
  forEachCellInBounds(bounds, gridSize, (cell, x, z) => {
    if (isInsideRoadClearing(x, z, layout, center)) return;
    if (findRoadAt(x, z, layout, center) >= 0) cells.push(cell);
  });
  return cells;
}

/**
 * 진입 구간 셀: 진입점부터 도시 방향으로 entryZoneLength까지와, 진입점 바깥쪽(지면 끝)까지의 도로 셀.
 */
export function resolveEntryZoneCells(
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
  bounds: CityRoadBounds,
  gridSize: number,
  entries = computeRoadEntries(layout, center, bounds),
): GridCell[] {
  const zoneLength = layout.entryZoneLength ?? DefaultEntryZoneLength;
  const margin = layout.entryEdgeMargin ?? DefaultEntryEdgeMargin;
  const byRoad = new Map(entries.map((entry) => [entry.roadIndex, entry]));
  const cells: GridCell[] = [];

  forEachCellInBounds(bounds, gridSize, (cell, x, z) => {
    if (isInsideRoadClearing(x, z, layout, center)) return;
    const roadIndex = findRoadAt(x, z, layout, center);
    const entry = byRoad.get(roadIndex);
    if (!entry) return;
    const along = (x - entry.entry.x) * entry.dir.x + (z - entry.entry.z) * entry.dir.z;
    if (along >= -zoneLength && along <= margin + gridSize) cells.push(cell);
  });
  return cells;
}

function forEachCellInBounds(
  bounds: CityRoadBounds,
  gridSize: number,
  visit: (cell: GridCell, centerX: number, centerZ: number) => void,
): void {
  const minX = Math.floor(bounds.minX / gridSize);
  const maxX = Math.ceil(bounds.maxX / gridSize) - 1;
  const minZ = Math.floor(bounds.minZ / gridSize);
  const maxZ = Math.ceil(bounds.maxZ / gridSize) - 1;
  for (let gx = minX; gx <= maxX; gx++) {
    for (let gz = minZ; gz <= maxZ; gz++) {
      visit({ x: gx, z: gz }, gx * gridSize + gridSize * 0.5, gz * gridSize + gridSize * 0.5);
    }
  }
}

/** 개발용 preset 기하 검사. 문제가 없으면 빈 배열을 반환한다. */
export function validateCityRoadLayout(
  layout: CityRoadLayoutDef,
  center: THREE.Vector3,
  bounds: CityRoadBounds,
): string[] {
  const issues: string[] = [];
  const rotationDeg = layout.rotationDeg ?? 0;

  layout.roads.forEach((road, index) => {
    if (road.width <= 0) issues.push(`road[${index}] width must be positive`);
    if (road.kind === "radial") {
      if ((road.startRadius ?? layout.clearingRadius) > layout.clearingRadius) {
        issues.push(`road[${index}] startRadius exceeds clearingRadius`);
      }
      return;
    }
    if (road.points.length < 2) {
      issues.push(`road[${index}] polyline needs at least 2 points`);
      return;
    }
    const first = rotatePoint(road.points[0], rotationDeg);
    if (Math.hypot(first.x, first.z) > layout.clearingRadius) {
      issues.push(`road[${index}] polyline must start inside the clearing`);
    }
  });

  const entries = computeRoadEntries(layout, center, bounds);
  const entryRoads = new Set(entries.map((entry) => entry.roadIndex));
  layout.roads.forEach((_, index) => {
    if (!entryRoads.has(index)) issues.push(`road[${index}] has no valid entry inside the ground`);
  });

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const minGap = (entries[i].width + entries[j].width) * 0.5;
      if (entries[i].entry.distanceTo(entries[j].entry) <= minGap) {
        issues.push(`road[${entries[i].roadIndex}] and road[${entries[j].roadIndex}] entries overlap`);
      }
    }
  }

  return issues;
}

/**
 * 지면 오브젝트 bounds 중심과 범위. 숲 생성(EnvironmentManager)과 진입점 계산이 같은 함수를 쓴다.
 * 지면 메시에 붙는 오버레이·하이라이트 자식이 범위를 바꾸지 않도록 메시 자신의 geometry만 사용한다.
 */
export function resolveGroundRoadFrame(ground: THREE.Object3D): { center: THREE.Vector3; bounds: CityRoadBounds } | undefined {
  ground.updateWorldMatrix(true, false);
  const mesh = ground as THREE.Mesh;
  let box: THREE.Box3;
  if (mesh.isMesh && mesh.geometry) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    box = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
  } else {
    box = new THREE.Box3().setFromObject(ground);
  }
  if (box.isEmpty()) return undefined;
  const center = box.getCenter(new THREE.Vector3());
  center.y = 0;
  return { center, bounds: { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z } };
}
