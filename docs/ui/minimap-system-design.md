# Minimap System Design

## 1. 개요

이 문서는 GSDK에 추가할 범용 **미니맵(Minimap) UI 모듈**의 구조, 이벤트 인터페이스, 위치 갱신 최적화 방식을 정리합니다.

**요구사항**

- 모양: 사각형(`rect`) / 원형(`circle`) 옵션 선택
- 화면 위치 옵션화 (모서리 앵커 + 오프셋)
- 확대/축소 등 조작 버튼 제공
- 방향 모드 선택 아이콘: **북쪽 고정(north-up, 동서남북 고정)** / **캐릭터 방향 기준(heading-up, follow 대상이 항상 화면 위)** (§6.5)
- 표시 대상은 `SendEventMessage`로 식별자·좌표·색상 등을 등록
- 좌표는 대상 object의 `Position`(`THREE.Vector3`)을 **참조**하여 갱신
- 등록 시 **움직이는 객체(dynamic) / 고정 객체(static)** 속성을 함께 전달하고, 갱신 주기마다 **dynamic 객체만 검사**

**데이터 흐름**

```text
GameState / Actor
  -> eventCtrl.SendEventMessage(EventTypes.MinimapRegister, param)
    -> Minimap (listener)
      -> MinimapRegistry.add()  ── static → staticMap (좌표 스냅샷, 이후 미검사)
                                └─ dynamic → dynamicMap (Position 참조 유지)
Canvas (LoopType.Systems)
  -> Minimap.update(delta)  // updateHz 간격
    -> MinimapRegistry.pollDynamic()   // dynamicMap만 순회
      -> MinimapRenderer.render()      // dirty일 때만
           static 캐시 레이어 blit + dynamic 마커 draw
```

---

## 2. 기존 패턴 재사용

> 경로는 `src/gsdk/src/` 기준입니다.

| 항목 | 기존 코드 | 사용 방식 |
|------|----------|----------|
| UI 베이스 | `src/ux/gux.ts` (`GUX`, `UxLayerIndex`) | `Minimap extends GUX` — `Dom`, `Show/Hide`, `applyDynamicStyle`로 CSS 주입 |
| 이벤트 | `src/systems/event/eventctrl.ts`, `src/types/globaltypes.ts` (`EventTypes`) | `RegisterEventListener` / `SendEventMessage` |
| 루프 | `src/interface/ievent.ts` (`ILoop`), `src/systems/event/canvas.ts` (`LoopType`) | `EventTypes.RegisterLoop` + `LoopType.Systems` — 일시정지(timeScale 0)에도 UI 갱신 |
| 패널 참고 | `src/ux/turnlog/turnlogpanel.ts` | 생성자에서 리스너 등록, CSS 문자열 주입 패턴 |

---

## 3. 수정 및 추가 파일

### 3.1 추가 파일 (`src/gsdk/src/ux/minimap/`)

| 파일 | 역할 |
|------|------|
| `minimaptypes.ts` | 옵션/마커 타입, enum |
| `minimapregistry.ts` | 마커 저장소. `staticMap` / `dynamicMap` 분리, dirty 플래그 관리 |
| `minimaprenderer.ts` | Canvas 2D 렌더러. static 캐시 레이어 + dynamic 레이어 |
| `minimap.ts` | `Minimap extends GUX implements ILoop` — DOM, 버튼, 이벤트, 루프 결합. fixed / embedded(SoulMenuGroup child) 배치 모드 지원 |

### 3.2 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `src/gsdk/src/types/globaltypes.ts` | `EventTypes` 9번(UI) 섹션에 미니맵 이벤트 추가 |

게임 객체 등록(HUD 연동)에 따른 앱/State 측 수정 파일은 §10.7 참고.

---

## 4. 타입 정의 (`minimaptypes.ts`)

```ts
import * as THREE from "three";

export type MinimapShape = "rect" | "circle"
export type MinimapAnchor = "top-left" | "top-right" | "bottom-left" | "bottom-right"
export type MinimapPlane = "xz" | "xy"   // 기본 xz(y-up 월드), 우주 씬은 xy 사용 가능
export type MinimapIcon = "dot" | "square" | "triangle" | "diamond"
/** north: 화면 위 = 월드 북쪽(xz: -Z, xy: +Y) 고정 / heading: follow 대상의 heading이 화면 위가 되도록 지도 회전 (§6.5) */
export type MinimapOrientation = "north" | "heading"

/** plane 투영 후 좌표(§6.3의 wx, wy) 기준 범위. xz: (x, z) / xy: (x, -y) */
export interface MinimapWorldBounds {
  minU: number; minV: number; maxU: number; maxV: number
}

export interface MinimapOptions {
  mount?: "fixed" | "embedded"         // 기본 "fixed". embedded = 부모 레이아웃(SoulMenuGroup 등)에 들어가는 in-flow 모드 (§8)
  shape?: MinimapShape                 // 기본 "rect"
  size?: number | "fill"               // px, 기본 180 (원형은 지름). "fill" = 셀 너비에 맞춘 정사각 (embedded 전용)
  anchor?: MinimapAnchor               // 기본 "top-right" (fixed 전용)
  offset?: { x: number, y: number }    // 앵커 기준 px, 기본 { x: 16, y: 16 } (fixed 전용)
  align?: "start" | "center" | "end"   // embedded 시 셀 내 justify-self, 기본 "end"
  onVisibleChanged?: (v: boolean) => void // Show/Hide 시 호출. 호스트 relayout 훅
  plane?: MinimapPlane                 // 기본 "xz"
  zoom?: number                        // world unit → px 배율, 기본 2
  minZoom?: number                     // 기본 0.25
  maxZoom?: number                     // 기본 16
  zoomStep?: number                    // 기본 1.25 (곱셈 단위)
  worldBounds?: MinimapWorldBounds     // 지정 시 static 레이어를 월드 전체 크기로 캐시
  updateHz?: number                    // dynamic 검사 주기, 기본 15
  moveEpsilon?: number                 // 이 거리 미만 이동은 무시, 기본 0.05
  orientation?: MinimapOrientation     // 기본 "north"
  rotateEpsilon?: number               // heading 모드에서 이 각도(rad) 미만 회전은 무시, 기본 0.01
  northLabel?: boolean                 // heading 모드에서 가장자리에 회전하는 "N" 라벨 표시, 기본 true
  onOrientationChanged?: (o: MinimapOrientation) => void // 버튼/Config로 모드 변경 시 호출. 호스트가 사용자 선택 저장용
  buttons?: { zoom?: boolean, follow?: boolean, shapeToggle?: boolean, orientation?: boolean } // orientation 기본 true
  parent?: HTMLElement                 // 기본 document.body
  background?: string                  // 기본 "rgba(0,0,0,0.55)"
  targetStyle?: (t: MinimapTargetInfo) => TargetMarkerStyle | undefined
                                       // Target 이벤트 → 마커 스타일. undefined면 표시 안 함. 미지정이면 Target 추적 비활성 (§10)
  followTargetId?: string              // 이 Target이 등록되면 자동 follow (예: "player")
}

/** 런타임 변경 가능 옵션. 배치 모드·부모·콜백은 생성 시에만 지정 */
export type MinimapRuntimeOptions = Partial<Omit<MinimapOptions, "mount" | "parent" | "onVisibleChanged" | "onOrientationChanged" | "targetStyle" | "followTargetId">>

export interface MinimapMarkerParam {
  id: string                 // 식별자 (중복 등록 시 교체)
  position?: THREE.Vector3   // object.position 참조 (복사하지 않음). 월드 루트 직속 객체용 (로컬 좌표)
  object?: THREE.Object3D    // 부모 그룹 하위 객체(함대/정거장 등): getWorldPosition으로 읽음. position보다 우선
  dynamic: boolean           // true: 주기마다 검사 / false: 등록·Update 시에만 읽음
  color?: string             // 기본 "#ffffff"
  size?: number              // px, 기본 4
  icon?: MinimapIcon         // 기본 "dot"
  heading?: () => number     // 선택: 방향(rad) 표시용 (triangle). 규약은 §6.3 참고
  layer?: number             // 그리기 순서, 큰 값이 위
  clampToEdge?: boolean      // 범위 밖일 때 가장자리에 고정 표시 (목표/적 등)
  visible?: boolean          // 기본 true
}

/** Target 자동 추적용 (§10) */
export interface MinimapTargetInfo {
  id: string
  teamId?: string
  factionId?: string
  kind: TargetKind                     // systems/targeting/targettypes
  object: THREE.Object3D
}
export type TargetMarkerStyle = Omit<MinimapMarkerParam, "id" | "position" | "object" | "dynamic">

/** 수평 사각 범위(x/z) → plane "xz" 기준 worldBounds. CityRoadBounds와 구조 호환 (cityroad import 없음) */
export function minimapBoundsFromXZ(b: { minX: number, maxX: number, minZ: number, maxZ: number }): MinimapWorldBounds {
  return { minU: b.minX, minV: b.minZ, maxU: b.maxX, maxV: b.maxZ }
}
```

- `position`과 `object` 중 하나는 필수입니다. 스냅샷은 `object`가 있으면 `object.getWorldPosition(tmp)`, 없으면 `position`을 읽습니다.
  - `object.position`은 **부모 기준 로컬 좌표**이므로, 그룹 하위 객체에 `position`만 넘기면 위치가 틀어집니다.

---

## 5. 이벤트 인터페이스 (`EventTypes` 추가)

```ts
// 📢 9. UI, 시스템 상태 및 퀘스트 (UI & System Messages)
MinimapRegister   = "minimapreg",    // (param: MinimapMarkerParam | MinimapMarkerParam[])
MinimapUnregister = "minimapunreg",  // (id: string | string[])
MinimapUpdate     = "minimapupd",    // (id: string, patch: Partial<MinimapMarkerParam>)
MinimapClear      = "minimapclear",  // ()
MinimapConfig     = "minimapcfg",    // (opts: MinimapRuntimeOptions)  모양/위치/줌 런타임 변경
MinimapFollow     = "minimapfollow", // (target?: THREE.Vector3 | THREE.Object3D, heading?: () => number)
                                     //   중심 추적 대상, undefined = 고정 중심. heading = heading 모드 회전 소스 (§6.5)
MinimapVisible    = "minimapvis",    // (visible: boolean)
```

- 이벤트는 브로드캐스트이므로 **Minimap 인스턴스는 동시에 하나만** 존재한다고 전제합니다. (다중 미니맵이 필요해지면 모든 페이로드에 `mapId`를 추가하는 방식으로 확장)
- `EventTypes.SceneClear` 수신 시에도 `clear()`를 수행해 씬 전환 시 잔여 마커를 제거합니다.
- `MinimapUpdate`는 색상/아이콘/가시성 변경, 그리고 **static 객체의 위치가 바뀐 경우**(건물 이전 등) 재스냅샷 용도로 사용합니다.
- `MinimapConfig`는 전투 State가 지형 생성 직후 `worldBounds`를 지정하는 용도로도 사용합니다 (§10.6). Target 이벤트와 달리 `tracking` 여부와 무관하게 즉시 적용됩니다.

### 5.1 사용 예

```ts
// 움직이는 객체: Position 참조 유지
eventCtrl.SendEventMessage(EventTypes.MinimapRegister, {
  id: "player",
  position: player.meshs.position,
  dynamic: true,
  color: "#44ccff",
  icon: "triangle",
  heading: () => minimapBearingOf(player.meshs),
  layer: 10,
})

// 고정 객체: 배열로 일괄 등록
eventCtrl.SendEventMessage(EventTypes.MinimapRegister, buildings.map(b => ({
  id: `bld-${b.id}`,
  position: b.position,
  dynamic: false,
  color: "#aaaa88",
  icon: "square",
})))

// 플레이어 중심 추적 (heading 함수를 함께 넘기면 heading 모드에서 지도 회전에 사용)
eventCtrl.SendEventMessage(EventTypes.MinimapFollow, player.meshs.position, () => minimapBearingOf(player.meshs))

// 런타임 옵션 변경
eventCtrl.SendEventMessage(EventTypes.MinimapConfig, { shape: "circle", anchor: "bottom-left" })

// 방향 모드 변경 (버튼과 동일 효과)
eventCtrl.SendEventMessage(EventTypes.MinimapConfig, { orientation: "heading" })

// 제거
eventCtrl.SendEventMessage(EventTypes.MinimapUnregister, "player")
```

---

## 6. 위치 갱신 최적화

### 6.1 Registry (`minimapregistry.ts`)

```ts
interface MinimapEntry {
  param: MinimapMarkerParam
  lx: number   // 마지막 스냅샷 좌표 (plane 기준 가로축)
  lz: number   // 마지막 스냅샷 좌표 (plane 기준 세로축)
}

class MinimapRegistry {
  staticMap = new Map<string, MinimapEntry>()
  dynamicMap = new Map<string, MinimapEntry>()
  staticDirty = false
  dynamicDirty = false

  get size(): number        // staticMap.size + dynamicMap.size
  add(param): void          // dynamic 여부로 분기 저장, 즉시 스냅샷. 같은 id가 반대 Map에 있으면 먼저 제거
  remove(id): void          // 양쪽 Map에서 제거, 해당 dirty 세팅
  update(id, patch): void   // 속성 병합 + 재스냅샷, dynamic 변경 시 Map 간 이동
  pollDynamic(eps): boolean // dynamicMap만 순회, 이동한 항목만 스냅샷 갱신
  clear(): void             // 비어 있지 않았다면 양쪽 dirty 세팅 (잔상 제거용 렌더 유도)
}
```

- **static**: 등록 시 좌표를 스냅샷하고 이후 `Position`을 읽지 않습니다. `MinimapUpdate` 또는 `dynamic` 속성 변경 시에만 재스냅샷 → `staticDirty = true`.
- **dynamic**: 갱신 주기마다 `dynamicMap`만 순회하며 `|pos - last| > moveEpsilon`인 항목만 스냅샷을 갱신합니다. 하나라도 있으면 `dynamicDirty = true`.
  - 비교는 `dx*dx + dz*dz > eps*eps`로 제곱근 없이 수행합니다.
  - `heading`이 있는 마커는 각도 변화도 함께 비교합니다.
- `dynamic` 값이 `MinimapUpdate`로 바뀌면 두 Map 사이로 이동합니다.
- 그리기 순서: static 레이어는 항상 dynamic 레이어 아래입니다. `layer`는 **각 레이어 내부**의 순서입니다.

### 6.2 Renderer (`minimaprenderer.ts`) — 2-레이어 구조

1. **static 레이어 (캐시)**
   - `OffscreenCanvas`(미지원 환경은 숨김 `canvas`)에 static 마커를 그려 캐시합니다.
   - `worldBounds`가 지정된 경우: 월드 전체를 현재 zoom으로 한 번 그리고, 중심 이동 시에는 `drawImage(src rect)`로 잘라 붙이기만 합니다 → **추적 카메라여도 static 재렌더 없음**.
     - 캐시 크기 `W = (maxU-minU) * zoom * dpr`, `H = (maxV-minV) * zoom * dpr`에서 `max(W,H) > 4096` 또는 `W*H > 4096²`(≈64MB)이면 뷰 크기 캐시 방식으로 자동 전환합니다.
     - `clampToEdge`인 static 마커는 캐시 레이어에서 제외하고 dynamic 패스에서 그립니다 (캐시는 뷰 밖 마커를 가장자리로 끌어올 수 없음).
   - `worldBounds`가 없는 경우: 뷰 크기로 그리고, 중심/줌 변경 시 재렌더합니다.
     - heading 모드에서는 회전 시 모서리가 비지 않도록 캐시를 **뷰 대각선 크기**(`ceil(size * √2)` 정사각)로 확보합니다. 모드 전환 시 캐시 크기 재계산 + 재렌더.
   - 재렌더 조건: `staticDirty || zoomChanged || (!worldBounds && centerChanged) || cacheSizeChanged`.
   - **회전(rot)은 재렌더 조건이 아닙니다.** 캐시는 항상 north 기준으로 그리고, blit 시에만 회전합니다 (§6.5).
2. **dynamic 레이어**
   - 표시 canvas에 `배경 → static 캐시 blit → dynamic 마커(layer 순)` 순서로 그립니다.
   - **프레임 스킵**: `!staticDirty && !dynamicDirty && !viewDirty`이면 아무것도 그리지 않습니다.
   - `viewDirty`는 follow 중심 이동뿐 아니라 줌 버튼/휠, 모양 전환, 방향 모드 전환·heading 회전(§6.5), 리사이즈, `setOptions` 시에도 세팅됩니다. 조작 직후 반응성을 위해 이 경우는 updateHz 틱을 기다리지 않고 다음 프레임에 렌더합니다.

### 6.3 좌표 변환

```text
plane "xz":  wx = pos.x, wy = pos.z
plane "xy":  wx = pos.x, wy = -pos.y   (화면 y 반전)

dx = (wx - centerX) * zoom
dy = (wy - centerY) * zoom
// rot = 0 (north 모드) 또는 §6.5의 회전각 (heading 모드)
px = dx * cos(rot) - dy * sin(rot) + width  / 2
py = dx * sin(rot) + dy * cos(rot) + height / 2
```

- north 모드에서는 `rot = 0`이므로 `px = dx + width/2`, `py = dy + height/2`로 단순화됩니다 (삼각함수 생략).
- `clampToEdge` 클램프와 범위 밖 컬링은 **회전 적용 후 화면 좌표**에서 판정합니다.

- `devicePixelRatio`를 반영해 canvas 내부 해상도를 설정합니다.
- **heading 규약 (확정)**: 반환값은 **방위각(bearing, rad)** — 지도 북쪽(xz: -Z, xy: +Y)이 0, 위에서 내려다봤을 때 시계 방향이 +. 화면 각 = heading 그대로(`screenAngle(h) = h`).
  - 플레이어 등 모델의 전방축은 로컬 +Z(`getWorldDirection`)이고 `lookAt`/`rotateY`가 섞여 쓰이므로 `rotation.y`를 직접 쓰지 않고 `minimapBearingOf(object, plane)`(`atan2(dir.x, -dir.z)` / xy: `atan2(dir.x, dir.y)`)로 구합니다.
- **원형**: 컨테이너 `border-radius: 50%` + canvas `arc` clip. `clampToEdge` 마커는 중심→마커 방향으로 반지름에 투영 클램프합니다.
- **사각형**: `clampToEdge` 마커는 사각 영역 경계로 클램프합니다.
- `clampToEdge`가 아닌 마커는 범위 밖이면 그리지 않습니다(컬링).

### 6.4 루프

- `Minimap`은 `ILoop`을 구현하고 `EventTypes.RegisterLoop`, `LoopType.Systems`로 등록합니다.

```ts
update(delta: number) {
  if (!this.visible || this.isHostHidden()) {   // 자체 Hide 또는 상위 그룹 숨김 (§8.3)
    this.wasHidden = true
    return
  }
  if (this.wasHidden) {                         // 숨김 동안 놓친 변경 반영
    this.wasHidden = false
    this.markAllDirty()
  }
  const reg = this.registry
  if (reg.size === 0 && !reg.staticDirty && !reg.dynamicDirty && !this.viewDirty) return  // clear 후 1회는 빈 화면 렌더

  const interval = 1 / this.opts.updateHz
  this.acc += delta
  const tick = this.acc >= interval
  if (tick) {
    this.acc %= interval
    reg.pollDynamic(this.opts.moveEpsilon)       // 이동 시 dynamicDirty 세팅
  }
  if (this.following) {
    this.viewDirty ||= this.updateCenterFromFollow()    // follow 중심은 매 프레임 (캐시 blit만이라 저렴)
    this.viewDirty ||= this.updateRotationFromFollow()  // heading 모드 회전도 매 프레임 (§6.5)
  }
  if (reg.staticDirty || reg.dynamicDirty || this.viewDirty) {
    this.renderer.render(...)
    reg.staticDirty = reg.dynamicDirty = this.viewDirty = false
  }
}
```

- follow 중심을 updateHz로만 갱신하면 지도 전체가 계단식으로 움직여 보이므로, 중심 이동은 매 프레임 반영하고 **마커 검사(pollDynamic)만** updateHz로 제한합니다.

### 6.5 방향 모드 (north / heading)

| 모드 | 화면 위쪽 | 회전각 `rot` | follow 대상 마커 |
|------|----------|-------------|-----------------|
| `"north"` (기본) | 월드 북쪽 고정 (xz: -Z, xy: +Y) — 동서남북 고정 | `0` | heading대로 회전 |
| `"heading"` | follow 대상의 전방 | `-screenAngle(heading())` | 항상 위쪽을 가리킴 |

- `screenAngle(h) = h`(§6.3 방위각 규약)이므로 heading 모드 회전각은 plane과 무관하게 `rot = -heading()`입니다.
- **heading 소스**: `setFollow(target, heading)`/`MinimapFollow`의 두 번째 인자. `followTargetId`로 자동 follow 시에는 해당 마커의 `param.heading`을 사용합니다.
- **폴백**: follow가 꺼져 있거나 heading 소스가 없으면 heading 모드여도 `rot = 0`으로 그립니다. 이때 `opts.orientation`은 `"heading"`으로 유지되어 follow 재개 시 자동 복귀하며, 버튼에는 `data-fallback` 속성으로 비활성 표시합니다.

```ts
private updateRotationFromFollow(): boolean {
  const next = (this.opts.orientation === "heading" && this.followHeading)
    ? this.toRotation(this.followHeading())
    : 0
  const d = Math.atan2(Math.sin(next - this.rot), Math.cos(next - this.rot)) // -π~π wrap
  // 폴백(next=0)은 epsilon과 무관하게 정확히 0으로 스냅
  if (d === 0 || (next !== 0 && Math.abs(d) <= this.opts.rotateEpsilon)) return false
  this.rot = next
  this.updateOrientUi()  // 버튼 바늘 · N 라벨 CSS 회전 갱신
  return true
}
```

**렌더링**
- static 캐시 blit: `ctx.save() → translate(w/2, h/2) → rotate(rot) → drawImage(cache, …, -cw/2, -ch/2, …) → restore()`. 캐시는 north 기준 그대로이므로 **회전만으로는 static 재렌더가 없습니다** (§6.2).
- dynamic 마커: 위치는 §6.3 회전 공식으로 변환합니다. 아이콘은
  - `dot` / `square` / `diamond`: 화면 정렬 유지 (회전하지 않음, 가독성). 단, static 캐시에 그려진 마커는 캐시와 함께 회전합니다 (재렌더 없는 blit 회전의 대가).
  - `triangle`: `화면각 = screenAngle(marker.heading()) + rot` → follow 대상 자신은 항상 위쪽
- 원형(`circle`)은 회전해도 외곽이 같아 추가 처리가 없고, 사각형(`rect`)은 §6.2의 대각선 캐시로 모서리를 채웁니다.

**UI 표시**
- 방향 버튼 아이콘(나침반 바늘, §7.1)은 `transform: rotate(rot)`로 돌려 **현재 북쪽 방향을 가리킵니다** (north 모드에서는 항상 위).
- `northLabel`이 true이고 heading 모드면, 미니맵 가장자리에 "N" 라벨을 중심에서 북쪽 방향(`-π/2 + rot`) 반지름 위치에 배치합니다 (DOM 요소 transform, canvas 재렌더 불필요).
- 버튼/`MinimapConfig`로 모드가 바뀌면 `rot` 재계산 + `viewDirty` + (뷰 캐시 모드면) 캐시 크기 재계산 후 `onOrientationChanged(o)`를 호출합니다.

---

## 7. UI 구성 (`minimap.ts`)

### 7.1 DOM 구조

```html
<div class="gnx-minimap" data-mount="fixed" data-shape="rect" data-anchor="top-right" data-orient="north">
  <canvas class="gnx-minimap-canvas"></canvas>
  <span class="gnx-minimap-north">N</span>   <!-- heading 모드 + northLabel일 때만 표시 -->
  <div class="gnx-minimap-btns">
    <button data-act="zoom-in">＋</button>
    <button data-act="zoom-out">－</button>
    <button data-act="follow">◎</button>
    <button data-act="orient" title="방향: 북쪽 고정 / 캐릭터 방향">
      <svg class="gnx-minimap-compass" viewBox="0 0 16 16">  <!-- 나침반 바늘: 빨간 위쪽 = 북 -->
        <polygon points="8,1 11,8 5,8" fill="#e44"/>
        <polygon points="8,15 11,8 5,8" fill="#ddd"/>
      </svg>
    </button>
    <button data-act="shape">◻/○</button>
  </div>
</div>
```

- `data-orient="north" | "heading"`으로 CSS에서 버튼 활성 표시(heading 모드면 강조 테두리)를 구분합니다. 폴백 중(§6.5)이면 `data-fallback` 속성으로 흐리게 표시합니다.
- `.gnx-minimap-compass`는 `transform: rotate(<rot>rad)`로 북쪽을 가리키며, `buttons.orientation === false`면 버튼을 생성하지 않습니다.

### 7.2 위치/레이어

- (fixed 모드) anchor별로 `top/right/bottom/left` 중 두 속성에 offset을 지정합니다 (`position: fixed`). embedded 모드는 §8 참고.
- `zIndex`는 모달보다 낮은 HUD 수준(예: `UxLayerIndex.default + 5`)으로 두어 모달/다이얼로그 아래에 표시합니다.
- 원형일 때 버튼 그룹은 원 바깥 하단(또는 앵커 반대편)에 배치합니다.

### 7.3 조작

| 조작 | 동작 |
|------|------|
| ＋ / － 버튼 | `zoom *= zoomStep` / `zoom /= zoomStep`, `minZoom~maxZoom` clamp |
| 마우스 휠 | 줌 in/out (동일 규칙) |
| ◎ follow | follow 대상 추적 on/off (off 시 현재 중심 고정) |
| 🧭 방향 (`orient`) | `north ↔ heading` 토글. north = 동서남북 고정, heading = 캐릭터 전방이 화면 위. follow off / heading 소스 없음이면 north로 폴백 표시 (§6.5) |
| 모양 토글 | `rect ↔ circle` 전환 (`buttons.shapeToggle`이 true일 때만 표시) |

- 미니맵 영역의 `pointerdown`/`pointerup`/`click`/`contextmenu`/`wheel`은 `stopPropagation`하여 게임 입력(카메라/선택)과 분리합니다.
- `wheel`은 `{ passive: false }`로 등록하고 `preventDefault()`하여 페이지 스크롤을 막습니다.

### 7.4 공개 API

```ts
class Minimap extends GUX implements ILoop {
  constructor(eventCtrl: IEventController, opts?: MinimapOptions)
  setOptions(partial: MinimapRuntimeOptions): void // 크기/모양/위치 변경 시 canvas 리사이즈 + 전체 dirty
  setZoom(z: number): void
  setFollow(target?: THREE.Vector3 | THREE.Object3D, heading?: () => number): void // heading = 방향 모드 회전 소스
  setOrientation(o: MinimapOrientation): void // 버튼과 동일. rot 재계산 + viewDirty + onOrientationChanged
  Show(): void      // visible=true + onVisibleChanged(true)
  Hide(): void      // visible=false + onVisibleChanged(false)
  onLayout(slotIndex: number, total: number): void // IGUX 훅. embedded fill 모드 재측정
  beginTracking(): void // Clear → Target 시드 → 이벤트 반영 시작 (§10.3)
  endTracking(): void   // 이벤트 반영 중단 → follow 해제 → Clear → worldBounds 초기화
  Dispose(): void   // 리스너 해제(DeregisterEventListener), DeregisterLoop, ResizeObserver 해제, DOM 제거
}
```

- CSS는 `applyDynamicStyle("gnx-minimap-css", CSS)`로 주입합니다 (기존 패널과 동일 방식).
- **리스너 해제 주의**: `DeregisterEventListener(type)`를 callback 없이 호출하면 해당 타입의 **모든 리스너가 제거**됩니다(`eventctrl.ts`의 `removeAllListeners`). `SceneClear`는 물리·브릭 시스템도 구독하므로, 핸들러는 화살표 함수 필드로 보관하고 반드시 `DeregisterEventListener(type, this.onXxx)` 형태로 해제합니다.

---

## 8. SoulMenuGroup Child 통합 (embedded 모드)

`SoulMenuGroup`(`src/ux/hud/soul/soulmenugroup.ts`)의 `AddChild(item, { id, area, line })`로 미니맵을 HUD 라인에 넣을 수 있도록 **embedded 배치 모드**를 지원합니다. **SoulMenuGroup 코드는 수정하지 않습니다.**

### 8.1 SoulMenuGroup 분석

| 항목 | 동작 | 미니맵 대응 |
|------|------|------------|
| child 조건 | `IGUX` (`Dom`, `isVisible()`, 선택 `onLayout(i, n)`) | `Minimap extends GUX` → 타입상 이미 호환 |
| 배치 | `add()`가 `item.Dom`을 `.ghud-line`(CSS grid 셀)에 `appendChild` | fixed면 레이아웃이 깨지므로 embedded에서는 in-flow(`position: relative`) |
| 열 계산 | `layoutLine()`이 `isVisible()`인 항목 수로 `grid-template-columns` 결정 | Show/Hide 후 호스트 relayout 필요 → `onVisibleChanged` 훅 |
| 입력 | `#ghud-root{pointer-events:none}`, `#ghud-root *{pointer-events:auto}` | 버튼/휠 정상 동작 |
| 그룹 숨김 | `hud.Hide()`는 루트 `display:none`만 변경 | 미니맵 자체 `visible`은 true로 남음 → 호스트 숨김 감지로 렌더 스킵 |

### 8.2 embedded 동작

- 생성 시 `parent`에 append 하지 않습니다 (호스트가 `AddChild`에서 append).
- `data-mount="embedded"` CSS: `position: relative`, anchor/offset 무시, `justify-self: <align>`.
- 크기
  - 숫자: 해당 px 고정.
  - `"fill"`: `ResizeObserver`로 Dom 너비를 감시해 정사각으로 canvas 리사이즈 + 전체 dirty. `onLayout(slot, total)` 호출 시에도 재측정합니다.
    - canvas CSS는 `width: 100%`로 두고 높이만 너비에 맞춥니다. 1px 미만 변화는 무시합니다.
    - fill은 셀 폭이 콘텐츠와 무관한 열(`1fr` 등)에서만 사용합니다. `max-content` 열에 두면 캔버스 크기 ↔ 셀 폭이 서로를 결정해 ResizeObserver 루프가 생깁니다.
- 버튼 그룹은 미니맵 내부 모서리에 overlay(`position: absolute`)로 배치해 grid 셀 크기를 늘리지 않습니다. 방향(`orient`) 버튼과 "N" 라벨도 같은 overlay 안에 둡니다.
- Show/Hide 시 `onVisibleChanged(v)`를 호출합니다. 사용 측에서 `hud.relayoutAll()`을 연결해 열 개수를 갱신합니다.

### 8.3 호스트 숨김 시 렌더 스킵

```ts
private isHostHidden(): boolean {
  if (!this.Dom.isConnected) return true
  // 조상(예: #ghud-root)이 display:none이면 렌더 박스가 없음.
  // offsetParent는 position:fixed 요소에서 항상 null이므로 사용하지 않음 (fixed 모드가 영원히 스킵됨)
  return this.Dom.getClientRects().length === 0
}
```

- `update()` 진입부에서 검사하므로(§6.4) `hud.Hide()` 상태에서는 dynamic 검사·렌더가 모두 생략됩니다.
- 다시 보이게 되면 `wasHidden` 플래그로 전체 dirty를 세팅해 한 번 렌더합니다 (숨김 동안 놓친 변경 반영). `minimap.Hide()/Show()`에도 동일하게 적용됩니다.

### 8.4 사용 예 (`src/gamefab/hudfactory.ts`)

```ts
const minimap = new Minimap(this.eventCtrl, {
  mount: "embedded",
  shape: "circle",
  size: 160,
  align: "end",
  onVisibleChanged: () => this.hud.relayoutAll(),
})
this.hud.AddChild(minimap, { id: 'minimap', area: 'right', line: 1 })   // 버프 라인(0) 아래

// 제거 시
this.hud.remove('minimap')
minimap.Dispose()
```

- 주의: `#ghud-status`는 화면 상단 `position: fixed` 바이므로 embedded 미니맵은 **우상단 HUD 영역**에 표시됩니다. 하단 등 다른 위치가 필요하면 fixed 모드를 사용합니다.
- 같은 라인에 다른 child가 있으면 기본 N등분이 적용되므로, 필요 시 `setLineRatio('right', 1, '1fr 160px')`처럼 비율을 지정합니다 (열 순서 = `AddChild` 순서). 숫자 `size` 미니맵은 고정 px 열, `"fill"` 미니맵은 `1fr` 열에 둡니다 (§8.2).

---

## 9. 통합 방침

- 게임 로직(도시/전투/함대 등)에 의존하지 않는 모듈입니다. 의존 대상은 GUX, EventTypes, Canvas 루프(`RegisterLoop`), 그리고 Target 자동 추적용 `systems/targeting`(§10)뿐입니다. 진영 규칙은 호스트가 `targetStyle`로 주입합니다.
- HUD에 붙는 미니맵은 `src/gamefab/hudfactory.ts`가 **앱 수명 동안 하나** 생성해 `SoulMenuGroup`에 embedded로 넣습니다 (§8.4). State 전환마다 생성/Dispose 하지 않고, `beginTracking`/`endTracking`으로 세션을 나눕니다 (§10).
- HUD와 무관한 화면(예: 독립 전술 뷰)에 fixed 미니맵이 필요하면 그 화면이 생성·`Dispose()`를 소유합니다. 이벤트가 브로드캐스트이므로 동시에 하나만 존재해야 합니다 (§5).
- 실제 게임 객체(플레이어/건물/함선/몬스터) 등록은 §10의 HUD 연동 방식을 따릅니다. 전투 State는 Minimap을 직접 다루지 않습니다.

---

## 10. 게임 객체 등록 수명주기 (HUD 연동)

### 10.1 원칙

- **Minimap이 Target 이벤트를 직접 listen**합니다. 별도 브리지/세션 클래스를 두지 않습니다.
- **전투 State는 Minimap을 모릅니다.** 미니맵 활성/정리는 State가 이미 쓰는 HUD 경로(`HostHudPort.setVisible` → `TSEventTypes.HudCtrl` → `HudFactory`)에 연동합니다.
- Minimap 인스턴스는 `HudFactory`가 소유하는 **앱 수명 객체**(HUD embedded child)입니다. State마다 생성/Dispose 하지 않습니다.
- 진영별 색·아이콘 규칙은 호스트가 `targetStyle`로 주입합니다. 모듈은 gsdk 내부 `systems/targeting`에만 추가로 의존합니다.

### 10.2 등록 소스

전투 객체는 이미 `EventTypes.RegisterTarget / DeregisterTarget / UpdateTargetState / UpdateTargetObject`로 생명주기를 알립니다.

| 발신처 | id / teamId / kind | 등록 / 해제 |
|---|---|---|
| `actors/player/playerctrl.ts` | `"player"` / `player` / unit | `playerCtrl.init()` / `uninit()` |
| `actors/allies/allies.ts` | TargetId / `player` / unit | Summon / Release |
| `actors/monsters/monsters.ts` | TargetId / `monster` 등 / unit | CreateMonster / dispose, 사망은 `UpdateTargetState { alive: false }` |
| `interactives/building/buildingmanager.ts` | buildingId / `player` / structure | `attachToScene`·`refreshBuildingColliders` / `BuildingDestroyed` |
| `world/cityview/readonlycityruntime.ts` | key / NPC factionId / structure | 로드 / dispose·파괴 |

- 숲 등 환경 장애물은 미니맵에 표시하지 않습니다. Target이 아니며(전투 대상 아님) 대부분 `InstancedMesh` 인스턴스라 개별 `Object3D`도 없습니다.

**제약**
- **타이밍**: `ux/loading/loadingmgr.ts`는 `RegLoadingCommonItems` 큐를 모두 실행한 뒤 `RegLoadingCompleteCommonItem`을 실행합니다. 플레이어·아군·첫 웨이브·건물 RegisterTarget은 전자, `hud.setVisible(true)`는 후자입니다 → HUD가 켜질 때는 이미 등록이 끝나 있으므로 **Show 시점에 `TargetRegistrySystem`에서 시드**합니다.
- **잔여 Target**: `BuildingManager.detachFromScene()`은 `DeregisterTarget`을 보내지 않아 레지스트리에 다른 씬의 도시 건물이 남습니다. mesh는 parent에서 떼어지므로, 시드 시 **현재 씬에 붙어 있는 객체만** 받습니다.
- **부착 지연**: `GameCenter`는 새 모드의 `Init()`이 끝난 뒤 `Physics` 목록(플레이어 등)을 `scene.add` 합니다. HUD 표시(`beginTracking`)는 `Init()` 내부의 로딩 완료 콜백에서 일어나므로, 시드 시점에 플레이어는 아직 미부착입니다. 따라서 미부착 Target은 버리지 않고 **pending**으로 보관했다가 updateHz 틱마다 부착 여부를 확인해 등록합니다. 잔여 도시 건물은 pending에 남아 표시되지 않습니다.
- **이벤트 경로에서는 씬 부착 검사를 하지 않습니다**: `monsters.ts`는 `RegisterTarget` 후에 `game.add()`를 합니다.

### 10.3 흐름

```text
CommanderCityDefenseState / CommanderRivalAssaultState
  지형 생성 직후 SendEventMessage(MinimapConfig, { worldBounds })   ── 로딩 중 (§10.6)
CommanderCombatState
  hud.setVisible(true)                ── 로딩 완료 콜백 (RegLoadingCompleteCommonItem)
  hud.setVisible(false)               ── Uninit
        │ HostHudPort (src/index.ts)
        ▼ TSEventTypes.HudCtrl { visible }
HudFactory
  visible:true  → hud.Show(); minimap.beginTracking()
  visible:false → minimap.endTracking(); hud.Hide()
        ▼
Minimap
  beginTracking()
    1. clear()                                         // 이전 세션 잔여 마커 제거 (옵션은 유지)
    2. RequestTargetSystem → 캐시된 TargetRegistrySystem.getTargets({ aliveOnly: true })
       중 isAttachedToScene(object)인 것은 즉시 등록, 나머지는 pending  // parent 체인에 THREE.Scene 존재
       → update 틱마다 pending 부착 확인 후 등록 (Deregister/UpdateTarget*도 pending에 반영)
    3. tracking = true                                 // 이후 Target 이벤트 반영
    4. followTargetId 마커가 있으면 그 object를 follow (마커의 heading을 회전 소스로 함께 전달)
  endTracking()
    tracking = false → follow 해제 → clear() → setOptions({ worldBounds: undefined })
```

- `orientation`은 사용자 선택이므로 `worldBounds`와 달리 `endTracking()`에서 **초기화하지 않습니다**. 다음 세션에서도 같은 방향 모드가 유지되고, follow 해제 동안은 north 폴백으로 표시됩니다.

- `worldBounds`는 HUD가 켜지기 전 로딩 중에 `MinimapConfig`로 먼저 도착합니다. `clear()`는 마커만 지우고 옵션은 건드리지 않으므로 `beginTracking()` 이후에도 유지됩니다.
- 반대로 옵션은 세션이 끝나도 남으므로, `endTracking()`에서 `worldBounds`를 초기화해 다음 전투(다른 지형)로 넘어가지 않게 합니다.

### 10.4 Target 이벤트 매핑

리스너는 생성자에서 화살표 함수 필드로 등록하고, `Dispose()`에서 `DeregisterEventListener(type, this.onXxx)`로 해제합니다 (TargetRegistrySystem 리스너 보존, §7.4 주의사항).

| 이벤트 | `tracking === true`일 때 동작 |
|---|---|
| `RegisterTarget` | kind ∈ {unit, structure, ship}이고 `targetStyle`이 값을 주면 `{ id: "tgt:"+id, object, dynamic: kind !== "structure", ...style }` 등록. 같은 id 재등록(몬스터 풀 재사용)은 교체. id가 `followTargetId`면 follow 갱신 |
| `DeregisterTarget` | 해당 마커 제거 |
| `UpdateTargetState` | `alive` → `visible: alive`. teamId/factionId 변경 시 style 재계산 |
| `UpdateTargetObject` | `object` 교체 + 재스냅샷 |

- `tracking === false`면 모두 무시합니다 (HUD를 쓰지 않는 도시·은하 State의 건설·함선 등).
- id 접두사: Target은 `tgt:`. `MinimapRegister`로 직접 등록하는 마커는 이 접두사를 쓰지 않습니다.

### 10.5 호스트 측

- `HostHudPort`(`src/libgamestates/commons/hostports.ts`)와 `src/index.ts`의 `HudCtrl` 송신은 **변경하지 않습니다**.

**`HudFactory`** (`src/gamefab/hudfactory.ts`)

```ts
this.minimap = new Minimap(this.eventCtrl, {
  mount: "embedded", shape: "circle", size: 160, align: "end",
  onVisibleChanged: () => this.hud.relayoutAll(),
  followTargetId: "player",
  targetStyle: resolveTargetMarkerStyle,       // src/gamefab/minimapstyle.ts
})
this.hud.AddChild(this.minimap, { id: 'minimap', area: 'right', line: 1 })
```
- 기존 `HudCtrl` 핸들러에 `visible:true` → `minimap.beginTracking()`, `visible:false` → `minimap.endTracking()`만 추가합니다.
- `resolveTargetMarkerStyle`

| 조건 | 스타일 |
|---|---|
| `id === "player"` | 청록 triangle, `heading: () => minimapBearingOf(object)`, layer 10 |
| teamId `player` + unit (아군) | 파랑 dot, layer 5 |
| teamId `player` + structure (내 건물) | 회황 square |
| 그 외 + unit (적) | 빨강 dot, `clampToEdge`, layer 8 |
| 그 외 + structure (적 도시 건물) | 진홍 square |

### 10.6 State 측 (최소 변경)

State는 Minimap 인스턴스를 모르며, 지형 생성 직후 `worldBounds`만 이벤트로 보냅니다.

```ts
// CommanderCityDefenseState: 기존 frame(resolveGroundRoadFrame) 계산 직후
if (frame) this.eventCtrl.SendEventMessage(EventTypes.MinimapConfig, {
  worldBounds: minimapBoundsFromXZ(frame.bounds),
})

// CommanderRivalAssaultState: groundMesh 생성 후
const frame = resolveGroundRoadFrame(groundMesh)
if (frame) this.eventCtrl.SendEventMessage(EventTypes.MinimapConfig, {
  worldBounds: minimapBoundsFromXZ(frame.bounds),
})
```

- `worldBounds`는 최적화 옵션입니다. 보내지 않아도 마커는 표시되며, static 레이어가 뷰 크기 캐시로 동작합니다 (§6.2).
- `CommanderCombatState`, `HostHudPort`, 플레이어·아군·몬스터·건물 등록 코드는 **변경하지 않습니다.**

### 10.7 정리 보장

| 경로 | 처리 |
|---|---|
| 정상 종료·후퇴·패배 | Uninit `setVisible(false)` → `endTracking` → Clear |
| 로딩 중 abort | HUD가 켜지지 않았으므로 tracking도 시작 안 됨. 재진입 시 `beginTracking` 1단계 Clear. 로딩 중 이미 보낸 `worldBounds`는 `endTracking`을 거치지 않아 남지만, 다음 전투 State가 보내는 `MinimapConfig`로 덮어씀 |
| State 종료 후 늦은 Target 이벤트 (풀 재사용, 취소된 spawn, 도시 건설) | `tracking === false` → 무시 |
| 다른 씬의 잔여 Target (detach된 도시 건물) | 시드 시 미부착 → pending에 남아 표시 안 됨 (endTracking 시 비움) |
| `SceneClear` | Minimap clear (§5) — 2차 안전망 |
| 전투 중 사망/파괴 | `UpdateTargetState` / `DeregisterTarget`으로 즉시 반영 |
| 이전 세션의 `worldBounds` 잔류 | `endTracking`에서 `worldBounds = undefined` |

- 주의: 전투 중 HUD를 잠깐 숨기는 용도(대화 연출 등)로 `setVisible(false)`를 쓰면 마커가 지워집니다. 그런 경우가 생기면 "HUD 숨김"과 "HUD 세션 종료"를 구분하는 플래그를 `HudCtrl`에 추가합니다.

**수정 파일 (앱/State 측)**: `src/gamefab/hudfactory.ts`, 신규 `src/gamefab/minimapstyle.ts`, `src/libgamestates/simcitystates/commandercitydefensestate.ts`·`commanderrivalassaultstate.ts` (`MinimapConfig` 송신만)

---

## 11. 검증 계획

1. `cd src/gsdk && npx tsc --noEmit` 및 상위 프로젝트 `npx tsc --noEmit`으로 타입 확인.
2. `MinimapRegistry` 단위 테스트(순수 로직): moveEpsilon 경계, static↔dynamic Map 이동, 같은 id 재등록 교체, clear 후 dirty.
3. 앱 실행 후 임시 State에서 Minimap 생성, static 마커 다수(예: 500개) + dynamic 마커 수 개 등록.
4. 확인 항목
   - **fixed 모드에서 실제로 렌더되는지** (`isHostHidden` 회귀 확인)
   - 그룹 하위 객체를 `object`로 등록 시 월드 좌표로 표시
   - rect / circle 전환, 4개 앵커 위치 및 offset 반영
   - 줌 버튼/휠, min/max clamp
   - follow 시 static 레이어 재렌더 없이 이동 (`worldBounds` 지정 시, 렌더 카운터 로그로 확인)
   - dynamic 객체만 이동 반영, 모든 객체 정지 시 render 호출 0회
   - `clampToEdge` 마커의 가장자리 표시 (원형/사각형 각각)
   - 방향 모드 (§6.5)
     - 🧭 버튼 클릭으로 north ↔ heading 토글, `MinimapConfig { orientation }`도 동일 동작, `onOrientationChanged` 호출
     - north: 플레이어가 회전해도 지도는 고정, 플레이어 triangle만 회전
     - heading: 플레이어 triangle이 항상 위쪽, 지도가 회전, 버튼 바늘과 "N" 라벨이 실제 북쪽을 가리킴
     - heading + `worldBounds` 지정: 회전 중 static 재렌더 0회 (blit만)
     - heading + rect + `worldBounds` 없음: 45° 회전 시 모서리 빈 공간 없음 (대각선 캐시)
     - 회전 상태에서 `clampToEdge` 마커가 올바른 방향 가장자리에 표시
     - follow off / heading 소스 없음 → north 폴백 + 버튼 흐림, follow 재개 시 heading 복귀
     - 플레이어 정지·무회전 시 render 호출 0회 (`rotateEpsilon` 이하 변화 무시)
   - `MinimapUnregister` / `MinimapClear` / `SceneClear` 후 마커 제거 (캔버스 잔상 없음)
   - `Dispose()` 후 리스너·루프 해제 (재생성 시 중복 등록 없음, `SceneClear` 시 물리/브릭 리스너는 여전히 동작)
5. embedded 모드 (SoulMenuGroup)
   - `hud.AddChild(minimap, { id, area, line })` 후 grid 셀 안에 표시, 같은 라인의 다른 child와 겹치지 않음
   - `hud.Hide()` 상태에서 render 호출 0회, `hud.Show()` 후 즉시 최신 상태로 1회 렌더
   - `minimap.Hide()/Show()` 시 `relayoutAll()`로 열 개수 갱신
   - `size: "fill"`에서 창 크기 변경 시 canvas 정사각 리사이즈
   - `hud.remove('minimap')` + `Dispose()` 후 ResizeObserver·루프 해제
6. Target 추적 / HUD 연동 (§10)
   - 단위 테스트(가짜 eventCtrl·레지스트리): tracking off 시 이벤트 무시, 시드 시 씬 미부착 객체 제외, 같은 id 재등록 교체, `alive: false` → 숨김, `endTracking` 후 마커 0, `Dispose` 후 TargetRegistrySystem 리스너 생존
   - 방어전: HUD 표시 순간 플레이어·아군·첫 웨이브·건물이 모두 보임(시드 확인), 이후 웨이브 자동 추가, 건물 파괴·몬스터 사망 반영, 플레이어 follow·heading
   - 방어전: `MinimapConfig`로 받은 `worldBounds`가 `beginTracking` 후에도 유지 (follow 이동 시 static 재렌더 0회)
   - 후퇴 → 도시 복귀: 마커 0, `worldBounds` 초기화, 도시에서 건설해도 미니맵에 반영 안 됨
   - 라이벌 공격전: 플레이어 도시 건물이 섞이지 않고 적 건물만 표시, 방어전의 `worldBounds`가 아닌 라이벌 지형 범위 사용
   - 로딩 중 후퇴 반복 후 재진입: 중복 마커·리스너 누수 없음
