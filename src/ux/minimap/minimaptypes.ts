import * as THREE from "three";
import { TargetKind } from "@Glibs/systems/targeting/targettypes";

export type MinimapShape = "rect" | "circle"
export type MinimapAnchor = "top-left" | "top-right" | "bottom-left" | "bottom-right"
/** 기본 xz(y-up 월드), 우주 씬은 xy 사용 가능 */
export type MinimapPlane = "xz" | "xy"
export type MinimapIcon = "dot" | "square" | "triangle" | "diamond"
/** north: 화면 위 = 월드 북쪽(xz: -Z, xy: +Y) 고정 / heading: follow 대상의 heading이 화면 위가 되도록 지도 회전 */
export type MinimapOrientation = "north" | "heading"

/** plane 투영 후 좌표 기준 범위. xz: (x, z) / xy: (x, -y) */
export interface MinimapWorldBounds {
  minU: number; minV: number; maxU: number; maxV: number
}

export interface MinimapButtons {
  zoom?: boolean        // 기본 true
  follow?: boolean      // 기본 true
  shapeToggle?: boolean // 기본 false
  orientation?: boolean // 기본 true
}

export interface MinimapOptions {
  /** 기본 "fixed". embedded = 부모 레이아웃(SoulMenuGroup 등)에 들어가는 in-flow 모드 */
  mount?: "fixed" | "embedded"
  shape?: MinimapShape                 // 기본 "rect"
  /** px, 기본 180 (원형은 지름). "fill" = 셀 너비에 맞춘 정사각 (embedded 전용) */
  size?: number | "fill"
  anchor?: MinimapAnchor               // 기본 "top-right" (fixed 전용)
  offset?: { x: number, y: number }    // 앵커 기준 px, 기본 { x: 16, y: 16 } (fixed 전용)
  align?: "start" | "center" | "end"   // embedded 시 셀 내 justify-self, 기본 "end"
  onVisibleChanged?: (v: boolean) => void
  plane?: MinimapPlane                 // 기본 "xz"
  zoom?: number                        // world unit → px 배율, 기본 2
  minZoom?: number                     // 기본 0.25
  maxZoom?: number                     // 기본 16
  zoomStep?: number                    // 기본 1.25 (곱셈 단위)
  /** 지정 시 static 레이어를 월드 전체 크기로 캐시 */
  worldBounds?: MinimapWorldBounds
  updateHz?: number                    // dynamic 검사 주기, 기본 15
  moveEpsilon?: number                 // 이 거리 미만 이동은 무시, 기본 0.05
  orientation?: MinimapOrientation     // 기본 "north"
  rotateEpsilon?: number               // heading 모드에서 이 각도(rad) 미만 회전은 무시, 기본 0.01
  northLabel?: boolean                 // heading 모드에서 가장자리에 회전하는 "N" 라벨 표시, 기본 true
  onOrientationChanged?: (o: MinimapOrientation) => void
  buttons?: MinimapButtons
  parent?: HTMLElement                 // 기본 document.body (fixed 전용)
  background?: string                  // 기본 "rgba(0,0,0,0.55)"
  /** Target 이벤트 → 마커 스타일. undefined면 표시 안 함. 미지정이면 Target 추적 비활성 */
  targetStyle?: (t: MinimapTargetInfo) => TargetMarkerStyle | undefined
  /** 이 Target이 등록되면 자동 follow (예: "player") */
  followTargetId?: string
}

/** 런타임 변경 가능 옵션. 배치 모드·부모·콜백은 생성 시에만 지정 */
export type MinimapRuntimeOptions = Partial<Omit<MinimapOptions,
  "mount" | "parent" | "onVisibleChanged" | "onOrientationChanged" | "targetStyle" | "followTargetId">>

export interface MinimapMarkerParam {
  id: string                 // 식별자 (중복 등록 시 교체)
  /** object.position 참조 (복사하지 않음). 월드 루트 직속 객체용 (로컬 좌표) */
  position?: THREE.Vector3
  /** 부모 그룹 하위 객체: getWorldPosition으로 읽음. position보다 우선 */
  object?: THREE.Object3D
  dynamic: boolean           // true: 주기마다 검사 / false: 등록·Update 시에만 읽음
  color?: string             // 기본 "#ffffff"
  size?: number              // px, 기본 4
  icon?: MinimapIcon         // 기본 "dot"
  /**
   * 선택: 방향 표시용 (triangle). 반환값은 **방위각(bearing, rad)**:
   * 지도 북쪽(xz: -Z, xy: +Y)을 0으로, 위에서 내려다봤을 때 시계 방향이 +.
   * 객체 전방축에서 구하려면 minimapBearingOf()를 사용한다.
   */
  heading?: () => number
  layer?: number             // 그리기 순서, 큰 값이 위 (static/dynamic 각 레이어 내부)
  clampToEdge?: boolean      // 범위 밖일 때 가장자리에 고정 표시
  visible?: boolean          // 기본 true
}

/** Target 자동 추적용 */
export interface MinimapTargetInfo {
  id: string
  teamId?: string
  factionId?: string
  kind: TargetKind
  object: THREE.Object3D
}
export type TargetMarkerStyle = Omit<MinimapMarkerParam, "id" | "position" | "object" | "dynamic">

export const MINIMAP_DEFAULTS = {
  mount: "fixed" as "fixed" | "embedded",
  shape: "rect" as MinimapShape,
  size: 180,
  anchor: "top-right" as MinimapAnchor,
  offset: { x: 16, y: 16 },
  align: "end" as "start" | "center" | "end",
  plane: "xz" as MinimapPlane,
  zoom: 2,
  minZoom: 0.25,
  maxZoom: 16,
  zoomStep: 1.25,
  updateHz: 15,
  moveEpsilon: 0.05,
  orientation: "north" as MinimapOrientation,
  rotateEpsilon: 0.01,
  northLabel: true,
  background: "rgba(0,0,0,0.55)",
  markerColor: "#ffffff",
  markerSize: 4,
}

/** 수평 사각 범위(x/z) → plane "xz" 기준 worldBounds. CityRoadBounds와 구조 호환 */
export function minimapBoundsFromXZ(b: { minX: number, maxX: number, minZ: number, maxZ: number }): MinimapWorldBounds {
  return { minU: b.minX, minV: b.minZ, maxU: b.maxX, maxV: b.maxZ }
}

/** 월드 좌표 → 지도 평면 좌표 (u = 화면 오른쪽, v = 화면 아래쪽) */
export function projectToPlane(p: THREE.Vector3, plane: MinimapPlane, out: { u: number, v: number }) {
  out.u = p.x
  out.v = plane === "xz" ? p.z : -p.y
  return out
}

const tmpDir = new THREE.Vector3()
/**
 * 객체의 로컬 +Z(getWorldDirection 기준 전방)를 지도 방위각으로 변환한다.
 * lookAt/rotateY 어느 쪽으로 회전해도 동일하게 동작한다.
 */
export function minimapBearingOf(object: THREE.Object3D, plane: MinimapPlane = "xz"): number {
  object.getWorldDirection(tmpDir)
  return plane === "xz"
    ? Math.atan2(tmpDir.x, -tmpDir.z)
    : Math.atan2(tmpDir.x, tmpDir.y)
}

export function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a))
}
