# City View Integration Plan

## 1) 개요

이 문서는 전략 은하 화면에서 도시를 클릭했을 때
도시 뷰를 보여주는 흐름과,
그 과정에서 필요한 NPC 도시 구성 규칙을 한 곳에 정리한 구현 가이드입니다.

이번 설계의 목적은 다음과 같습니다.

- `GalaxyMapState`에서 도시를 클릭하면 자연스럽게 도시 상세 화면으로 들어간다.
- **플레이어 도시**는 기존 `SimcityState`와 `BuildingManager` 런타임을 그대로 재사용한다.
- **경쟁/원주민 도시(NPC 도시)**는 읽기 전용 상태인 신규 `RivalCityViewState`를 만들어, 현재 턴 시뮬레이션 결과와 연결된 구성으로 보여준다.
- 별도 카메라 프리셋을 도입하지 않고 두 State 모두 동일한 감각의 grid view를 공통으로 사용한다.
- 선택 도시 정보는 `GameCenter` payload 확장 없이 `CitySceneSessionStore`를 통해 전달한다.

핵심 아이디어는 다음과 같습니다.
`rivalcity`가 NPC 도시 성장의 실제 상태를 소유하고,
`RivalCityViewState`는 그 상태를 `CustomGround` 위에 시각적으로 투영하는 전용 화면(State) 역할을 합니다.
NPC 도시 장식 환경은 shared `EnvironmentManager`에 등록하지 않고, 전용 readonly renderer가 직접 그립니다.

---

## 2) 플레이어 도시와 NPC 도시의 State 분리

초기에는 `SimcityState` 하나를 공통 셸로 재사용하는 것을 고려했으나,
다음과 같은 이유로 두 State를 분리하여 구현합니다.

- **코드 관심사 분리:** `SimcityState`에는 이미 플레이어 전용 UI(자원 바, 건설 링 메뉴)와 상호작용 로직이 하드코딩되어 있습니다. 분기문(`if isPlayer`)을 추가하는 대신 NPC 전용 State를 만들면 기존 코드를 오염시키지 않습니다.
- **메모리 라이프사이클 분리:** 플레이어 도시는 메모리에 지형과 건물 배치를 계속 유지해야 하지만, NPC 도시는 진입 시마다 결정론적(Deterministic)으로 렌더링하고, 벗어날 때 환경과 렌더 리소스를 완전히 해제해야 메모리 누수가 발생하지 않습니다.
- **명확한 라우팅:** 목적지가 플레이어인지 NPC인지에 따라 은하 맵에서 진입할 `GameModeId`를 명확히 나눌 수 있습니다.

### 플레이어 도시 (`SimcityState`)
- `BuildingManager`가 실제 건물 상태 소유
- 기존 건설, 업그레이드, UI 유지
- `EnvironmentManager` 인스턴스 유지 및 씬 `detach/attach`

### 경쟁/원주민 도시 (`RivalCityViewState`)
- 신규 `GameModeId.RivalCityView` 할당
- `RivalCityManager`가 성장 상태 소유, `RivalCityViewState`는 읽기 전용으로 시각화
- shared `EnvironmentManager`는 생성하지 않고 참조만 유지
- 장식 환경은 `NpcEnvironmentRenderer`가 직접 렌더 및 정리
- 진입 시마다 지형/건물/장식 환경 스냅샷을 재생성하고 퇴장 시 완전 해제

---

## 3) 상태 전환 흐름

권장 흐름은 아래와 같습니다.

1. `GalaxyMapState`에서 도시 항목 클릭
2. 대상 도시가 플레이어 소유인지 NPC(경쟁/원주민) 소유인지 판별
3. 선택된 대상에 따라 `CitySceneSessionStore`를 사용하고 `EventTypes.GameCenter` 발행
   - Player: `GameCenter(GameModeId.Simcity)`
   - NPC: `CitySceneSessionStore.setSelection({ planetId, cityId })` 후 `GameCenter(GameModeId.RivalCityView)`

```txt
GalaxyMapState
  -> onCityClick(planetId, cityId)
  -> 도시 소유권 판별
  -> if Player:
       -> EventTypes.GameCenter(GameModeId.Simcity)
  -> if NPC:
       -> CitySceneSessionStore.setSelection({ planetId, cityId })
       -> EventTypes.GameCenter(GameModeId.RivalCityView)

RivalCityViewState.Init()
  -> target cityId 조회 (SessionStore 필수)
  -> session 없으면 EventTypes.GameCenter(GameModeId.Galaxy) fallback
  -> RivalCityManager에서 상태 가져오기
  -> ReadonlyCityRuntime / NpcEnvironmentRenderer로 화면 구성
```

---

### 3.5) 복귀 흐름 (City View → GalaxyMapState)

도시 뷰에서 은하 화면으로 돌아가는 경로는 두 State 모두 동일한 패턴을 따릅니다.

- Ring 메뉴 "은하" 항목이 `EventTypes.GameCenter(GameModeId.Galaxy)`를 발행
- `GameCenter.ChangeMode()`가 현재 State의 `Uninit()`을 호출한 뒤 `GalaxyMapState.Init()`을 실행

**정리 책임 (`RivalCityViewState.Uninit`):**
NPC 도시 화면에서 빠져나올 때, 생성했던 readonly runtime과 장식 환경 renderer를 dispose하고 씬에서 객체를 완벽히 제거해야 합니다. 선택 컨텍스트(Session) 또한 초기화합니다.

```txt
RivalCityViewState (ring menu "은하" click)
  -> EventTypes.GameCenter(GameModeId.Galaxy)
  -> RivalCityViewState.Uninit()
       -> ReadonlyCityRuntime.dispose()
       -> NpcEnvironmentRenderer.dispose()
       -> Session 컨텍스트 초기화
  -> GalaxyMapState.Init()
```

---

## 4) `rivalcity`와 NPC 도시 구성의 연계

이번 설계에서 가장 중요한 연결점은
`RivalCityManager.advanceTurn()`가 NPC 도시 성장의 source of truth라는 점입니다.

현재 `RivalCityManager`는 매 턴마다 자원 생산, 건설 큐 진행, 점수 갱신 등을 처리합니다.
`RivalCityViewState`는 이 결과를 다시 시뮬레이션하지 않고 읽어서 시각적으로만 투영해야 합니다.

### 도시 구성 입력으로 사용하는 값

`RivalCityState`에서 도시 뷰가 읽어야 할 핵심 입력은 다음과 같습니다.

- `buildings`: 현재 도시가 실제로 가진 건물 roster
- `buildQueue`: 공사 중 부지와 공사 진행 상태 시각화
- `score`, `policies`, `factionId`: UI 요약 정보 및 밀도 표현
- `planetId`, `cityDefId`: 지형과 환경 포켓 배치 규칙의 기준

### 턴마다 도시를 새 랜덤으로 갈아엎지 않는 원칙

가장 피해야 할 것은 턴이 한 번 진행될 때마다
NPC 도시 건물 위치가 통째로 바뀌어 보이는 것입니다.

그래서 도시 구성은 아래 원칙을 따릅니다.

- 기존 슬롯 유지
- 새 건물은 빈 슬롯에 추가
- `buildQueue`는 `ConstructionSite`로 표시
- 슬롯 제거 시 즉시 압축하지 않고 tombstone 유지

즉, 턴 진행 후에도 기존 건물 위치는 유지되고,
신규 건물 또는 공사중 오브젝트만 추가 또는 치환됩니다.

정리하면, `rivalcity`는 도시가 어떻게 성장했는지 결정하고, `RivalCityViewState`는 그 결과를 맵 위에 어떻게 확정적으로 보여줄지 결정합니다.

---

### 4.1) Deterministic PRNG 사양

NPC 도시 레이아웃은 같은 도시를 몇 번 열어도 동일한 배치를 보장해야 합니다.
이를 위해 **seeded PRNG**를 도입합니다.

**`Math.random()` 사용 금지:** NPC 렌더링을 위한 위치·회전·스케일 결정에서 전역 `Math.random()`을 절대 사용하지 않습니다.

단, PRNG만으로는 배치 안정성을 보장하지 않습니다.
`RivalCityState.buildings`와 `buildQueue`의 변화에 따라 순회 순서가 달라지면 기존 건물 위치가 연쇄 이동할 수 있기 때문입니다.
따라서 deterministic layout은 아래 세 요소를 함께 사용해야 합니다.

- `cityId` 기반 시드
- stable key 기반 정렬
- append-only slot allocator + tombstone 유지

**시드 유도 규칙:**

```ts
// src/gsdk/src/util/seededrandom.ts
export function seedFromCityId(cityId: string): number {
  let hash = 5381;
  for (let i = 0; i < cityId.length; i++) {
    hash = ((hash * 31) + cityId.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // unsigned 32-bit
}
```

**PRNG:** mulberry32

```ts
export function mulberry32(seed: number): () => number {
  let s = seed;
  return function () {
    s |= 0; s = s + 0x6d2b79f5 | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 4.2) Stable key와 slot allocator 규칙

NPC 도시 snapshot 생성 시 건물과 공사중 항목은 먼저 stable key 기준으로 정렬합니다.

권장 stable key 예시:

- 완성 건물: `${buildingId}:${id}`
- 공사중 항목: `${buildingId}:${task.id}`

그 다음 slot assignment는 다음 규칙을 따릅니다.

1. 기존 slot mapping이 있으면 우선 재사용
2. 기존 mapping이 없는 새 항목은 빈 slot 뒤에 append
3. 제거된 항목의 slot은 즉시 당겨서 압축하지 않고 tombstone으로 남김
4. tombstone은 이후 새 항목이 들어올 때만 재사용 가능

이 규칙을 따르면 턴이 진행되어도 기존 건물의 위치는 유지되고,
신규 건물이나 `ConstructionSite`만 새 위치를 차지하게 됩니다.

---

## 5) 상세 배치 규칙

이 부분은 기존 `PlacementManager`와 `buildingDefs`, `environmentDefs` 제약을 재사용하며 구성합니다.

### 5.1 공통 grid 규칙
- `PlacementManager`의 `gridSize = 4.0` 기준 유지
- 건물 footprint 충돌 금지 및 환경과 겹침 방지

### 5.2 핵심 건물 우선 배치 및 카메라 초점
- `cc`(Civic Core)는 항상 중앙 core에 배치
- `RivalCityViewState.Init()` 시 카메라 `target`은 이 `cc`의 위치로 자동 설정하여 중앙을 비추도록 합니다.
- `well`, `lumbermill`, `mine` 등 자원 건물은 해당 자원 포켓 주위에 배치.

### 5.3 환경 포켓 규칙 (LumberMill / Mine)
- `lumbermill`이 있으면 주변에 `pine_tree` 클러스터를 보장하고 반경 내에 배치.
- `mine`이 있으면 주변에 `gold_node` 클러스터 보장.

### 5.4 공사중 건물 표현
- `RivalCityState.buildQueue`의 항목은 완료된 건물이 아닌 `ConstructionSite` 모델로 뷰에 표현.

### 5.5 profile별 성격 및 행성 환경 테마 연동
`profileId`는 도시의 macro layout과 환경 테마를 결정합니다.
행성의 특성에 맞춰 `RivalCityViewState`가 생성하는 `CustomGround`의 텍스처나 색상, 장식 환경 배치를 달리합니다.
예: `ice-moon`은 나무 없이 광물 산발 + 하얀색 계열 바닥 텍스처 등.

---

## 6) 구현 대상 컴포넌트 (NPC 도시 뷰 중심)

### `CitySceneSessionStore` (필수)
- 선택한 대상 NPC 도시(`cityId`, `planetId`) 컨텍스트를 저장해 `RivalCityViewState.Init()`이 읽을 수 있게 합니다.
- `GameCenter` 이벤트는 `mode`만 전달하므로 SessionStore는 선택이 아니라 필수입니다.

### `GameModeId.RivalCityView`
- `EventTypes.GameCenter` 등록 및 `RivalCityViewState` 라우팅용 신규 ID.

### `RivalCityViewState`
- `AbstractState`를 상속받은 신규 State.
- 기존 `SimcityState`와 분리되어 링 메뉴 최소화("은하" 복귀 전용), NPC 상태 UI 패널 포함.
- shared `EnvironmentManager`를 새로 생성하지 않음.
- SessionStore가 비어 있으면 즉시 `GameModeId.Galaxy`로 fallback.

### `CitySceneService`
- `RivalCityManager`와 `StrategicGalaxyManager`에서 상태를 읽어와 deterministic layout snapshot을 생성합니다.
- `resolveNpcCity(cityId)`
- `buildLayoutSnapshot(...)`
- `buildNpcEnvironmentSnapshot(...)`

### `ReadonlyCityRuntime`
- 건물, 공사중 오브젝트, 요약 패널을 읽기 전용으로 배치/정리합니다.

### `NpcEnvironmentRenderer`
- `pine_tree`, `gold_node` 같은 장식 환경 mesh를 deterministic하게 직접 렌더합니다.
- shared `EnvironmentManager`에 footprint나 query 대상으로 등록하지 않습니다.
- `dispose()`에서 geometry/material/object를 정리합니다.

### `StrategicGalaxyManager` 조회 API
- `getCityPlacement(cityId)`
- `getPlanetDef(planetId)`
- `getLatestCityOutput(cityId)`

### `RivalCityManager.getCityState`
- `getCityState(cityId): RivalCityState | undefined`

### `BuildingManager.exportPlayerCitySceneSnapshot`
- 플레이어 도시 실제 배치를 export하는 snapshot API

SessionStore와 renderer의 최소 인터페이스 예시는 다음과 같습니다.

```ts
CitySceneSessionStore
  setSelection({ planetId, cityId })
  getSelection()
  clearSelection()

NpcEnvironmentRenderer
  attach(scene)
  render(snapshot, prng)
  dispose()
```

---

## 7) Save/Load 정책 및 라우팅 방어

### NPC 도시 시각 상태는 ephemeral
- NPC 도시 레이아웃은 게임 저장 데이터에 포함하지 않습니다. `RivalCityState[]` (논리 상태)만 저장.

### 강제 복귀 (Routing Fallback) 방어 로직
- `RivalCityViewState.Init()`에서 대상 `cityId` 컨텍스트가 없음을 감지하면 즉시 `EventTypes.GameCenter(GameModeId.Galaxy)`를 호출해 은하 맵으로 fallback 합니다.
- 현재 NPC 시각 snapshot은 저장하지 않고 `RivalCityState[]`만 저장합니다.

---

## 8) 검증 항목

구현 후 최소한 아래 시나리오는 검증해야 합니다.

- **분리 진입:** 은하 화면에서 플레이어 도시 클릭 시 `SimcityState` 진입(기존 유지), NPC 도시 클릭 시 신규 `RivalCityViewState` 진입.
- **Session 기반 라우팅:** NPC 도시 클릭 시 `CitySceneSessionStore`를 통해 대상 도시를 정확히 읽고, session이 없으면 `Galaxy`로 fallback 하는지 확인.
- **UI 교체:** NPC 도시 뷰에서는 건설 메뉴 팝업이 없고 상단 자원바 대신 도시 정보 요약 팝업과 "은하"로 돌아가는 링 메뉴만 존재하는지 확인.
- **메모리 릴리스:** NPC 도시 뷰를 나갔다 들어올 때 readonly runtime과 장식 환경 renderer가 정상 dispose되는지 확인.
- **Deterministic 레이아웃:** 턴이 지나지 않았다면 NPC 도시 뷰를 닫았다가 다시 열어도 건물의 위치가 완벽히 동일한지 확인.
- **안정 슬롯 유지:** 턴 진행 후에도 기존 건물 위치는 유지되고, 신규 건물 또는 `ConstructionSite`만 추가/치환되는지 확인.
- **공유 환경 보호:** NPC 도시 장식 환경이 `EnvironmentManager`의 query/build footprint에 섞이지 않는지, 이후 플레이어 도시의 `BuildRequirementValidator` 결과가 변하지 않는지 확인.
- **가스/얼음 행성 테마 연동:** 행성 특성(`profileId`)에 따라 지형의 색상과 생성되는 환경 객체(`pine_tree`, `gold_node`)가 알맞게 조절되는지 확인.
- **아키타입 포켓 규칙:** `forest_guild`는 tree pocket + `lumbermill` 근접, `mountain_syndicate`는 mineral pocket + `mine` 근접 규칙을 만족하는지 확인.

---

이 구조를 따르면 플레이어 도시 로직(`SimcityState`)의 복잡성을 키우지 않으면서도, 독립적이고 안전하게 NPC 도시 뷰를 시각화할 수 있습니다.
