// DungeonMapObject.ts
// - IWorldMapObject 구현
// - 외부 전달 메쉬 + Plane 퍼센티지 영역 + 마스크 + 다중 보스방
// - 바닥 인스턴싱(다중 프로토타입/분배 + 유연 스케일/앵커) + 인스턴스 훅(물리 등록 등)
// - 벽/문: '두 기둥 표면 사이 내접 선분' 기준으로 길이/위치/회전 계산
// - 모든 배치에 preMatrix(피벗 보정) 적용 → 메시 원점 상이해도 정렬 안정
// - Door는 벽과 동일 크기로 스케일(벽 발자국과 정확히 일치)
// - 외곽(퍼리미터) 각 변에 최소 1개의 입구 보장 옵션 포함

import { IWorldMapObject, MapEntryType } from "@Glibs/types/worldmaptypes";
import * as THREE from "three";

/* ================================== 공개 타입 ================================== */

export type Axis1D = "x" | "y" | "z";

/** 외부 메쉬를 목표 치수에 맞추기 위한 규칙 */
export interface FitWall {
  kind: "wall";
  lengthAxis?: "x" | "z";     // 기본 'x'
  thicknessAxis?: "x" | "z";  // 기본 'z'
  heightAxis?: "y";           // 기본 'y'
  lengthRef?: number;
  thicknessRef?: number;
  heightRef?: number;
  anchorY?: "bottom" | "center";
}
export type FitDoor = Omit<FitWall, "kind"> & { kind: "door" };
export interface FitPillar {
  kind: "pillar";
  heightAxis?: "y";
  heightRef?: number;
  anchorY?: "bottom" | "center";
  xyMode?: "keep" | "fitThickness";
}
export interface Prototype {
  mesh: THREE.Mesh;
  fit?: FitWall | FitDoor | FitPillar;
  tag?: string;
}

/** 외부에서 전달받는 파츠 */
export interface DungeonParts {
  wallPrototypes: Prototype[];     // 필수
  pillarPrototypes: Prototype[];   // 필수
  doorPrototypes?: Prototype[];
  decorPrototypes?: Prototype[];
  trapPrototypes?: Prototype[];
  floorPrototypes?: Prototype[];   // 다중 바닥 지원
}

/** 사용 영역(퍼센티지) */
export interface AreaPercent {
  left: number; right: number; top: number; bottom: number; // 0..1
}

/** 도형 마스크 */
export type MaskType = "rect" | "circle" | "diamond" | "cross" | "custom";
export interface MaskOptions {
  type: MaskType;
  /** rect: {x0,y0,x1,y1} | circle: {cx,cy,r} | diamond: {cx,cy,r} | cross: {cx,cy,arm,thick} */
  params?: Record<string, number>;
  /** 완전 커스텀: true=포함, false=제외 */
  include?(i: number, j: number, cols: number, rows: number): boolean;
}

/** 보스방 옵션 (단일) */
export interface BossRoomOptions {
  enabled: boolean;
  wCells: number;
  hCells: number;
  marginCells: number;
  entrances: number; // 1..4
}

/** 여러 보스방 */
export interface MultiBossOptions {
  rooms: BossRoomOptions[]; // enabled=false 는 무시
  /** 방들 끼리 겹침 방지(기본 true) */
  nonOverlap?: boolean;
}

/** 바닥 인스턴싱 분배 전략 */
export type Distribution = "random" | "roundRobin" | "weighted";

/** 인스턴스 훅(물리 등록 등) */
export type InstanceKind = "wall" | "pillar" | "door" | "floor" | "decor" | "trap";
export interface InstanceHookPayload {
  kind: InstanceKind;
  instancedMesh: THREE.InstancedMesh;
  index: number;               // setMatrixAt에 사용된 인덱스
  matrix: THREE.Matrix4;       // 복사본 전달(참조 변형 주의)
}

/** 바닥 인스턴싱 옵션 (유연 스케일/앵커) */
export interface FloorBuildOptions {
  enabled: boolean;
  /** 배치 단위 (현재는 perCell 만 사용, 향후 확장 대비) */
  mode?: "perCell" | "region" | "single";
  /** Y 오프셋(월드), 기본 0.01 */
  yOffset?: number;
  /** XZ 목표 크기: 'cell' 또는 {x,z} (미지정시 'cell') */
  target?: { x?: number; z?: number } | "cell";
  /**
   * 스케일 맞춤 방식:
   * - 'stretch': X/Z를 각각 목표에 정확히 맞춤 (기본)
   * - 'cover'  : 균일 스케일(same for XZ)로 목표를 덮도록(잘라도 됨)
   * - 'contain': 균일 스케일로 목표 내부에 맞춤(여백 생김)
   */
  fitMode?: "stretch" | "cover" | "contain";
  /** 스케일 후 배율 곱(후처리) */
  scaleMultiplier?: { x?: number; y?: number; z?: number };
  /** 앵커: 바닥 메쉬의 피벗을 bottom 또는 center로 취급 (기본 bottom) */
  anchorY?: "bottom" | "center";
  /** 다중 프로토타입 분배 */
  distribution?: Distribution; // 기본 random
  weights?: number[];          // weighted일 때
  /** 렌더 관련 */
  doubleSided?: boolean;       // 기본 true (뒤집힌 노말 메시 대응)
  frustumCulled?: boolean;     // 기본 false (큰 인스턴스 묶음 컷 방지)
}

export interface BuildOptions {
  plane: THREE.Mesh;          // 임의 변환/회전 가능(XY여도 자동 보정)
  area: AreaPercent;          // 사용할 영역(퍼센트)
  parent: THREE.Object3D;     // 결과를 붙일 부모

  // 크기/확률
  cellSize?: number;
  wallThickness?: number;
  wallHeight?: number;
  pillarHeight?: number;

  // (참고) door*Ratio는 더 이상 사용하지 않음 — 문=벽 동일 스케일 요구사항
  doorLengthRatio?: number;
  doorHeightRatio?: number;
  doorThicknessRatio?: number;

  doorChance?: number;
  decorChance?: number;
  trapChance?: number;

  // 스타일 인덱스
  wallStyleIndex?: number;
  pillarStyleIndex?: number;
  doorStyleIndex?: number;

  // 시드/보스방/마스크/타입
  seed?: number;
  bossRoom?: BossRoomOptions;          // 단일 보스방(하위호환)
  bossRooms?: MultiBossOptions;        // 여러 보스방
  mask?: MaskOptions;                  // 도형 마스크
  floor?: FloorBuildOptions;           // 바닥 인스턴싱

  // ★ 벽-기둥 정렬/여유 간격
  /** (선택) 기둥과 벽 사이 여유 간격. 기본 0.02 */
  wallEndGap?: number;
  /** (선택) 기둥 하프사이즈를 이 값으로 강제(방향 무관 고정 여유). 지정 시 기하로부터 계산 대신 이 값 사용 */
  pillarClearance?: number;

  /** 외곽(던전 바깥과 맞닿은 테두리)에 최소 1개씩 입구 보장 */
  ensurePerimeterEntrances?: {
    enabled?: boolean;               // 기본 true
    sides?: Array<"N"|"S"|"E"|"W">;  // 기본 ["N","S","E","W"]
    asDoor?: boolean;                // true=문으로, false=벽 제거(오픈홀)
  };

  // 콜백 훅
  onInstancePlaced?: (p: InstanceHookPayload) => void; // 인스턴스 1개 배치 때마다
  onAfterBuild?: (result: DungeonResult) => void;      // 빌드 종료 시
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
  floor?: THREE.InstancedMesh;        // 하위호환: 첫 번째 바닥 IM
  floors?: THREE.InstancedMesh[];     // 모든 바닥 IM 배열
  extras: THREE.Object3D[];
  bossOverlay?: THREE.Group;
  bossInfos?: BossInfo[];
}

/* ================================== 유틸리티 ================================== */

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

// mesh.scale 반영 BB
function getBBoxScaled(mesh: THREE.Mesh) {
  const g = mesh.geometry;
  const bb = g.boundingBox ?? (g.computeBoundingBox(), g.boundingBox!);
  const size = new THREE.Vector3().subVectors(bb.max, bb.min);
  size.multiply(mesh.scale);
  const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
  return { bb, size, center };
}

// 지오메트리 원본 BB(스케일 미반영) — preMatrix 계산용
function getBBoxGeo(mesh: THREE.Mesh) {
  const g = mesh.geometry;
  const bb = g.boundingBox ?? (g.computeBoundingBox(), g.boundingBox!);
  const size = new THREE.Vector3().subVectors(bb.max, bb.min);
  const center = new THREE.Vector3().addVectors(bb.min, bb.max).multiplyScalar(0.5);
  return { bb, size, center, min: bb.min.clone(), max: bb.max.clone() };
}

// 평면의 실제 X/Z 폭을 "월드 축" 투영으로 계산
function getPlaneExtentsWorld(plane: THREE.Mesh) {
  plane.updateWorldMatrix(true, true);
  const g = plane.geometry;
  const bb = g.boundingBox ?? (g.computeBoundingBox(), g.boundingBox!);

  const qWorld = plane.getWorldQuaternion(new THREE.Quaternion());
  const xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(qWorld).normalize();
  const zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(qWorld).normalize();

  const corners: THREE.Vector3[] = [];
  for (const x of [bb.min.x, bb.max.x]) {
    for (const y of [bb.min.y, bb.max.y]) {
      for (const z of [bb.min.z, bb.max.z]) {
        corners.push(new THREE.Vector3(x, y, z).applyMatrix4(plane.matrixWorld));
      }
    }
  }
  let minX = +Infinity, maxX = -Infinity, minZ = +Infinity, maxZ = -Infinity;
  for (const w of corners) {
    const px = w.dot(xAxis);
    const pz = w.dot(zAxis);
    if (px < minX) minX = px; if (px > maxX) maxX = px;
    if (pz < minZ) minZ = pz; if (pz > maxZ) maxZ = pz;
  }
  return { xMin: minX, xMax: maxX, zMin: minZ, zMax: maxZ, xAxis, zAxis };
}

function toSingleMaterial(m: THREE.Material | THREE.Material[]): THREE.Material {
  return Array.isArray(m) ? m[0] : m;
}
function cloneMaterialSafe(mat: THREE.Material): THREE.Material {
  const anyMat = mat as any;
  return anyMat?.clone?.() ?? mat;
}

/* ================================ 마스크 판별 ================================ */

function makeMaskPredicate(
  mask: MaskOptions | undefined,
  cols: number,
  rows: number
): (i: number, j: number) => boolean {
  if (!mask) return () => true;

  if (mask.type === "custom" && mask.include) {
    const inc = mask.include;
    return (i, j) => inc(i, j, cols, rows);
  }

  const cx = mask.params?.cx ?? (cols / 2);
  const cy = mask.params?.cy ?? (rows / 2);

  if (mask.type === "rect") {
    const x0 = Math.max(0, Math.floor(mask.params?.x0 ?? 0));
    const y0 = Math.max(0, Math.floor(mask.params?.y0 ?? 0));
    const x1 = Math.min(cols, Math.floor(mask.params?.x1 ?? cols));
    const y1 = Math.min(rows, Math.floor(mask.params?.y1 ?? rows));
    return (i, j) => i >= x0 && i < x1 && j >= y0 && j < y1;
  }

  if (mask.type === "circle") {
    const r = mask.params?.r ?? Math.min(cols, rows) * 0.45;
    return (i, j) => {
      const dx = i + 0.5 - cx, dy = j + 0.5 - cy;
      return dx * dx + dy * dy <= r * r;
    };
  }

  if (mask.type === "diamond") {
    const r = mask.params?.r ?? Math.min(cols, rows) * 0.45;
    return (i, j) => {
      const dx = Math.abs(i + 0.5 - cx);
      const dy = Math.abs(j + 0.5 - cy);
      return dx + dy <= r;
    };
  }

  if (mask.type === "cross") {
    const arm = mask.params?.arm ?? Math.floor(Math.min(cols, rows) * 0.25);
    const thick = mask.params?.thick ?? Math.max(1, Math.floor(Math.min(cols, rows) * 0.08));
    return (i, j) =>
      (Math.abs(i - Math.floor(cx)) <= thick && j >= Math.floor(cy) - arm && j <= Math.floor(cy) + arm) ||
      (Math.abs(j - Math.floor(cy)) <= thick && i >= Math.floor(cx) - arm && i <= Math.floor(cx) + arm);
  }

  return () => true;
}

/* ================================= Maze (DFS) ================================ */

class Maze {
  grid: { v: boolean; walls: [boolean, boolean, boolean, boolean] }[][];
  include: (i: number, j: number) => boolean;
  constructor(public cols: number, public rows: number, private rand: () => number, include?: (i: number, j: number) => boolean) {
    this.include = include ?? (() => true);
    this.grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        v: false,
        walls: [true, true, true, true] as [boolean, boolean, boolean, boolean],
      }))
    );
  }
  generate(sx = 0, sy = 0) {
    if (!this.include(sx, sy)) {
      outer: for (let j = 0; j < this.rows; j++) {
        for (let i = 0; i < this.cols; i++) {
          if (this.include(i, j)) { sx = i; sy = j; break outer; }
        }
      }
    }
    const dirs: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const stack: [number, number][] = [[sx, sy]];
    this.grid[sy][sx].v = true;

    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const neighbors: [number, number, number][] = [];

      for (let d = 0; d < 4; d++) {
        const nx = x + dirs[d][0], ny = y + dirs[d][1];
        if (nx >= 0 && ny >= 0 && nx < this.cols && ny < this.rows && !this.grid[ny][nx].v && this.include(nx, ny)) {
          neighbors.push([d, nx, ny]);
        }
      }
      if (neighbors.length) {
        const [d, nx, ny] = neighbors[Math.floor(this.rand() * neighbors.length)];
        this.grid[y][x].walls[d] = false;
        this.grid[ny][nx].walls[(d + 2) % 4] = false;
        this.grid[ny][nx].v = true; stack.push([nx, ny]);
      } else {
        stack.pop();
      }
    }

    // 마스크 바깥 셀은 외벽을 모두 닫음
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        if (!this.include(i, j)) {
          this.grid[j][i].walls = [true, true, true, true];
        }
      }
    }
    return this.grid;
  }
}

/* ================================ 스케일 솔버 ================================ */

function solveWallScale(proto: Prototype, target: { length: number; thickness: number; height: number }): THREE.Vector3 {
  const baseFit: FitWall = { kind: "wall", lengthAxis: "x", thicknessAxis: "z", heightAxis: "y", anchorY: "bottom" };
  const fit = (proto.fit?.kind === "wall" ? (proto.fit as FitWall) : baseFit);
  const { size } = getBBoxScaled(proto.mesh);

  const lengthAxis: "x" | "z" = fit.lengthAxis ?? "x";
  const thickAxis: "x" | "z" = fit.thicknessAxis ?? "z";

  const L0 = (lengthAxis === "x" ? size.x : size.z) || 1;
  const T0 = (thickAxis === "x" ? size.x : size.z) || 1;
  const H0 = size.y || 1;

  const scaleX = lengthAxis === "x" ? target.length / L0 : thickAxis === "x" ? target.thickness / T0 : 1;
  const scaleY = target.height / H0;
  const scaleZ = lengthAxis === "z" ? target.length / L0 : thickAxis === "z" ? target.thickness / T0 : 1;

  return new THREE.Vector3(scaleX, scaleY, scaleZ);
}
function solveDoorScaleSameAsWall(proto: Prototype, target: { length: number; thickness: number; height: number }): THREE.Vector3 {
  // 도어는 벽과 동일 스케일 규칙 적용
  return solveWallScale({ ...proto, fit: { kind: "wall", ...(proto.fit as any) } }, target);
}
function solvePillarScale(proto: Prototype, target: { height: number; thickness: number }): THREE.Vector3 {
  const baseFit: FitPillar = { kind: "pillar", heightAxis: "y", anchorY: "bottom", xyMode: "keep" };
  const fit = (proto.fit?.kind === "pillar" ? (proto.fit as FitPillar) : baseFit);
  const { size } = getBBoxScaled(proto.mesh);

  const H0 = size.y || 1;
  const sy = target.height / H0;

  if (fit.xyMode === "fitThickness") {
    const base = Math.max(size.x || 1, size.z || 1) || 1;
    const sxy = target.thickness / base;
    return new THREE.Vector3(sxy, sy, sxy);
  }
  return new THREE.Vector3(1, sy, 1);
}

/* ============ Pillar ↔ Wall 정렬 보정: 기둥 하프사이즈 & 내접 선분 배치 ============ */

/** 현재 pillarProto + pillarScale 로부터 X/Z 하프사이즈(월드 기준)를 구한다 */
function getPillarHalfXZ(pillarProto: Prototype, pillarScale: THREE.Vector3) {
  const { size } = getBBoxScaled(pillarProto.mesh);
  const halfX = (size.x * pillarScale.x) * 0.5;
  const halfZ = (size.z * pillarScale.z) * 0.5;
  return { halfX, halfZ };
}

/** 그리드상의 기둥 (i,j)의 월드 위치 */
function gridPillarWorld(originWorld: THREE.Vector3, cellX: THREE.Vector3, cellZ: THREE.Vector3, i: number, j: number) {
  return originWorld.clone().addScaledVector(cellX, i).addScaledVector(cellZ, j);
}

/** 방향 단위벡터를 월드 x/z축에 맞춰 Yaw(회전)로 변환 */
function axisAlignedYawFromDir(u: THREE.Vector3, xAxis: THREE.Vector3, zAxis: THREE.Vector3) {
  const dx = u.dot(xAxis), dz = u.dot(zAxis);
  if (Math.abs(dx) >= Math.abs(dz)) {
    return dx >= 0 ? 0 : Math.PI;                // +X or -X
  } else {
    return dz >= 0 ? Math.PI / 2 : -Math.PI / 2; // +Z or -Z
  }
}

/** 두 기둥 사이 내접 선분(표면↔표면) 길이/중심/회전 계산 */
function wallSpanBetweenPillars(
  A: THREE.Vector3,
  B: THREE.Vector3,
  xAxis: THREE.Vector3,
  zAxis: THREE.Vector3,
  pillarHalfX: number,
  pillarHalfZ: number,
  endGap: number
) {
  const v = new THREE.Vector3().subVectors(B, A);
  const len = v.length();
  if (len < 1e-6) return { ok: false } as const;
  const u = v.clone().multiplyScalar(1 / len);

  // 어떤 축으로 정렬되는지 판단 → 해당 축 하프사이즈 사용
  const useX = Math.abs(u.dot(xAxis)) >= Math.abs(u.dot(zAxis));
  const halfAlong = useX ? pillarHalfX : pillarHalfZ;

  const inset = halfAlong + endGap;
  const A1 = A.clone().addScaledVector(u, inset);
  const B1 = B.clone().addScaledVector(u, -inset);
  const seg = new THREE.Vector3().subVectors(B1, A1);
  const segLen = Math.max(0, seg.length());

  const center = A1.clone().addScaledVector(u, segLen * 0.5);
  const ry = axisAlignedYawFromDir(u, xAxis, zAxis);
  return { ok: true, center, segLen, useX, ry } as const;
}

/* ========================== preMatrix (피벗/원점 보정) ========================== */

// 벽/도어: 길이/두께 중앙, 높이는 anchorY(bottom/center)
function makePreMatrixForWallLike(proto: Prototype) {
  const fit = (proto.fit?.kind === "wall" || proto.fit?.kind === "door")
    ? (proto.fit as FitWall)
    : { kind: "wall", lengthAxis: "x", thicknessAxis: "z", heightAxis: "y", anchorY: "bottom" } as FitWall;

  const { min, center } = getBBoxGeo(proto.mesh);
  const pivot = center.clone(); // XZ 중앙, Y 중앙
  const anchor = fit.anchorY ?? "bottom";
  pivot.y = (anchor === "bottom") ? min.y : center.y;

  return new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
}

// 기둥: XZ 중앙, Y는 anchorY(bottom/center)
function makePreMatrixForPillar(proto: Prototype) {
  const fit = (proto.fit?.kind === "pillar")
    ? (proto.fit as FitPillar)
    : { kind: "pillar", anchorY: "bottom" } as FitPillar;

  const { min, center } = getBBoxGeo(proto.mesh);
  const pivot = center.clone();
  pivot.x = center.x; pivot.z = center.z;
  pivot.y = (fit.anchorY ?? "bottom") === "bottom" ? min.y : center.y;

  return new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
}

// 바닥: XZ 중앙, Y는 옵션 anchorY(bottom/center)
function makePreMatrixForFloor(proto: Prototype, anchorY: "bottom" | "center") {
  const { min, center } = getBBoxGeo(proto.mesh);
  const pivot = new THREE.Vector3(center.x, anchorY === "bottom" ? min.y : center.y, center.z);
  return new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
}

/** 바닥 스케일 솔버 (메시가 1x1 아님을 전제로 유연 스케일) */
function solveFloorScaleFlexible(
  proto: Prototype,
  targetXZ: { x: number; z: number },
  fitMode: "stretch" | "cover" | "contain",
  scaleMul?: { x?: number; y?: number; z?: number }
) {
  const { size } = getBBoxScaled(proto.mesh);
  const srcX = Math.max(1e-6, size.x);
  const srcZ = Math.max(1e-6, size.z);

  let sx = 1, sz = 1;

  if (fitMode === "stretch") {
    sx = targetXZ.x / srcX;
    sz = targetXZ.z / srcZ;
  } else {
    const uniform = (fitMode === "cover")
      ? Math.max(targetXZ.x / srcX, targetXZ.z / srcZ)
      : Math.min(targetXZ.x / srcX, targetXZ.z / srcZ);
    sx = sz = uniform;
  }

  // 후처리 배율(옵션)
  sx *= (scaleMul?.x ?? 1);
  const sy = (scaleMul?.y ?? 1);
  sz *= (scaleMul?.z ?? 1);

  return new THREE.Vector3(sx, sy, sz);
}

/* ============================== 보스방 유틸 (다중) ============================== */

function placeBossRooms(
  maze: Maze,
  cols: number,
  rows: number,
  rand: () => number,
  include: (i: number, j: number) => boolean,
  opts?: MultiBossOptions | BossRoomOptions
): { rects: { x: number; y: number; w: number; h: number }[] } {
  const rects: { x: number; y: number; w: number; h: number }[] = [];

  const rooms: BossRoomOptions[] = Array.isArray((opts as MultiBossOptions)?.rooms)
    ? (opts as MultiBossOptions).rooms.filter(r => r.enabled)
    : ((opts as BossRoomOptions) && (opts as BossRoomOptions).enabled ? [opts as BossRoomOptions] : []);

  const nonOverlap = (opts as MultiBossOptions)?.nonOverlap ?? true;

  for (const room of rooms) {
    const wCells = THREE.MathUtils.clamp(Math.floor(room.wCells), 3, cols - 1);
    const hCells = THREE.MathUtils.clamp(Math.floor(room.hCells), 3, rows - 1);
    const margin = THREE.MathUtils.clamp(Math.floor(room.marginCells), 1, 8);

    let tries = 200;
    let placed: { x: number; y: number; w: number; h: number } | null = null;

    while (tries-- > 0 && !placed) {
      const bx = Math.floor(lerp(margin, Math.max(margin, cols - wCells - margin), rand()));
      const by = Math.floor(lerp(margin, Math.max(margin, rows - hCells - margin), rand()));

      // 마스크 안쪽인지 확인
      let ok = true;
      for (let j = by; j < by + hCells && ok; j++) {
        for (let i = bx; i < bx + wCells; i++) {
          if (!include(i, j)) { ok = false; break; }
        }
      }
      if (!ok) continue;

      // 겹침 확인
      if (nonOverlap) {
        for (const r of rects) {
          if (!(bx + wCells <= r.x || r.x + r.w <= bx || by + hCells <= r.y || r.y + r.h <= by)) {
            ok = false; break;
          }
        }
        if (!ok) continue;
      }

      placed = { x: bx, y: by, w: wCells, h: hCells };
    }

    if (placed) {
      rects.push(placed);
      // 내부 벽 제거
      for (let j = placed.y; j < placed.y + placed.h; j++) {
        for (let i = placed.x; i < placed.x + placed.w; i++) {
          const c = maze.grid[j][i];
          if (j > placed.y) { c.walls[0] = false; maze.grid[j - 1][i].walls[2] = false; }
          if (i < placed.x + placed.w - 1) { c.walls[1] = false; maze.grid[j][i + 1].walls[3] = false; }
          if (j < placed.y + placed.h - 1) { c.walls[2] = false; maze.grid[j + 1][i].walls[0] = false; }
          if (i > placed.x) { c.walls[3] = false; maze.grid[j][i - 1].walls[1] = false; }
          c.v = true;
        }
      }
      // 외곽에 입구
      const entrances = THREE.MathUtils.clamp(room.entrances ?? 2, 1, 4);
      const edges: Array<{ side: "N" | "S" | "W" | "E"; i?: number; j?: number }> = [];
      for (let i = 0; i < placed.w; i++) { edges.push({ side: "N", i }); edges.push({ side: "S", i }); }
      for (let j = 0; j < placed.h; j++) { edges.push({ side: "W", j }); edges.push({ side: "E", j }); }
      const chosen = new Set<number>();
      const pickEdge = () => { if (chosen.size >= edges.length) return null; let idx: number; do idx = Math.floor(rand() * edges.length); while (chosen.has(idx)); chosen.add(idx); return edges[idx]; };
      for (let k = 0; k < entrances; k++) {
        const e = pickEdge(); if (!e) break;
        if (e.side === "N") { const i = placed.x + (e.i ?? 0), j = placed.y; if (j > 0) { maze.grid[j][i].walls[0] = false; maze.grid[j - 1][i].walls[2] = false; } }
        if (e.side === "S") { const i = placed.x + (e.i ?? 0), j = placed.y + placed.h - 1; if (j < rows - 1) { maze.grid[j][i].walls[2] = false; maze.grid[j + 1][i].walls[0] = false; } }
        if (e.side === "W") { const i = placed.x, j = placed.y + (e.j ?? 0); if (i > 0) { maze.grid[j][i].walls[3] = false; maze.grid[j][i - 1].walls[1] = false; } }
        if (e.side === "E") { const i = placed.x + placed.w - 1, j = placed.y + (e.j ?? 0); if (i < cols - 1) { maze.grid[j][i].walls[1] = false; maze.grid[j][i + 1].walls[3] = false; } }
      }
    }
  }

  return { rects };
}

/* ============================== DungeonMapObject ============================== */

export class DungeonMapObject implements IWorldMapObject {
  public Type: MapEntryType = MapEntryType.DungeonMapObject;
  public Mesh?: THREE.Object3D;

  private _group: THREE.Group | null = null;
  private _bossOverlay: THREE.Group | null = null;
  private _bossInfos: BossInfo[] = [];
  private _lastConfig: { options: BuildOptions; parts: DungeonParts } | null = null;

  constructor() {}

  public Create(config: { parts: DungeonParts; options: BuildOptions }): DungeonResult {
    const { parts } = config;
    const options = { ...config.options }; // 방어적 복사

    this.Delete();

    // 월드행렬 갱신(중요)
    options.plane.updateWorldMatrix(true, true);

    const {
      plane, area, parent,
      cellSize = 2.0,
      wallThickness = 0.22,
      wallHeight = 2.2,
      pillarHeight = wallHeight,

      // door*Ratio는 무시(도어=벽 동일 스케일)

      doorChance = 0.1,
      decorChance = 0.06,
      trapChance = 0.04,

      wallStyleIndex = 0,
      pillarStyleIndex = 0,
      doorStyleIndex = 0,

      seed = 1234,
      bossRoom,
      bossRooms,
      mask,
      floor,

      wallEndGap = 0.02,
      pillarClearance,

      ensurePerimeterEntrances,

      onInstancePlaced,
      onAfterBuild
    } = options;

    // --- 평면 유효 범위 계산 (월드 투영 기반) ---
    const ext = getPlaneExtentsWorld(plane);
    const lxMin = THREE.MathUtils.lerp(ext.xMin, ext.xMax, clamp01(area.left));
    const lxMax = THREE.MathUtils.lerp(ext.xMin, ext.xMax, 1 - clamp01(area.right));
    const lzMin = THREE.MathUtils.lerp(ext.zMin, ext.zMax, clamp01(area.top));
    const lzMax = THREE.MathUtils.lerp(ext.zMin, ext.zMax, 1 - clamp01(area.bottom));

    const worldMin = new THREE.Vector3().addVectors(
      ext.xAxis.clone().multiplyScalar(lxMin),
      ext.zAxis.clone().multiplyScalar(lzMin)
    );
    const worldMax = new THREE.Vector3().addVectors(
      ext.xAxis.clone().multiplyScalar(lxMax),
      ext.zAxis.clone().multiplyScalar(lzMax)
    );

    const width = Math.abs(worldMax.clone().sub(worldMin).dot(ext.xAxis));
    const height = Math.abs(worldMax.clone().sub(worldMin).dot(ext.zAxis));

    const cols = Math.max(2, Math.floor(width / cellSize));
    const rows = Math.max(2, Math.floor(height / cellSize));

    // 마스크
    const include = makeMaskPredicate(mask, cols, rows);

    // 시드 랜덤
    const rand = rngMulberry32(seed);

    // 미로 생성
    const maze = new Maze(cols, rows, rand, include);
    maze.generate(0, 0);

    // 보스방(단일 + 다중)
    const multi: MultiBossOptions | undefined = bossRooms ?? (bossRoom ? { rooms: [bossRoom], nonOverlap: true } : undefined);
    const { rects } = placeBossRooms(maze, cols, rows, rand, include, multi);

    // === [ADD] 외곽 입구 강제 ===
    const forcedDoorEdges = new Set<string>(); // key: `${i},${j},edgeIndex`
    const ep = ensurePerimeterEntrances ?? { enabled: true, sides: ["N","S","E","W"] as Array<"N"|"S"|"E"|"W">, asDoor: true };
    if (ep.enabled !== false) {
      const wantSides = (ep.sides && ep.sides.length) ? ep.sides : ["N","S","E","W"];
      const pickRand = <T>(arr: T[]) => (arr.length ? arr[Math.floor(rand()*arr.length)] : null);

      // 북(N): j=0의 북벽(edge 0)
      if (wantSides.includes("N")) {
        const cand: Array<{i:number,j:number,edge:0}> = [];
        for (let i=0;i<cols;i++){
          const j=0;
          if (include(i,j) && (rows>1 ? include(i,1) : true)) {
            cand.push({i,j,edge:0});
          }
        }
        const chosen = pickRand(cand);
        if (chosen){
          if (ep.asDoor) forcedDoorEdges.add(`${chosen.i},${chosen.j},${chosen.edge}`);
          else maze.grid[chosen.j][chosen.i].walls[0] = false;
        }
      }

      // 남(S): j=rows-1의 남벽(edge 2)
      if (wantSides.includes("S")) {
        const cand: Array<{i:number,j:number,edge:2}> = [];
        for (let i=0;i<cols;i++){
          const j=rows-1;
          if (include(i,j) && (rows>1 ? include(i,rows-2) : true)) {
            cand.push({i,j,edge:2});
          }
        }
        const chosen = pickRand(cand);
        if (chosen){
          if (ep.asDoor) forcedDoorEdges.add(`${chosen.i},${chosen.j},${chosen.edge}`);
          else maze.grid[chosen.j][chosen.i].walls[2] = false;
        }
      }

      // 서(W): i=0의 서벽(edge 3)
      if (wantSides.includes("W")) {
        const cand: Array<{i:number,j:number,edge:3}> = [];
        for (let j=0;j<rows;j++){
          const i=0;
          if (include(i,j) && (cols>1 ? include(1,j) : true)) {
            cand.push({i,j,edge:3});
          }
        }
        const chosen = pickRand(cand);
        if (chosen){
          if (ep.asDoor) forcedDoorEdges.add(`${chosen.i},${chosen.j},${chosen.edge}`);
          else maze.grid[chosen.j][chosen.i].walls[3] = false;
        }
      }

      // 동(E): i=cols-1의 동벽(edge 1)
      if (wantSides.includes("E")) {
        const cand: Array<{i:number,j:number,edge:1}> = [];
        for (let j=0;j<rows;j++){
          const i=cols-1;
          if (include(i,j) && (cols>1 ? include(cols-2,j) : true)) {
            cand.push({i,j,edge:1});
          }
        }
        const chosen = pickRand(cand);
        if (chosen){
          if (ep.asDoor) forcedDoorEdges.add(`${chosen.i},${chosen.j},${chosen.edge}`);
          else maze.grid[chosen.j][chosen.i].walls[1] = false;
        }
      }
    }

    // 파츠 선택
    const wallProto = parts.wallPrototypes[Math.min(parts.wallPrototypes.length - 1, Math.max(0, wallStyleIndex))];
    const pillarProto = parts.pillarPrototypes[Math.min(parts.pillarPrototypes.length - 1, Math.max(0, pillarStyleIndex))];
    const doorProto = parts.doorPrototypes?.[Math.min((parts.doorPrototypes?.length ?? 1) - 1, Math.max(0, doorStyleIndex))];
    if (!wallProto || !pillarProto) throw new Error("wallPrototypes / pillarPrototypes 는 필수입니다.");

    // === preMatrix 계산 (피벗 보정) ===
    const wallPre = makePreMatrixForWallLike(wallProto);
    const doorPre = doorProto ? makePreMatrixForWallLike(doorProto) : new THREE.Matrix4();
    const pillarPre = makePreMatrixForPillar(pillarProto);

    // Instanced 준비
    const maxWalls = cols * rows * 2 + cols + rows;
    const maxPillars = (cols + 1) * (rows + 1);
    const maxDoors = Math.floor(maxWalls * doorChance) + 8;

    const wallMatBase = toSingleMaterial(wallProto.mesh.material as THREE.Material | THREE.Material[]);
    const pillarMatBase = toSingleMaterial(pillarProto.mesh.material as THREE.Material | THREE.Material[]);
    const doorMatBase = doorProto ? toSingleMaterial(doorProto.mesh.material as THREE.Material | THREE.Material[]) : undefined;

    const walls = new THREE.InstancedMesh(wallProto.mesh.geometry.clone(), cloneMaterialSafe(wallMatBase), maxWalls); walls.name = "Walls";
    const pillars = new THREE.InstancedMesh(pillarProto.mesh.geometry.clone(), cloneMaterialSafe(pillarMatBase), maxPillars); pillars.name = "Pillars";
    const doors = doorProto ? new THREE.InstancedMesh(doorProto.mesh.geometry.clone(), cloneMaterialSafe(doorMatBase!), maxDoors) : undefined;
    if (doors) doors.name = "Doors";

    // 그룹
    const group = new THREE.Group(); group.name = "DungeonGroup";
    group.add(pillars, walls); if (doors) group.add(doors);

    // 셀 좌표계
    const originWorld = worldMin.clone();
    const cellX = ext.xAxis.clone().multiplyScalar(Math.sign(width) * cellSize);
    const cellZ = ext.zAxis.clone().multiplyScalar(Math.sign(height) * cellSize);
    const cellCenter = (i: number, j: number) => originWorld.clone().addScaledVector(cellX, i + 0.5).addScaledVector(cellZ, j + 0.5);

    // 스케일(도어/벽은 스팬마다 재계산, 기둥은 고정)
    const pillarScale = solvePillarScale(pillarProto, { height: pillarHeight, thickness: wallThickness });

    // ★ 기둥 하프사이즈 (옵션으로 오버라이드 가능)
    const { halfX: pillarHalfX0, halfZ: pillarHalfZ0 } = getPillarHalfXZ(pillarProto, pillarScale);
    const pillarHalfX = pillarClearance ?? pillarHalfX0;
    const pillarHalfZ = pillarClearance ?? pillarHalfZ0;

    // 배치 도우미
    const m4 = new THREE.Matrix4();
    let wCount = 0, pCount = 0, dCount = 0;

    const inBoss = (i: number, j: number) => rects.some(r => i >= r.x && i < r.x + r.w && j >= r.y && j < r.y + r.h);

    // === 기둥: T * R * S * pre ===
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) {
        const ii = Math.min(cols - 1, Math.max(0, i));
        const jj = Math.min(rows - 1, Math.max(0, j));
        if (!include(ii, jj)) continue;

        const pos = originWorld.clone().addScaledVector(cellX, i).addScaledVector(cellZ, j);

        const S = new THREE.Matrix4().makeScale(pillarScale.x, pillarScale.y, pillarScale.z);
        const R = new THREE.Matrix4(); // 기둥은 yaw 회전 없음
        const T = new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z);

        m4.copy(T).multiply(R).multiply(S).multiply(pillarPre);
        pillars.setMatrixAt(pCount, m4);
        onInstancePlaced?.({ kind: "pillar", instancedMesh: pillars, index: pCount, matrix: m4.clone() });
        pCount++;
      }
    }

    // === 벽/도어: "두 기둥 표면 사이" 스팬 기준으로 길이/위치/회전 계산 + preMatrix ===
    const placeSegment = (i0: number, j0: number, i1: number, j1: number, asDoor: boolean) => {
      const A = gridPillarWorld(originWorld, cellX, cellZ, i0, j0);
      const B = gridPillarWorld(originWorld, cellX, cellZ, i1, j1);

      const span = wallSpanBetweenPillars(
        A, B, ext.xAxis, ext.zAxis,
        pillarHalfX, pillarHalfZ, wallEndGap
      );
      if (!span.ok || span.segLen < 1e-5) return;

      const { center, segLen, ry } = span;

      // 회전/이동 행렬
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      const R = new THREE.Matrix4().makeRotationFromQuaternion(q);
      const T = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);

      if (asDoor && doors) {
        // ★ 문은 "벽과 동일"한 타깃 크기 사용
        const dScale = solveDoorScaleSameAsWall(doorProto!, {
          length: segLen,
          thickness: wallThickness,
          height: wallHeight
        });

        // 너무 짧은 스팬이면 안전하게 벽으로 대체
        const minLen = Math.max(wallThickness * 1.5, 0.05);
        if (segLen < minLen) {
          const wScale = solveWallScale(wallProto, { length: segLen, thickness: wallThickness, height: wallHeight });
          const S = new THREE.Matrix4().makeScale(wScale.x, wScale.y, wScale.z);
          m4.copy(T).multiply(R).multiply(S).multiply(wallPre);
          walls.setMatrixAt(wCount, m4);
          onInstancePlaced?.({ kind: "wall", instancedMesh: walls, index: wCount, matrix: m4.clone() });
          wCount++;
        } else {
          const S = new THREE.Matrix4().makeScale(dScale.x, dScale.y, dScale.z);
          m4.copy(T).multiply(R).multiply(S).multiply(doorPre);
          doors.setMatrixAt(dCount, m4);
          onInstancePlaced?.({ kind: "door", instancedMesh: doors, index: dCount, matrix: m4.clone() });
          dCount++;
        }
      } else {
        const wScale = solveWallScale(wallProto, { length: segLen, thickness: wallThickness, height: wallHeight });
        const S = new THREE.Matrix4().makeScale(wScale.x, wScale.y, wScale.z);
        m4.copy(T).multiply(R).multiply(S).multiply(wallPre);
        walls.setMatrixAt(wCount, m4);
        onInstancePlaced?.({ kind: "wall", instancedMesh: walls, index: wCount, matrix: m4.clone() });
        wCount++;
      }
    };

    // 미로 그리드 순회: 각 셀의 4방향 에지를 기둥 인덱스로 표현하여 배치 (강제 문 우선)
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (!include(i, j)) continue;
        const cell = maze.grid[j][i];

        // 북(N): edge 0
        if (cell.walls[0]) {
          const force = forcedDoorEdges.has(`${i},${j},0`);
          const asDoor = force || (rand() < doorChance);
          placeSegment(i, j, i + 1, j, asDoor);
        }

        // 동(E): edge 1
        if (cell.walls[1]) {
          const force = forcedDoorEdges.has(`${i},${j},1`);
          const asDoor = force || (rand() < doorChance);
          placeSegment(i + 1, j, i + 1, j + 1, asDoor);
        }

        // 남(S): edge 2
        if (cell.walls[2]) {
          const force = forcedDoorEdges.has(`${i},${j},2`);
          const asDoor = force || (rand() < doorChance);
          placeSegment(i, j + 1, i + 1, j + 1, asDoor);
        }

        // 서(W): edge 3
        if (cell.walls[3]) {
          const force = forcedDoorEdges.has(`${i},${j},3`);
          const asDoor = force || (rand() < doorChance);
          placeSegment(i, j, i, j + 1, asDoor);
        }
      }
    }

    walls.count = wCount; pillars.count = pCount; if (doors) doors.count = dCount;
    walls.instanceMatrix.needsUpdate = true; pillars.instanceMatrix.needsUpdate = true; if (doors) doors.instanceMatrix.needsUpdate = true;

    // ========================= 바닥 인스턴싱 (유연 스케일) =========================
    let floorInst: THREE.InstancedMesh | undefined;
    const floorInstAll: THREE.InstancedMesh[] = [];

    if (floor?.enabled && parts.floorPrototypes?.length) {
      const n = parts.floorPrototypes.length;

      const dist = floor.distribution ?? "random";
      const makePicker = (rand: () => number): (() => number) => {
        if (dist === "roundRobin") {
          let k = 0; return () => (k++ % n);
        }
        if (dist === "weighted") {
          const w = floor.weights ?? Array(n).fill(1);
          const nonNeg = w.map(v => Math.max(0, v ?? 0));
          let run = 0; const acc = nonNeg.map(v => (run += v)); const total = run || n;
          return () => {
            const r = rand() * total;
            return acc.findIndex(v => r < v);
          };
        }
        return () => Math.floor(rand() * n); // random 균등
      };
      const pickIndex = makePicker(rand);

      // 목표 크기(XZ)
      const targetXZ = (() => {
        if (!floor.target || floor.target === "cell") {
          return { x: cellSize, z: cellSize };
        }
        return { x: floor.target.x ?? cellSize, z: floor.target.z ?? cellSize };
      })();

      const fitMode = floor.fitMode ?? "stretch";
      const scaleMul = floor.scaleMultiplier;
      const anchorY = floor.anchorY ?? "bottom";
      const yOff = floor.yOffset ?? 0.01;
      const frustumCulled = floor.frustumCulled ?? false; // 기본 false
      const doubleSided = floor.doubleSided ?? true;

      // 프로토타입별 preMatrix/스케일 캐시
      const floorPre: THREE.Matrix4[] = [];
      const floorScaleVec: THREE.Vector3[] = [];

      for (let k = 0; k < n; k++) {
        const proto = parts.floorPrototypes[k];
        const mat = cloneMaterialSafe(toSingleMaterial(proto.mesh.material as THREE.Material | THREE.Material[]));

        if (doubleSided && "side" in mat) {
          (mat as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        }

        const inst = new THREE.InstancedMesh(proto.mesh.geometry.clone(), mat, cols * rows);
        inst.name = `FloorTiles_${k}`;
        inst.frustumCulled = frustumCulled === true ? true : false; // 기본 false
        floorInstAll.push(inst);
        group.add(inst);

        floorPre[k] = makePreMatrixForFloor(proto, anchorY);
        floorScaleVec[k] = solveFloorScaleFlexible(proto, targetXZ, fitMode, scaleMul);
      }

      const perProtoCounts = new Array(n).fill(0);

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          if (!include(i, j)) continue;
          const idx = pickIndex();
          const inst = floorInstAll[idx];

          const base = cellCenter(i, j).clone();
          base.y += yOff;

          const S = new THREE.Matrix4().makeScale(
            floorScaleVec[idx].x, floorScaleVec[idx].y, floorScaleVec[idx].z
          );
          const T = new THREE.Matrix4().makeTranslation(base.x, base.y, base.z);

          const mm = new THREE.Matrix4().copy(T).multiply(S).multiply(floorPre[idx]); // ★ pre 적용
          const at = perProtoCounts[idx]++;
          inst.setMatrixAt(at, mm);
          onInstancePlaced?.({ kind: "floor", instancedMesh: inst, index: at, matrix: mm.clone() });
        }
      }

      for (let k = 0; k < n; k++) {
        const inst = floorInstAll[k];
        inst.count = perProtoCounts[k];
        inst.instanceMatrix.needsUpdate = true;
      }

      floorInst = floorInstAll[0]; // 하위호환 필드
    }

    // 장식/함정 (보스방 내부 제외)
    const extras: THREE.Object3D[] = [];
    const pushExtraIM = (proto: Prototype, pos: THREE.Vector3, scl: THREE.Vector3, rotY: number, kind: InstanceKind) => {
      const mat = cloneMaterialSafe(toSingleMaterial(proto.mesh.material as THREE.Material | THREE.Material[]));
      const inst = new THREE.InstancedMesh(proto.mesh.geometry.clone(), mat, 1);
      const qq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      const mm = new THREE.Matrix4().compose(pos, qq, scl);
      inst.setMatrixAt(0, mm);
      onInstancePlaced?.({ kind, instancedMesh: inst, index: 0, matrix: mm.clone() });
      group.add(inst); extras.push(inst);
    };

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (!include(i, j) || inBoss(i, j)) continue;
        const base = cellCenter(i, j);

        if (parts.decorPrototypes?.length && rand() < decorChance) {
          const proto = parts.decorPrototypes[Math.floor(rand() * parts.decorPrototypes.length)];
          const s = 0.6 + rand() * 0.8, ry = rand() * Math.PI * 2;
          const pos = base.clone()
            .addScaledVector(cellX.clone().normalize(), (rand() - 0.5) * (cellSize * 0.4))
            .addScaledVector(cellZ.clone().normalize(), (rand() - 0.5) * (cellSize * 0.4));
          pushExtraIM(proto, pos, new THREE.Vector3(s, s, s), ry, "decor");
        }

        if (parts.trapPrototypes?.length && rand() < trapChance) {
          const proto = parts.trapPrototypes[Math.floor(rand() * parts.trapPrototypes.length)];
          const s = 0.8 + rand() * 0.5; const ry = rand() * Math.PI * 2;
          const pos = base.clone().add(new THREE.Vector3(0, 0.01, 0));
          pushExtraIM(proto, pos, new THREE.Vector3(s, s * 0.2, s), ry, "trap");
        }
      }
    }

    // 보스 오버레이/정보
    this._bossOverlay = new THREE.Group(); this._bossOverlay.name = "BossOverlay";
    this._bossInfos = [];
    for (const r of rects) {
      const tl = cellCenter(r.x, r.y).clone().addScaledVector(cellX, -0.5).addScaledVector(cellZ, -0.5);
      const br = cellCenter(r.x + r.w - 1, r.y + r.h - 1).clone().addScaledVector(cellX, +0.5).addScaledVector(cellZ, +0.5);

      const min = new THREE.Vector3(Math.min(tl.x, br.x), Math.min(tl.y, br.y), Math.min(tl.z, br.z));
      const max = new THREE.Vector3(Math.max(tl.x, br.x), Math.max(tl.y, br.y), Math.max(tl.z, br.z));
      const center = min.clone().add(max).multiplyScalar(0.5);

      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(Math.abs(max.x - min.x) - 0.04, 0.04, Math.abs(max.z - min.z) - 0.04),
        new THREE.MeshStandardMaterial({ color: 0x24324a, roughness: 1, metalness: 0, transparent: true, opacity: 0.35 })
      ); plate.position.set(center.x, center.y + 0.02, center.z);

      const marker = new THREE.Mesh(
        new THREE.DodecahedronGeometry(Math.min(cellSize * 0.5, 1.0), 0),
        new THREE.MeshStandardMaterial({ color: 0xffe082, emissive: 0x332200, emissiveIntensity: 0.4 })
      ); marker.position.set(center.x, center.y + 0.6, center.z);

      const g = new THREE.Group(); g.add(plate, marker);
      this._bossOverlay.add(g);

      this._bossInfos.push({ center, rect: { ...r }, worldRect: { min, max } });
    }
    if (this._bossOverlay.children.length) group.add(this._bossOverlay); else this._bossOverlay = null;

    // parent에 추가, 상태 저장
    parent.add(group);
    this._group = group;
    this.Mesh = group;
    this._lastConfig = { options, parts };

    const result: DungeonResult = {
      group, walls, pillars, doors,
      floor: floorInst,
      floors: floorInstAll.length ? floorInstAll : undefined,
      extras, bossOverlay: this._bossOverlay ?? undefined, bossInfos: this._bossInfos
    };

    onAfterBuild?.(result);
    return result;
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
    this._bossInfos = [];
  }

  public Show() { if (this._group) this._group.visible = true; }
  public Hide() { if (this._group) this._group.visible = false; }

  public Save() {
    if (!this._lastConfig) return null;
    const { options } = this._lastConfig;
    const { plane, parent,  ...plain } = options;
    return { options: plain };
  }

  public Load(data: any, callback?: Function) {
    callback?.(data);
  }

  // 편의 API
  public getBossInfos() { return this._bossInfos; }
  public getBossCenters() { return this._bossInfos.map(b => b.center.clone()); }
}
