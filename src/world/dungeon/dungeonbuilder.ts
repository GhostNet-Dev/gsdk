// DungeonMapObject.ts
// - IWorldMapObject 구현 (Create/Delete 필수, 나머지 선택)
// - 외부 전달 Mesh들 + Plane 퍼센티지 영역을 받아 InstancedMesh로 미로/보스방 생성
// - scene/renderer/camera는 외부에서 관리

import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import * as THREE from "three";

/* =====================================================================================
 * IWorldMapObject 인터페이스 (프로젝트의 실제 선언을 import 해서 사용하세요)
 * ===================================================================================== */
// import type { IWorldMapObject, MapEntryType } from "your-path";

/* =====================================================================================
 * 공개 타입: 외부 메시 인터페이스/옵션
 * ===================================================================================== */

export type Axis1D = "x" | "y" | "z";

export interface FitWall {
  kind: "wall";
  /** 원본 메시에서 "길이"로 간주할 수평축 (기본: 'x') */
  lengthAxis?: "x" | "z";
  /** 원본 메시에서 "두께"로 간주할 수평축 (기본: 'z') */
  thicknessAxis?: "x" | "z";
  /** 높이축은 항상 'y'로 가정 */
  heightAxis?: "y";
  /** 원본 기준 치수(명시 시 해당 값으로 스케일 계산, 미지정 시 bounding box 사용) */
  lengthRef?: number;
  thicknessRef?: number;
  heightRef?: number;
  /** 바닥 기준 정렬 (현재는 스케일에만 사용, 기본 'bottom') */
  anchorY?: "bottom" | "center";
}

/** FitDoor는 FitWall에서 kind만 'door'로 바꿔 사용 */
export type FitDoor = Omit<FitWall, "kind"> & { kind: "door" };

export interface FitPillar {
  kind: "pillar";
  /** 높이축: y로 고정 가정 */
  heightAxis?: "y";
  heightRef?: number;
  anchorY?: "bottom" | "center";
  /**
   * 수평(X/Z) 스케일 모드
   * - "keep": 원본 단면 유지 (기본)
   * - "fitThickness": 벽 두께(targetThickness)에 맞추어 단면 크기 보정
   */
  xyMode?: "keep" | "fitThickness";
}

/** 각 파트의 외부 제공 메시 프로토타입 */
export interface Prototype {
  mesh: THREE.Mesh;
  fit?: FitWall | FitDoor | FitPillar;
  tag?: string;
}

export interface DungeonParts {
  wallPrototypes: Prototype[];   // 필수
  pillarPrototypes: Prototype[]; // 필수
  doorPrototypes?: Prototype[];  // 선택
  decorPrototypes?: Prototype[]; // 선택
  trapPrototypes?: Prototype[];  // 선택
}

export interface AreaPercent {
  left: number;   // 0..1, 왼쪽에서 제외할 퍼센트
  right: number;  // 0..1, 오른쪽에서 제외할 퍼센트
  top: number;    // 0..1, 위쪽(-Z)에서 제외할 퍼센트
  bottom: number; // 0..1, 아래쪽(+Z)에서 제외할 퍼센트
}

export interface BossRoomOptions {
  enabled: boolean;
  wCells: number;
  hCells: number;
  marginCells: number;
  entrances: number; // 1..4
}

export interface BuildOptions {
  /** 던전이 놓일 바닥 Plane (로컬 XZ 기준으로 가정, 임의 변환 가능) */
  plane: THREE.Mesh;
  /** plane 내부에서 사용할 직사각형 영역 (퍼센티지) */
  area: AreaPercent;
  /** 결과 그룹을 추가할 부모(Object3D) */
  parent: THREE.Object3D;

  // 치수/확률
  cellSize?: number;
  wallThickness?: number;
  wallHeight?: number;
  pillarHeight?: number;

  doorLengthRatio?: number;   // 기본 0.9 (cellSize * 0.9)
  doorHeightRatio?: number;   // 기본 0.9 (wallHeight * 0.9)
  doorThicknessRatio?: number;// 기본 0.5 (wallThickness * 0.5)

  doorChance?: number;
  decorChance?: number;
  trapChance?: number;

  // 스타일 인덱스
  wallStyleIndex?: number;
  pillarStyleIndex?: number;
  doorStyleIndex?: number;

  // 시드/보스방/타입
  seed?: number;
  bossRoom?: BossRoomOptions;
  entryType?: MapEntryType;
}

export interface BossInfo {
  center: THREE.Vector3;
  rect: { x: number; y: number; w: number; h: number };
  worldRect: { min: THREE.Vector3; max: THREE.Vector3 };
}

export interface DungeonResult {
  group: THREE.Group;
  walls: THREE.InstancedMesh;
  pillars: THREE.InstancedMesh;
  doors?: THREE.InstancedMesh;
  extras: THREE.Object3D[];
  bossOverlay?: THREE.Group;
  bossInfo?: BossInfo | null;
}

/* =====================================================================================
 * 내부 유틸
 * ===================================================================================== */
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function rngMulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getBBox(mesh: THREE.Mesh) {
  const g = mesh.geometry;
  const bb = g.boundingBox ?? (g.computeBoundingBox(), g.boundingBox!);
  const size = new THREE.Vector3().subVectors(bb.max, bb.min);
  const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
  return { bb, size, center };
}

function getPlaneHalfExtents(plane: THREE.Mesh) {
  const geom = plane.geometry;
  const bb = geom.boundingBox ?? (geom.computeBoundingBox(), geom.boundingBox!);
  return {
    halfX: (bb.max.x - bb.min.x) / 2,
    halfZ: (bb.max.z - bb.min.z) / 2,
  };
}

function planeLocalToWorld(plane: THREE.Mesh, lx: number, lz: number, y = 0) {
  return new THREE.Vector3(lx, y, lz).applyMatrix4(plane.matrixWorld);
}

function pick<T>(arr: T[] | undefined, idx: number): T | undefined {
  if (!arr || arr.length === 0) return undefined;
  return arr[Math.min(arr.length - 1, Math.max(0, idx))];
}

/** InstancedMesh에 사용할 단일 Material로 정규화 */
function toSingleMaterial(m: THREE.Material | THREE.Material[]): THREE.Material {
  return Array.isArray(m) ? m[0] : m;
}

/** clone()이 없을 수도 있으므로 안전 복제 */
function cloneMaterialSafe(mat: THREE.Material): THREE.Material {
  const anyMat = mat as any;
  return anyMat?.clone?.() ?? mat;
}

/* =====================================================================================
 * Maze: DFS 기반
 * ===================================================================================== */
class Maze {
  grid: { v: boolean; walls: [boolean, boolean, boolean, boolean] }[][];

  constructor(public cols: number, public rows: number, private rand: () => number) {
    this.grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        v: false,
        walls: [true, true, true, true] as [boolean, boolean, boolean, boolean],
      }))
    );
  }

  generate(sx = 0, sy = 0) {
    const dirs: [number, number][] = [
      [0, -1], // N
      [1, 0],  // E
      [0, 1],  // S
      [-1, 0], // W
    ];
    const stack: [number, number][] = [[sx, sy]];
    this.grid[sy][sx].v = true;

    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const neighbors: [number, number, number][] = [];

      for (let d = 0; d < 4; d++) {
        const nx = x + dirs[d][0];
        const ny = y + dirs[d][1];
        if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && !this.grid[ny][nx].v) {
          neighbors.push([d, nx, ny]);
        }
      }

      if (neighbors.length) {
        const [d, nx, ny] = neighbors[Math.floor(this.rand() * neighbors.length)];
        this.grid[y][x].walls[d] = false;
        this.grid[ny][nx].walls[(d + 2) % 4] = false; // 반대편 제거
        this.grid[ny][nx].v = true;
        stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }

    return this.grid;
  }
}

/* =====================================================================================
 * 스케일 솔버: 벽/문/기둥
 *  - 오류 (4): 'y' 비교가 타입적으로 불가능하므로 축별 계산을 명시적으로 분리
 * ===================================================================================== */
function solveWallScale(
  proto: Prototype,
  target: { length: number; thickness: number; height: number }
): THREE.Vector3 {
  const baseFit: FitWall = {
    kind: "wall",
    lengthAxis: "x",
    thicknessAxis: "z",
    heightAxis: "y",
    anchorY: "bottom",
  };
  const fit = (proto.fit?.kind === "wall" ? (proto.fit as FitWall) : baseFit);
  const { size } = getBBox(proto.mesh);

  const lengthAxis: "x" | "z" = fit.lengthAxis ?? "x";
  const thickAxis: "x" | "z" = fit.thicknessAxis ?? "z";

  // 원본 치수
  const L0 = (lengthAxis === "x" ? size.x : size.z) || 1;
  const T0 = (thickAxis === "x" ? size.x : size.z) || 1;
  const H0 = size.y || 1;

  // 각 축별 스케일
  const scaleX =
    lengthAxis === "x" ? target.length / L0 :
    thickAxis  === "x" ? target.thickness / T0 : 1;

  const scaleY = target.height / H0;

  const scaleZ =
    lengthAxis === "z" ? target.length / L0 :
    thickAxis  === "z" ? target.thickness / T0 : 1;

  return new THREE.Vector3(scaleX, scaleY, scaleZ);
}

/** 문은 벽과 동일 로직 */
function solveDoorScale(
  proto: Prototype,
  target: { length: number; thickness: number; height: number }
): THREE.Vector3 {
  // FitDoor도 lengthAxis/thicknessAxis는 'x'|'z' 이므로 동일 처리
  // (kind만 다를 뿐)
  return solveWallScale({ ...proto, fit: { kind: "wall", ...(proto.fit as any) } }, target);
}

function solvePillarScale(
  proto: Prototype,
  target: { height: number; thickness: number }
): THREE.Vector3 {
  const baseFit: FitPillar = { kind: "pillar", heightAxis: "y", anchorY: "bottom", xyMode: "keep" };
  const fit = (proto.fit?.kind === "pillar" ? (proto.fit as FitPillar) : baseFit);
  const { size } = getBBox(proto.mesh);

  const H0 = size.y || 1;
  const sy = target.height / H0;

  if (fit.xyMode === "fitThickness") {
    const base = Math.max(size.x || 1, size.z || 1) || 1;
    const sxy = target.thickness / base;
    return new THREE.Vector3(sxy, sy, sxy);
    }
  // keep
  return new THREE.Vector3(1, sy, 1);
}

/* =====================================================================================
 * DungeonMapObject (IWorldMapObject 구현)
 * ===================================================================================== */
export class DungeonMapObject implements IWorldMapObject {
  public Type: MapEntryType = MapEntryType.Dungeon;
  public Mesh?: THREE.Object3D;

  private _group: THREE.Group | null = null;
  private _bossOverlay: THREE.Group | null = null;
  private _bossInfo: BossInfo | null = null;
  private _lastConfig: { options: BuildOptions; parts: DungeonParts } | null = null;

  constructor() {}

  /** Create({ parts, options }) — 모든 인수는 단일 객체로 */
  public Create(config: {
    parts: DungeonParts;
    options: BuildOptions;
  }): DungeonResult {
    const { parts, options } = config;
    if (options.entryType !== undefined) this.Type = options.entryType;

    // 기존 생성물 정리
    this.Delete();

    const {
      plane, area, parent,
      cellSize = 2.0,
      wallThickness = 0.22,
      wallHeight = 2.2,
      pillarHeight = wallHeight,

      doorLengthRatio = 0.9,
      doorHeightRatio = 0.9,
      doorThicknessRatio = 0.5,

      doorChance = 0.1,
      decorChance = 0.06,
      trapChance = 0.04,

      wallStyleIndex = 0,
      pillarStyleIndex = 0,
      doorStyleIndex = 0,

      seed = 1234,
      bossRoom = { enabled: false, wCells: 6, hCells: 5, marginCells: 2, entrances: 2 },
    } = options;

    // 영역 계산 (plane 로컬 → 월드)
    const { halfX, halfZ } = getPlaneHalfExtents(plane);
    const lxMin = lerp(-halfX, halfX, clamp01(area.left));
    const lxMax = lerp(-halfX, halfX, 1 - clamp01(area.right));
    const lzMin = lerp(-halfZ, halfZ, clamp01(area.top));
    const lzMax = lerp(-halfZ, halfZ, 1 - clamp01(area.bottom));

    const worldMin = planeLocalToWorld(plane, lxMin, lzMin, 0);
    const worldMax = planeLocalToWorld(plane, lxMax, lzMax, 0);

    const qWorld = plane.getWorldQuaternion(new THREE.Quaternion());
    const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(qWorld).normalize();
    const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(qWorld).normalize();

    const span = new THREE.Vector3().subVectors(worldMax, worldMin);
    const width = Math.abs(span.dot(xAxis));
    const height = Math.abs(span.dot(zAxis));

    const cols = Math.max(2, Math.floor(width / cellSize));
    const rows = Math.max(2, Math.floor(height / cellSize));

    const rand = rngMulberry32(seed);
    const maze = new Maze(cols, rows, rand).generate(0, 0);

    // 보스방 예약
    let bossRect: { x: number; y: number; w: number; h: number } | null = null;
    if (bossRoom?.enabled) {
      const wCells = THREE.MathUtils.clamp(Math.floor(bossRoom.wCells), 3, Math.max(3, cols - 2));
      const hCells = THREE.MathUtils.clamp(Math.floor(bossRoom.hCells), 3, Math.max(3, rows - 2));
      const margin = THREE.MathUtils.clamp(Math.floor(bossRoom.marginCells), 1, 8);

      const bx = Math.floor(lerp(margin, Math.max(margin, cols - wCells - margin), rand()));
      const by = Math.floor(lerp(margin, Math.max(margin, rows - hCells - margin), rand()));
      bossRect = { x: bx, y: by, w: wCells, h: hCells };

      // 내부 벽 제거
      for (let j = by; j < by + hCells; j++) {
        for (let i = bx; i < bx + wCells; i++) {
          const c = maze[j][i];
          if (j > by) { c.walls[0] = false; maze[j - 1][i].walls[2] = false; } // N
          if (i < bx + wCells - 1) { c.walls[1] = false; maze[j][i + 1].walls[3] = false; } // E
          if (j < by + hCells - 1) { c.walls[2] = false; maze[j + 1][i].walls[0] = false; } // S
          if (i > bx) { c.walls[3] = false; maze[j][i - 1].walls[1] = false; } // W
          c.v = true;
        }
      }

      // 외곽에 입구 생성
      const entrances = THREE.MathUtils.clamp(bossRoom.entrances ?? 2, 1, 4);
      const edges: Array<{ side: "N" | "S" | "W" | "E"; i?: number; j?: number }> = [];
      for (let i = 0; i < wCells; i++) { edges.push({ side: "N", i }); edges.push({ side: "S", i }); }
      for (let j = 0; j < hCells; j++) { edges.push({ side: "W", j }); edges.push({ side: "E", j }); }
      const chosen = new Set<number>();
      const pick = () => {
        if (chosen.size >= edges.length) return null;
        let idx: number;
        do idx = Math.floor(rand() * edges.length);
        while (chosen.has(idx));
        chosen.add(idx);
        return edges[idx];
      };
      for (let k = 0; k < entrances; k++) {
        const e = pick(); if (!e) break;
        if (e.side === "N") { const i = bx + (e.i ?? 0), j = by; if (j > 0) { maze[j][i].walls[0] = false; maze[j - 1][i].walls[2] = false; } }
        if (e.side === "S") { const i = bx + (e.i ?? 0), j = by + hCells - 1; if (j < rows - 1) { maze[j][i].walls[2] = false; maze[j + 1][i].walls[0] = false; } }
        if (e.side === "W") { const i = bx, j = by + (e.j ?? 0); if (i > 0) { maze[j][i].walls[3] = false; maze[j][i - 1].walls[1] = false; } }
        if (e.side === "E") { const i = bx + wCells - 1, j = by + (e.j ?? 0); if (i < cols - 1) { maze[j][i].walls[1] = false; maze[j][i + 1].walls[3] = false; } }
      }
    }

    // 외부 프로토타입 선택
    const wallProto = pick(parts.wallPrototypes, wallStyleIndex);
    const pillarProto = pick(parts.pillarPrototypes, pillarStyleIndex);
    const doorProto = pick(parts.doorPrototypes, doorStyleIndex);
    if (!wallProto || !pillarProto) throw new Error("wallPrototypes / pillarPrototypes 는 필수입니다.");

    // InstancedMesh 준비
    const maxWalls = cols * rows * 2 + cols + rows;
    const maxPillars = (cols + 1) * (rows + 1);
    const maxDoors = Math.floor(maxWalls * doorChance) + 8;

    const wallMatBase = toSingleMaterial(wallProto.mesh.material as THREE.Material | THREE.Material[]);
    const pillarMatBase = toSingleMaterial(pillarProto.mesh.material as THREE.Material | THREE.Material[]);
    const doorMatBase = doorProto ? toSingleMaterial(doorProto.mesh.material as THREE.Material | THREE.Material[]) : undefined;

    const walls = new THREE.InstancedMesh(
      wallProto.mesh.geometry.clone(),
      cloneMaterialSafe(wallMatBase),
      maxWalls
    ); walls.name = "Walls";

    const pillars = new THREE.InstancedMesh(
      pillarProto.mesh.geometry.clone(),
      cloneMaterialSafe(pillarMatBase),
      maxPillars
    ); pillars.name = "Pillars";

    const doors = doorProto ? new THREE.InstancedMesh(
      doorProto.mesh.geometry.clone(),
      cloneMaterialSafe(doorMatBase!),
      maxDoors
    ) : undefined;
    if (doors) doors.name = "Doors";

    const group = new THREE.Group(); group.name = "DungeonGroup";
    group.add(pillars, walls); if (doors) group.add(doors);

    // 셀 좌표계
    const originLocal = new THREE.Vector3(lxMin, 0, lzMin);
    const originWorld = planeLocalToWorld(plane, originLocal.x, originLocal.z, 0);
    const cellX = xAxis.clone().multiplyScalar(Math.sign(span.dot(xAxis)) * cellSize);
    const cellZ = zAxis.clone().multiplyScalar(Math.sign(span.dot(zAxis)) * cellSize);

    // 스케일 계산
    const wallScale = solveWallScale(wallProto, { length: cellSize, thickness: wallThickness, height: wallHeight });
    const doorScale = doors
      ? solveDoorScale(doorProto!, {
          length: cellSize * doorLengthRatio,
          thickness: wallThickness * doorThicknessRatio,
          height: wallHeight * doorHeightRatio,
        })
      : null;
    const pillarScale = solvePillarScale(pillarProto, { height: pillarHeight, thickness: wallThickness });

    // 배치
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let wCount = 0, pCount = 0, dCount = 0;

    const cellCenter = (i: number, j: number) =>
      originWorld.clone().addScaledVector(cellX, i + 0.5).addScaledVector(cellZ, j + 0.5);

    // 기둥(격자점)
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const pos = originWorld.clone().addScaledVector(cellX, i).addScaledVector(cellZ, j);
        q.identity();
        m4.compose(pos, q, pillarScale);
        pillars.setMatrixAt(pCount++, m4);
      }
    }

    // 벽/문
    const placeWall = (pos: THREE.Vector3, ry: number) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      m4.compose(pos, q, wallScale);
      walls.setMatrixAt(wCount++, m4);
    };
    const placeDoor = (pos: THREE.Vector3, ry: number) => {
      if (!doors || !doorScale) return placeWall(pos, ry);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      m4.compose(pos, q, doorScale);
      doors.setMatrixAt(dCount++, m4);
    };
    const wallOrDoor = (pos: THREE.Vector3, ry: number) =>
      (rand() < doorChance ? placeDoor : placeWall)(pos, ry);

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const c = cellCenter(i, j);
        const cell = maze[j][i];

        if (cell.walls[0]) wallOrDoor(c.clone().addScaledVector(cellZ, -0.5), 0);            // N
        if (cell.walls[1]) wallOrDoor(c.clone().addScaledVector(cellX, +0.5), Math.PI / 2);  // E
        if (cell.walls[2]) wallOrDoor(c.clone().addScaledVector(cellZ, +0.5), 0);            // S
        if (cell.walls[3]) wallOrDoor(c.clone().addScaledVector(cellX, -0.5), Math.PI / 2);  // W
      }
    }

    walls.count = wCount; pillars.count = pCount; if (doors) doors.count = dCount;
    walls.instanceMatrix.needsUpdate = true;
    pillars.instanceMatrix.needsUpdate = true;
    if (doors) doors.instanceMatrix.needsUpdate = true;

    // 장식/함정
    const extras: THREE.Object3D[] = [];
    const inBoss = (i: number, j: number) =>
      bossRect ? i >= bossRect.x && i < bossRect.x + bossRect.w && j >= bossRect.y && j < bossRect.y + bossRect.h : false;

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (inBoss(i, j)) continue;
        const base = cellCenter(i, j);

        if (parts.decorPrototypes?.length && rand() < decorChance) {
          const proto = parts.decorPrototypes[Math.floor(rand() * parts.decorPrototypes.length)];
          const mat = cloneMaterialSafe(toSingleMaterial(proto.mesh.material as THREE.Material | THREE.Material[]));
          const inst = new THREE.InstancedMesh(proto.mesh.geometry.clone(), mat, 1);
          const s = 0.6 + rand() * 0.8;
          const ry = rand() * Math.PI * 2;
          const pos = base.clone()
            .addScaledVector(cellX.clone().normalize(), (rand() - 0.5) * cellSize * 0.4)
            .addScaledVector(cellZ.clone().normalize(), (rand() - 0.5) * cellSize * 0.4);
          const qq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
          m4.compose(pos, qq, new THREE.Vector3(s, s, s));
          inst.setMatrixAt(0, m4);
          group.add(inst); extras.push(inst);
        }

        if (parts.trapPrototypes?.length && rand() < trapChance) {
          const proto = parts.trapPrototypes[Math.floor(rand() * parts.trapPrototypes.length)];
          const mat = cloneMaterialSafe(toSingleMaterial(proto.mesh.material as THREE.Material | THREE.Material[]));
          const inst = new THREE.InstancedMesh(proto.mesh.geometry.clone(), mat, 1);
          const s = 0.8 + rand() * 0.5;
          const qq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
          m4.compose(base.clone().add(new THREE.Vector3(0, 0.01, 0)), qq, new THREE.Vector3(s, s * 0.2, s));
          inst.setMatrixAt(0, m4);
          group.add(inst); extras.push(inst);
        }
      }
    }

    // 보스 오버레이/정보
    this._bossOverlay = null;
    this._bossInfo = null;
    if (bossRect) {
      const tl = cellCenter(bossRect.x, bossRect.y).clone().addScaledVector(cellX, -0.5).addScaledVector(cellZ, -0.5);
      const br = cellCenter(bossRect.x + bossRect.w - 1, bossRect.y + bossRect.h - 1).clone()
        .addScaledVector(cellX, +0.5).addScaledVector(cellZ, +0.5);

      const min = new THREE.Vector3(
        Math.min(tl.x, br.x), Math.min(tl.y, br.y), Math.min(tl.z, br.z)
      );
      const max = new THREE.Vector3(
        Math.max(tl.x, br.x), Math.max(tl.y, br.y), Math.max(tl.z, br.z)
      );
      const center = min.clone().add(max).multiplyScalar(0.5);

      const overlay = new THREE.Group(); overlay.name = "BossOverlay";
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(Math.abs(max.x - min.x) - 0.04, 0.04, Math.abs(max.z - min.z) - 0.04),
        new THREE.MeshStandardMaterial({ color: 0x24324a, roughness: 1, metalness: 0, transparent: true, opacity: 0.35 })
      ); plate.position.set(center.x, center.y + 0.02, center.z);

      const marker = new THREE.Mesh(
        new THREE.DodecahedronGeometry(Math.min(cellSize * 0.5, 1.0), 0),
        new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0x332200, emissiveIntensity: 0.4 })
      ); marker.position.set(center.x, center.y + 0.6, center.z);

      overlay.add(plate, marker);
      group.add(overlay);

      this._bossOverlay = overlay;
      this._bossInfo = { center, rect: { ...bossRect }, worldRect: { min, max } };
    }

    // parent에 추가하고 내부 상태 저장
    options.parent.add(group);
    this._group = group;
    this.Mesh = group;
    this._lastConfig = { options, parts };

    // 결과 리턴
    return { group, walls, pillars, doors, extras, bossOverlay: this._bossOverlay ?? undefined, bossInfo: this._bossInfo };
  }

  public Delete() {
    if (!this._group) return;
    this._group.traverse((o) => {
      if ((o as any).isInstancedMesh) {
        const im = o as THREE.InstancedMesh;
        im.geometry.dispose();
        (im.material as THREE.Material)?.dispose?.();
      }
    });
    this._group.removeFromParent();
    this._group = null;
    this.Mesh = undefined;
    this._bossOverlay = null;
    this._bossInfo = null;
  }

  public Show() { if (this._group) this._group.visible = true; }
  public Hide() { if (this._group) this._group.visible = false; }

  public Save() {
    if (!this._lastConfig) return null;
    const { options } = this._lastConfig;
    // 직렬화 불가 참조 제거 (plane/parent/material/geometry 등)
    const { plane, parent, entryType, ...plain } = options;
    return { options: plain };
  }

  public Load(data: any, callback?: Function) {
    // 저장된 수치 옵션을 그대로 전달받아 재생성할 때 사용
    // ex) obj.Load(saved, ()=> obj.Create({ parts, options:{ ...saved.options, plane, parent } }));
    callback?.(data);
  }

  // 편의 API
  public getBossInfo() { return this._bossInfo; }
  public getBossPosition() { return this._bossInfo?.center.clone() ?? null; }
}
