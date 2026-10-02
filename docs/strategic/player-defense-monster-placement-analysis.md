# 플레이어 도시 방어전 몬스터 배치 분석 및 설계

이 문서는 두 단락으로 구성한다.

- **현재 구현 분석**: 플레이어 도시 방어전의 몬스터 웨이브와 스폰 위치가 지금 어떻게 결정되는지 정리한다.
- **개선 설계**: 군기는 아군 스폰 지점으로만 쓰고, 몬스터는 preset 도로 레이아웃의 맵 가장자리 도로 끝에서 진입하도록 바꾸는 설계를 정의한다.

## 1. 현재 구현 분석

### 1.1 개요

플레이어 도시 방어전(`CityCombatMode.PlayerDefense`)에서 몬스터 배치는 두 단계로 결정된다.

1. **웨이브 구성**: 어떤 `MonsterId`들이 몇 번째 웨이브에 등장하는지 결정한다.
2. **스폰 위치**: 선택된 웨이브의 각 몬스터를 스폰 기준점(`spawnPos`) 주변 어디에 생성할지 결정한다.

스폰 기준점은 도시 경계나 CC 중심이 아니라 아군 집결 지점(주로 군기 건물 위치)이며, 링 반지름은 도시 크기와 무관한 고정 공식으로 계산된다(§1.4, §1.5 참고).

> **목표 동작과 다르다.** 군기는 아군 스폰 지점으로만 쓰고, 몬스터는 맵 가장자리의 도로 끝(도로 모양은 preset 데이터로 정의)에서 진입해야 한다. 현재 구현 분석은 §1, 목표 설계는 §2에 정의한다.

현재 구현에서 `ThreatBook`(`actors/battle/threatbook.ts`, `actorcombatcontroller.ts`에서 사용)은 피격 위협도와 타겟 재선정에 사용되며, 몬스터의 초기 배치나 웨이브 구성에는 관여하지 않는다.

### 1.2 진입 컨텍스트

도시 방어전은 `SimcityState.enterCityDefense()`에서 시작된다.

- 플레이어 도시 배치 정보를 `galaxyManager.getPlayerCityPlacement()`로 조회한다.
- 같은 행성에 있고 플레이어와 다른 faction이며 active 상태인 라이벌 도시 중 `score.total`이 가장 높은 도시를 `rivalCityManager.getMostThreateningCity()`로 고른다.
- 선택된 도시 id는 `CityCombatContextStore`의 `attackerCityId`로, 행성 id는 `planetId`로 저장된다.
- 전투 모드는 `GameModeId.CityCombat`으로 전환된다.

`getPlayerCityPlacement()`가 `undefined`이면 `attackerCityId`와 `planetId`가 모두 비어 있는 컨텍스트가 저장된다.

관련 파일:

- `src/libgamestates/warstates/simcitystate.ts`
- `src/libgamestates/commons/citycombatcontextstore.ts`
- `src/gsdk/src/gameobjects/rivalcity/rivalcitymanager.ts`

### 1.3 웨이브 구성 결정

방어전의 웨이브 목록은 `PlayerDefenseState.resolveWaves()`에서 다음 우선순위로 결정된다. 이 메서드는 `BaseCityCombat.resetForInit()`에서 `initMode()`보다 먼저 호출되어 `currentWaves`에 저장된다.

| 우선순위 | 데이터 소스 | 설명 |
| --- | --- | --- |
| 1 | `RivalCityDef.armyDeck` | `ctx.attackerCityId`가 있으면 해당 라이벌 도시의 병력 덱을 사용한다. |
| 2 | `StrategicPlanetDef.combatWaves` | 공격 도시 덱이 없으면 `ctx.planetId ?? ctx.selection?.planetId` 행성의 기본 전투 웨이브를 사용한다. |
| 3 | `BaseCityCombat.FallbackWaves` | 위 두 데이터가 없으면 기본 좀비 웨이브를 사용한다. |

즉, 방어전의 몬스터 종류는 기본적으로 "가장 위협적인 같은 행성 라이벌 도시"가 있으면 그 도시의 `armyDeck`에 의해 정해진다. 공격 도시를 찾지 못하거나 `armyDeck`이 비어 있으면 행성별 `combatWaves`로 내려간다. 플레이어 도시 배치 정보가 없으면 두 값이 모두 없으므로 곧바로 `FallbackWaves`가 사용된다.

`RivalCityManager.getArmyDeck()`은 해당 도시의 `cityDefId`에 대응하는 **정적 정의**(`rivalCityDefs[cityDefId].armyDeck`)를 그대로 반환한다. 라이벌 도시의 현재 점수, 레벨, 자원, 정책은 웨이브 구성이나 몬스터 강도에 반영되지 않는다.

관련 파일:

- `src/libgamestates/warstates/playerdefensestate.ts`
- `src/gsdk/src/gameobjects/rivalcity/rivalcitydefs.ts`
- `src/gsdk/src/gameobjects/strategicgalaxy/strategicgalaxydefs.ts`
- `src/libgamestates/warstates/basecitycombat.ts`

### 1.4 스폰 기준점 결정

몬스터 위치의 중심점은 `PlayerDefenseState.initMode()`에서 `this.spawnPos`로 저장된다. 우선순위는 다음과 같다.

| 우선순위 | 기준점 | 설명 |
| --- | --- | --- |
| 1 | 군기(`BuildingType.Flag`) 건물 위치 | `buildingManager.getBuildings()` 중 `type === BuildingType.Flag`인 건물이 있으면 그 위치를 사용한다. 여러 개면 처음 찾은 건물을 사용한다. |
| 2 | 플레이어 CC 주변 | 방어 핵심 건물 위치에 `(12, 0, 12)` 오프셋을 더한 위치를 사용한다. |
| 3 | 기본 위치 | 둘 다 없으면 `DefaultCityCombatSpawnPosition`, 현재 `(5, 0, 5)`를 사용한다. |

아군도 같은 `spawnPos` 근처에 소환된다(`startAllies()`). 따라서 현재 구현에서 `spawnPos`는 아군 병력 집결 기준점이자 적 스폰 링의 중심이다.

관련 메서드:

- `PlayerDefenseState.resolveArmyFlagSpawnPos()`
- `PlayerDefenseState.resolvePlayerCcSpawnPos()`
- `PlayerDefenseState.resolvePlayerDefenseCoreTargetId()`

### 1.5 원형 링 배치

실제 몬스터 생성은 `BaseCityCombat.spawnCombatWave()`에서 수행된다. `PlayerDefense`는 `BaseCityCombat.resolveWaveSpawnParams()` 기본 구현을 사용한다(오버라이드 없음).

```typescript
protected resolveWaveSpawnParams(spawnWaveNumber: number): CityCombatWaveSpawnParams {
  return {
    radius: 35 + spawnWaveNumber * 8,
    center: this.spawnPos.clone(),
    teamId: TargetTeamId.Monster,
  };
}
```

`spawnWaveNumber`는 1부터 시작한다. 따라서 기본 반지름은 다음과 같다.

| 웨이브 | 반지름 |
| --- | --- |
| 1 | 43m |
| 2 | 51m |
| 3 | 59m |

링 중심은 도시 중심이 아니라 `spawnPos`이며, 반지름은 도시 크기와 무관하다. `RivalAssaultState.resolveRivalCityEntrySpawnPos()`는 건물 분포로 `cityRadius`를 계산하지만, 방어전에는 이런 보정이 없다. 따라서 군기가 도시 가장자리에 있으면 링의 일부가 도시 내부(건물 사이)나 도시 반대편 외곽에 걸칠 수 있다.

각 웨이브 안의 몬스터들은 원 둘레에 균등하게 배치된다.

```typescript
const angle = (Math.PI * 2 * index) / wave.length;
const pos = center.clone().add(new THREE.Vector3(
  Math.cos(angle) * radius,
  0,
  Math.sin(angle) * radius,
));
```

예를 들어 3마리 웨이브라면 `0도`, `120도`, `240도` 방향에 하나씩 배치된다. 4마리라면 `0도`, `90도`, `180도`, `270도` 방향이다. 시작 각도는 항상 0도(+X 방향)이며 무작위 회전이 없다. 따라서 마릿수가 같은 웨이브는 매번 같은 방향에서 등장한다.

생성되는 몬스터의 팀은 공격 도시의 faction이 아니라 항상 `TargetTeamId.Monster`다. `RivalAssaultState`는 `snapshot.summary.factionId`를 사용하므로 두 모드의 팀 설정은 비대칭이다.

#### 1.5.1 NavGrid 스냅

계산된 위치는 최종 생성 전에 `navGrid.snapToWalkable(pos)`로 이동 가능한 셀에 보정된다.

- 결과 좌표는 셀 중심(`gridSize`, 기본 4m)으로 정렬되며, y는 `heightProvider`(지형) 높이로 설정된다.
- 회피 대상은 NavGrid 빌드 시 등록된 structure 타겟 장애물뿐이다. `EnvironmentManager`가 배치한 나무 같은 환경 오브젝트는 고려하지 않는다.
- `navGrid`가 없거나 준비되지 않았거나, `WALKABLE_SEARCH_RING`(12링) 안에 walkable 셀이 없으면 원래 계산 좌표를 그대로 사용한다. 이때 y는 0이며 지형 높이가 반영되지 않는다.

`BaseCityCombat.findSafeSpawnPos()`는 물리 충돌을 피해 주변 원형 레이어를 탐색하는 헬퍼지만, `spawnCombatWave()`의 몬스터 생성 경로에서는 사용하지 않는다. 방어전 스폰 보정은 NavGrid 스냅에만 의존한다.

#### 1.5.2 NavGrid 커버 영역과의 결합

`BaseCityCombat.resolveNavGridArea()`는 모든 웨이브에 대해 `resolveWaveSpawnParams(i)`를 호출하고, `radius + 48m` 범위와 모든 structure bounds를 합쳐 NavGrid 영역을 정한다. 따라서 `resolveWaveSpawnParams()`의 반지름이나 중심을 바꾸면 NavGrid 커버 영역도 함께 바뀐다.

### 1.6 초기화 및 웨이브 진행

#### 1.6.1 초기화 순서

1. `resetForInit()`: 컨텍스트를 저장하고 `resolveWaves()`로 `currentWaves`를 결정한다.
2. `initMode()`의 로딩 콜백에서 다음 순서로 진행한다.
   1. 스카이박스와 지평선을 생성하고 `refreshBuildingColliders()`를 호출한다.
   2. `spawnPos`를 결정한다(§1.4).
   3. `startAllies()`로 아군을 소환한다.
   4. `resolvePlayerDefenseCoreTargetId()`로 방어 핵심 건물을 결정한다.
   5. `buildCombatNavGrid()`로 NavGrid를 빌드한다(영역은 `spawnPos` 기준 링에 의존).
   6. `spawnCombatWave()`로 초기 웨이브를 스폰한다.
   7. `activateCombatAfterInitialSpawn()`으로 `runState`를 `Active`로 바꾼다.

#### 1.6.2 웨이브 진행

초기 이후의 웨이브는 `PlayerDefenseState.updateMode()`에서 관리된다(`runState === Active`일 때만 호출됨).

1. 현재 스폰 중이면 대기한다.
2. 방어 핵심 건물이 파괴되었으면 패배 처리한다.
3. 현재 활성 몬스터가 살아 있으면 다음 웨이브를 내지 않는다.
4. 활성 몬스터가 모두 처치되고 모든 웨이브가 끝났으면 승리 처리한다.
5. 남은 웨이브가 있으면 `waveDelay`를 감소시키고, 0 이하가 되면 다음 웨이브를 스폰한다.

`spawnCombatWave()`는 정상 스폰 시 `waveDelay = 3`으로 설정한다. 스폰이 전부 실패하면 `waveDelay = 1`로 줄여 빠르게 재시도한다.

### 1.7 한계 및 주의 사항

| 항목 | 현재 동작 | 영향 | 목표 설계 반영 |
| --- | --- | --- | --- |
| 링 중심/반지름 | 중심은 `spawnPos`(군기/CC+오프셋), 반지름은 `35 + n*8` 고정 | 도시 크기와 무관하므로 도시 내부나 외곽 한쪽에 치우친 스폰이 발생할 수 있다. | 해결(§2: 도로 끝 진입점) |
| 스폰 각도 | 시작 각도 0도 고정, 무작위성 없음 | 같은 마릿수의 웨이브는 매번 같은 방향에서 등장한다. | 해결(§2.4: 도로 순서 무작위) |
| 스냅 실패 | 원래 좌표 사용, y=0 | 지형이 높은 곳이나 나무 밀집 지역에 끼인 채 스폰될 수 있다. | 부분 해결(§2.8: 도로 폭 안 슬라이드, 실패 시 제외) |
| 팀 설정 | 항상 `TargetTeamId.Monster` | 공격 도시 faction이 반영되지 않으며, `RivalAssault`와 비대칭이다. | 범위 밖(별도 과제) |
| 덱 스케일링 | `armyDeck`은 정적 정의 | 라이벌 도시의 성장, 점수, 레벨이 침공군 강도에 반영되지 않는다. | 범위 밖(별도 과제) |
| 전체 스폰 실패 | `waveIndex`가 증가하지 않고 1초마다 재시도, 상한 없음 | 특정 `MonsterId`가 영구적으로 생성에 실패하면 전투가 끝나지 않는다. | 범위 밖(별도 과제) |
| 부분 스폰 실패 | 1마리 이상 생성되면 성공 처리 | 실패한 몬스터는 보충되지 않아 웨이브가 약해진다. | 범위 밖(별도 과제) |
| 패배 판정 대상 | id가 `_cc`로 끝나거나 `:cc`를 포함하는 구조물, 없으면 첫 번째 플레이어 structure | CC가 없으면 임의 건물 하나가 파괴되어도 패배한다. targetRegistry가 없거나 구조물이 없으면 패배 조건이 사라진다. | 범위 밖(별도 과제) |

### 1.8 현재 구조 기준 수정 지점

이 표는 현재 구현을 부분적으로 조정할 때의 수정 위치다. 목표 설계(§2)를 구현할 때의 변경 대상은 §2.5를 따른다.

| 변경 목표 | 수정 위치 | 비고 |
| --- | --- | --- |
| 특정 도시 침공군 구성 변경 | `src/gsdk/src/gameobjects/rivalcity/rivalcitydefs.ts`의 `armyDeck` | |
| 행성 기본 침공 웨이브 변경 | `src/gsdk/src/gameobjects/strategicgalaxy/strategicgalaxydefs.ts`의 `combatWaves` | |
| 방어전 스폰 기준점 변경 | `src/libgamestates/warstates/playerdefensestate.ts`의 `spawnPos` 결정 로직 | 아군 소환 위치와 NavGrid 영역도 함께 바뀐다. |
| 방어전 링 반지름 변경 | `PlayerDefenseState`에서 `resolveWaveSpawnParams()` 오버라이드 | 기본 구현(`basecitycombat.ts`)을 직접 바꾸면 다른 모드에도 영향이 있다. NavGrid 영역(§1.5.2)도 함께 바뀐다. |
| 원형 균등 배치가 아닌 다른 형태 적용 | `src/libgamestates/warstates/basecitycombat.ts`의 `spawnCombatWave()` | 모든 CityCombat 모드에 공통 적용된다. |
| 단일 방향/클러스터 스폰 적용 | 본 문서 §2(도로 끝 진입점 스폰) | `single-point-spawn-design.md`의 PlayerDefense 부분은 §2로 대체되었다(§2.9). |

## 2. 개선 설계: 도로 끝 진입점 스폰

> 이 절에서 `(제안)`이 붙은 식별자는 아직 코드에 없는 신규 이름이다. 표기가 없는 식별자는 현재 코드에 존재한다.

### 2.1 요구사항

- **역할 분리**: 군기(`BuildingType.Flag`)는 아군 스폰 지점이다. 몬스터 스폰 위치 계산에는 사용하지 않는다.
- **맵 가장자리 진입**: 몬스터는 도시 근처가 아니라 맵 가장자리에서 생성되어 도시 쪽으로 진군한다.
- **도로 끝 진입점**: 진입점은 숲 배치가 만든 도로의 바깥쪽 끝이다.
- **데이터 기반 도로**: 도로 모양은 코드 리터럴이 아니라 preset 데이터로 정의한다. **도시별 지정**과 **행성 프로필별 기본값**으로 달라질 수 있어야 한다.
- **도로 형태**: 방사형 직선과 폴리라인(꺾인 도로)을 지원한다.
- **숲과의 독립성**: 도로 레이아웃과 진입점은 숲 유무와 무관하게 유효하다. `CitySceneService`처럼 행성 프로필에 따라 숲을 끄는 경우(`PROFILE_NATURAL_FOREST_COUNTS`가 0)에도 같은 레이아웃으로 진입점을 계산한다. 숲은 도로를 시각적으로 드러낼 뿐이다.

### 2.2 현재 도로 구현과 문제점

현재 도로는 숲 배치 옵션으로만 존재하며, 다음과 같이 고정되어 있다.

| 항목 | 값 | 출처 |
| --- | --- | --- |
| 도로 중심 / 범위 | `SimcityState`: 지면 오브젝트 bounds 중심과 bounds(`Box3.setFromObject(ground)`)<br>`CitySceneService`: `TOWN_CENTER (0, 0)`과 `±NATURAL_FOREST_HALF_EXTENT(250)` | `EnvironmentManager.populateGroundWithRadialPaths()`, `citysceneservice.ts` |
| 도로 수 | `roadCount: 5` | `SimcityState.Init()` 리터럴 |
| 도로 방향 | `roadAngleOffset + (2π / roadCount) * i`, `roadAngleOffset = -π/2` → -90°, -18°, 54°, 126°, 198° | `isInsideRadialPathOpening()` |
| 도로 폭 | `roadWidth: 12` (중심선 좌우 6m) | `SimcityState.Init()` 리터럴 |
| 도로 시작 | 중심에서 `clearingRadius: 100` 지점 (그 안쪽은 빈터) | `isInsideRadialPathOpening()` |
| 도로 끝 | 도로 방향으로 지면 bounds 경계에 닿는 지점 | 지면 bounds |

문제점:

- **중복 정의**: 같은 값이 `world/cityview/citysceneservice.ts`의 `NATURAL_FOREST_CLEARING_RADIUS`, `NATURAL_FOREST_ROAD_COUNT`, `NATURAL_FOREST_ROAD_WIDTH`, `NATURAL_FOREST_ROAD_ANGLE_OFFSET` 상수에도 따로 정의되어 있다. 한쪽만 바꾸면 도로와 진입점이 어긋난다.
- **표현력 부족**: `RadialPathOpeningOptions`와 `isInsideRadialPathOpening()`은 "균등 각도의 방사형 직선"만 표현할 수 있다. 도로별 각도·폭이나 꺾인 도로는 표현할 수 없다.
- **선택 불가**: 도시나 행성에 따라 다른 도로를 쓸 방법이 없다.

도로 기하는 게임 진행 중에 바뀌지 않는다. 숲은 `envManager`가 없을 때 한 번만 생성되고 이후에는 재부착된다. 방어전 진입 시 `SimcityState.Uninit()`은 지면과 숲을 씬에 유지하므로, 방어전 맵에도 같은 도로가 존재한다. 다만 도로 **상태**(건물·벌목)는 바뀔 수 있다(§2.8).

### 2.3 도로 레이아웃 preset

#### 2.3.1 데이터 모델

gsdk에 도로 레이아웃 정의를 둔다(예: `src/gsdk/src/world/cityroad/cityroadtypes.ts`, `cityroaddefs.ts` (제안)).

```typescript
// (제안)
export enum CityRoadLayoutId {
  Radial5 = "radial5",   // 현재 동작과 동일한 기본 preset
  // 예: Radial3 = "radial3", Canyon = "canyon", ...
}

export type CityRoadPoint = { x: number; z: number }; // 도시 중심 기준 로컬 좌표(m)

export type CityRoadDef =
  | {
      kind: "radial";
      angleDeg: number;          // 도로 방향
      width: number;
      startRadius?: number;      // 기본 = layout.clearingRadius
    }                            // startRadius → 지면 끝까지 직선
  | {
      kind: "polyline";
      points: CityRoadPoint[];   // 첫 점: 빈터 경계 부근, 마지막 점: 바깥쪽 끝
      width: number;
      extendToEdge?: boolean;    // true면 마지막 선분 방향으로 지면 끝까지 연장
    };

export interface CityRoadLayoutDef {
  id: CityRoadLayoutId;
  clearingRadius: number;
  roads: CityRoadDef[];
  rotationDeg?: number;          // 레이아웃 전체 회전
  entryEdgeMargin?: number;      // 진입점을 지면 끝에서 안쪽으로 당기는 거리, 기본 16m
  blockConstruction?: boolean;   // 도로 위 건설 금지 여부, 기본 false (§2.8)
}
```

균등 방사형 도로는 헬퍼 `makeRadialRoads(count, width, offsetDeg)` (제안)로 생성한다. 현재 동작은 다음 preset으로 옮긴다.

```typescript
// (제안)
[CityRoadLayoutId.Radial5]: {
  id: CityRoadLayoutId.Radial5,
  clearingRadius: 100,
  roads: makeRadialRoads(5, 12, -90),
}
```

#### 2.3.2 preset 선택 규칙

도시의 도로 레이아웃은 다음 우선순위로 결정한다.

도시 배치는 두 층으로 존재한다. 선택 규칙은 이를 구분한다.

- **정의 데이터**: `StrategicPlanetDef.cityPlacements`의 `StrategicPlanetCityPlacement`. 라이벌/NPC 도시 배치를 정의한다.
- **런타임 배치**: `StrategicGalaxyManager.cityPlacements`의 `StrategicCityPlacement`. 플레이어 도시는 정의 데이터 없이 런타임에 `"player-city"`로 생성된다(`strategicgalaxymanager.ts`). 라이벌 도시는 `RivalCityState`로부터 생성된다. `SimcityState`는 이를 `StrategicPlayerCityPlacement`(id/name/planetId/factionId)로 받는다.

| 우선순위 | 라이벌/NPC 도시 | 플레이어 도시 |
| --- | --- | --- |
| 1 | `StrategicPlanetCityPlacement.roadLayoutId` (제안 필드) | `StrategicPlanetDef.playerCityRoadLayoutId` (제안 필드) |
| 2 | `RivalCityDef.roadLayoutId` (제안 필드, archetype 성격의 기본값) | 해당 없음 |
| 3 | `PlanetProfileRoadLayouts[StrategicPlanetDef.profileId]` (제안) | 같음 |
| 4 | `CityRoadLayoutId.Radial5` | 같음 |

- **단일 resolver**: `resolveCityRoadLayout({ planetDef, placementDef?, cityDef?, isPlayerCity }): CityRoadLayoutDef` (제안)를 gsdk에 두고 다음 세 곳이 공통으로 사용한다. 세 곳이 서로 다른 값을 쓰는 일이 없어야 한다.
  - `SimcityState` (플레이어 도시 숲 생성)
  - `CitySceneService` (NPC/라이벌 도시 뷰 숲 생성)
  - `PlayerDefenseState` (진입점 계산)
- **런타임 전달**: `StrategicGalaxyManager`는 배치를 만들 때 resolve한 id를 `StrategicCityPlacement.roadLayoutId` (제안 필드)에 싣는다. `getPlayerCityPlacement()`가 반환하는 `StrategicPlayerCityPlacement`에도 같은 필드를 싣는다.
- **컨텍스트 전달**: `SimcityState.enterCityDefense()`는 placement의 `roadLayoutId`를 `CityCombatContext.roadLayoutId` (제안 필드)에 저장한다. 방어전은 이 id로 레이아웃을 조회하므로 숲 생성과 같은 레이아웃을 보장받는다. 값이 없으면 `planetId`로 resolver를 다시 호출한다.
- **세이브 불필요**: 위 입력은 모두 정의 데이터(행성 정의, 라이벌 도시 정의, 프로필 매핑)에서 나온다. 따라서 도로 레이아웃을 세이브 데이터에 저장할 필요가 없고, 같은 정의에서는 항상 같은 결과가 나온다.
- **기하 입력 분리**: resolver는 레이아웃 정의만 반환한다. 도로 중심과 범위는 호출자마다 다르므로(§2.2) 기하 함수(`isInsideRoadLayoutOpening`, `computeRoadEntries`)의 인자로 넘긴다.

#### 2.3.3 도로 판정 일반화

숲 배치의 도로 판정을 레이아웃 기반으로 바꾼다.

- `isInsideRoadLayoutOpening(pos, layout, center, bounds)` (제안): 다음 중 하나면 true를 반환한다.
  - 빈터 원(`clearingRadius`) 안에 있다.
  - 어떤 도로 선분까지의 수평 거리가 `width / 2` 이하다.
- 선분 변환 규칙:
  - radial: `center + dir * startRadius` → 지면 bounds 경계까지의 한 선분.
  - polyline: 인접한 점 쌍마다 선분 하나. `extendToEdge`면 마지막 선분을 지면 경계까지 연장한다.
  - `rotationDeg`는 변환 전에 모든 방향과 점에 적용한다.
- 선분 목록은 레이아웃마다 한 번만 계산해 캐시한다. 숲 판정은 셀마다 호출되기 때문이다.
- 기존 `isInsideRadialPathOpening()`과 `RadialPathOpeningOptions`는 `radial5`와 같은 결과를 내는 호환 래퍼로 남기고, 호출부 이전 후 제거한다.
- `createRadialEnvironmentPattern()`과 `EnvironmentManager.populateGroundWithRadialPaths()`는 개별 옵션(`roadCount`, `roadWidth`, `roadAngleOffset`, `clearingRadius`) 대신 `CityRoadLayoutDef`를 받도록 바꾼다.

#### 2.3.4 진입점 계산

도로마다 진입점 `entry`와 진입 방향 `dir`(도시에서 바깥쪽 방향)을 계산한다.

| 도로 종류 | `entry` | `dir` |
| --- | --- | --- |
| radial | 도로 방향으로 지면 bounds 경계까지 간 지점에서 `entryEdgeMargin`만큼 안쪽 | 도로 방향 |
| polyline + `extendToEdge` | 마지막 선분을 지면 경계까지 연장한 지점에서 `entryEdgeMargin`만큼 안쪽 | 마지막 선분 방향 |
| polyline | 마지막 점. 지면 bounds 밖이면 bounds 안으로 클램프한 뒤 `entryEdgeMargin`을 적용한다. | 마지막 선분 방향 |

사각형 bounds에서 경계까지의 거리는 다음과 같이 구한다.

```typescript
const tX = Math.abs(dir.x) > 1e-6 ? (dir.x > 0 ? maxX - p.x : p.x - minX) / Math.abs(dir.x) : Infinity;
const tZ = Math.abs(dir.z) > 1e-6 ? (dir.z > 0 ? maxZ - p.z : p.z - minZ) / Math.abs(dir.z) : Infinity;
const edgeDist = Math.min(tX, tZ);           // p: 연장을 시작하는 점
const entry = p.clone().addScaledVector(dir, edgeDist - margin);
```

- 최종 진입점이 빈터 원 안에 들어오면(지면이 너무 작거나 클램프로 끌려 들어온 경우) 그 도로는 진입점으로 쓰지 않는다.
- 이 계산은 `EnvironmentManager` 인스턴스와 NavGrid에 의존하지 않는 순수 함수 `computeRoadEntries(layout, center, bounds)` (제안)로 둔다. NavGrid 빌드 전에 호출할 수 있어야 한다(§2.5.1 초기화 순서).

### 2.4 웨이브 배치

- **도로 선택**: 전투 세션 시작(`initMode`) 시 유효한 진입 도로(§2.8 검증 통과)의 순서를 무작위로 정한다. 각 웨이브는 그 순서에 따라 도로 하나를 사용한다(웨이브마다 다른 방향에서 진입). 한 웨이브를 여러 도로로 나누는 방식은 이후 확장 옵션으로 둔다.
- **대형**: 원형 링 대신 진입 도로를 따른 종대로 배치한다.
  - 위치 = `entry - dir * (row * RowSpacing) + perp * colOffset`
  - `perp`는 `dir`에 수직인 수평 벡터이고, `colOffset`은 `±(width/2 - 1)` 안에서 균등 분배한다.
  - 열 수 = `min(DesiredCols, floor((width - 2) / ColSpacing) + 1)`. 도로 폭을 넘는 열은 만들지 않는다.
  - 제안값: `DesiredCols` 3, `ColSpacing` 3m, `RowSpacing` 3m (폭 12m 도로면 열 수 상한 4).
  - 종대가 마지막 선분 길이를 넘으면, 남은 행은 폴리라인을 따라 이전 선분 방향으로 이어 붙인다(도시 방향). radial 도로는 선분이 하나이므로 그대로 도로를 따라 이어진다.
- **스냅**: 각 위치를 `navGrid.snapToWalkable()`로 보정한다. 결과가 도로 폭 밖이면 §2.8의 슬라이드 규칙을 적용한다.
- **팀**: `TargetTeamId.Monster`를 유지한다(faction 반영은 별도 과제).

### 2.5 구조 변경

| 대상 | 변경 |
| --- | --- |
| `cityroadtypes.ts`, `cityroaddefs.ts` (제안, gsdk) | `CityRoadLayoutDef`, preset 목록, `PlanetProfileRoadLayouts`, `resolveCityRoadLayout()`, `computeRoadEntries()`를 정의한다. |
| `StrategicPlanetCityPlacement`, `RivalCityDef` | 선택 필드 `roadLayoutId?: CityRoadLayoutId`를 추가한다. |
| `StrategicPlanetDef` | 선택 필드 `playerCityRoadLayoutId?: CityRoadLayoutId`를 추가한다. |
| `StrategicCityPlacement`, `StrategicPlayerCityPlacement`, `StrategicGalaxyManager` | 런타임 배치에 resolve 결과 `roadLayoutId`를 싣는다. |
| `CityCombatContext` | 선택 필드 `roadLayoutId?: CityRoadLayoutId`를 추가한다. |
| `radialenvironmentpattern.ts` | 도로 판정을 `isInsideRoadLayoutOpening()`으로 일반화한다. `createRadialEnvironmentPattern()`은 개별 도로 옵션 대신 레이아웃을 입력으로 받는다. 기존 판정 함수는 호환 래퍼로 남긴다. |
| `EnvironmentManager.populateGroundWithRadialPaths()` | 개별 도로 옵션 대신 `CityRoadLayoutDef`를 받는다. |
| `SimcityState` | 숲 배치 리터럴을 `resolveCityRoadLayout()` 결과로 교체하고, `enterCityDefense()`에서 `roadLayoutId`를 컨텍스트에 저장한다. |
| `CitySceneService` | `NATURAL_FOREST_ROAD_*`, `NATURAL_FOREST_CLEARING_RADIUS` 상수를 `resolveCityRoadLayout()` 결과로 교체한다. 밀도 관련 상수는 유지한다. |
| `BaseCityCombat` | 스폰 위치 목록을 반환하는 훅 `resolveWaveSpawnPositions(wave, spawnWaveNumber): THREE.Vector3[]` (제안)를 추가한다. 기본 구현은 현재 원형 링 로직이고, `spawnCombatWave()`는 이 훅의 결과를 사용한다. `RivalAssault`의 동작은 바뀌지 않는다. |
| `BaseCityCombat.resolveNavGridArea()` | 현재는 `resolveWaveSpawnParams()` 기반 링만 포함한다. 모드가 제공하는 진입점을 포함하도록 훅 `resolveNavGridExtraPoints()` (제안)를 추가한다. |
| `BaseCityCombat.collectNavGridObstacles()` | structure 외에 숲 셀을 blocked 장애물로 추가한다. `isDepleted`인 나무는 제외한다(§2.7, §2.8). |
| `PlacementSource`, `PlacementManager` | `blockConstruction`이 true인 레이아웃이면 도로 셀을 footprint로 등록한다. 이를 위해 `PlacementSource`에 `'road'` (제안)를 추가한다(§2.8). |
| `PlayerDefenseState` | 레이아웃 조회 → 진입점 계산 → 검증(§2.8) → 종대 배치로 위 훅을 오버라이드한다. `spawnPos`(군기 → CC+오프셋 → 기본값)는 아군 소환에만 사용한다. |

#### 2.5.1 목표 초기화 순서

§1.6.1의 현재 순서와 비교하면, 진입점 좌표 계산이 NavGrid 빌드 앞에 오고 검증은 빌드 뒤에 온다. NavGrid 영역에 진입점이 포함되어야 하고, 진입점 검증에는 NavGrid가 필요하기 때문이다.

1. `resetForInit()`: `resolveWaves()`로 웨이브를 결정한다(변경 없음).
2. `initMode()`:
   1. 스카이박스, 지평선, `refreshBuildingColliders()` (변경 없음)
   2. `spawnPos` 결정 → `startAllies()`: 아군 전용이다.
   3. 방어 핵심 건물 결정.
   4. 레이아웃 조회(`ctx.roadLayoutId`) → `computeRoadEntries()`로 **기하 진입점** 계산(NavGrid 불필요).
   5. `buildCombatNavGrid()`: `resolveNavGridExtraPoints()`로 4의 진입점을 영역에 포함하고, 숲 장애물을 등록한다.
   6. §2.8 검증과 슬라이드 → 유효 도로 목록 확정 → 도로 순서 무작위화.
   7. `spawnCombatWave()` → `resolveWaveSpawnPositions()`로 종대 배치.

### 2.6 폴백

| 상황 | 동작 |
| --- | --- |
| 지면(`CustomGround`)이 없거나 bounds가 비어 있음 | 현재 원형 링 배치를 사용한다. 단, 중심은 군기가 아니라 방어 핵심 건물(CC) 위치로 한다. 방어 핵심 건물이 없으면 `DefaultCityCombatSpawnPosition`을 쓴다. |
| 레이아웃에 도로가 없거나 계산된 진입점이 없음 | 위와 같다. |
| 모든 도로가 §2.8 검증에 실패함 | 위와 같다. |
| `roadLayoutId`가 정의에 없는 값 | 경고 로그를 남기고 resolver 우선순위의 다음 단계로 내려간다. |

### 2.7 고려 사항

- **NavGrid 규모**: 지면 bounds 전체를 덮으면 셀 수가 크게 늘어난다. `planeWidth: 500`, `gridSize` 4m 기준으로 약 125×125 셀이다. 빌드 비용과 A* 탐색 비용을 측정해야 한다.
- **숲 장애물**: 나무는 NavGrid 장애물로 등록되지 않는다. 따라서 A* 경로가 도로를 벗어나 숲을 가로지를 수 있다. 몬스터가 도로를 따라 진군하게 하려면 숲 셀을 blocked로 등록해야 한다. 이때 `isDepleted`(벌목된) 나무는 제외한다(§2.8).
- **진군 시간**: 도로 끝에서 도시까지 150m 이상을 이동한다. 웨이브 간격(`waveDelay`)이나 "이전 웨이브 전멸 후 다음 웨이브" 규칙이 템포에 맞는지 조정이 필요하다. 폴리라인 도로는 경로가 더 길어질 수 있다.
- **진입 예고**: 진입 방향이 매 웨이브 달라지므로 HUD 알림이나 미니맵 표시로 진입 도로를 예고하는 것을 권장한다.
- **preset 검증**: 새 preset을 추가할 때 도로 선분이 서로 겹치거나 빈터 원을 가로지르지 않는지, 진입점이 지면 안에 생기는지를 확인하는 개발용 검사(디버그 시각화 또는 단위 테스트)를 두는 것을 권장한다.

### 2.8 도로 상태 변화와 적응형 진입점

도로 기하는 고정이지만, 도로 상태는 다음 이유로 바뀐다.

- **건물**: `PlacementManager.validatePlacement()`는 footprint 겹침과 build range만 검사한다. 도로는 footprint로 등록되지 않으므로, build range가 넓어지면 도로 위나 도로 끝에도 건물을 지을 수 있다.
- **벌목**: 나무는 `harvest()`로 `isDepleted`가 되면 렌더와 콜라이더에서 빠지고, `regenerationRate`에 따라 턴마다 회복된다. 숲에 일시적인 빈 공간이 생긴다. 나무 footprint는 등록이 유지되므로 벌목지에 건물을 지을 수는 없다.

따라서 진입점은 매 방어전마다 검증한다.

- **계산 시점**: 기하 진입점은 NavGrid 빌드 전에 계산하고, 검증은 NavGrid 빌드 직후에 한다(§2.5.1). 전투 중에는 건물이 추가되지 않으므로 재검증하지 않는다.
- **도로별 검증**:
  1. 진입점 셀이 walkable인지 확인한다.
  2. 도로 선분 위에 structure 장애물이 있으면, 가장 바깥쪽 장애물보다 바깥 구간에서만 진입점과 종대를 유효로 본다. 종대를 세울 여유가 부족하면 그 도로를 제외한다.
  3. `navGrid.findPath({ start: entry, target: 방어 핵심 타겟, attackRange })`로 경로가 있는지 확인한다. 방어 핵심 타겟이 없으면 이 검증은 건너뛴다.
- **슬라이드**: 진입점과 종대의 각 위치에 공통으로 적용한다. 위치가 walkable이 아니거나 스냅 결과가 도로 폭 밖이면, 도로를 따라 도시 방향으로 한 셀씩 옮기며 다시 확인한다. 옆 방향 이동은 도로 폭 안으로 제한해 숲 속 셀로 옮겨지지 않게 한다. 진입점의 슬라이드가 2의 유효 구간을 벗어나면 그 도로를 제외한다.
- **제외**: 검증에 실패한 도로는 이번 전투에서 제외한다. 유효 도로가 0개면 §2.6 폴백을 사용한다.
- **벌목 공간**: 진입점으로 쓰지 않는다(진입점은 preset의 도로만 쓴다). 대신 NavGrid 숲 장애물 등록 시 depleted 나무를 제외해, 벌목으로 뚫린 길이 실제 경로에 반영되게 한다.
- **도로 위 건설 정책**: preset의 `blockConstruction`으로 선택한다.
  - `false`(기본): 도로 위 건설을 허용한다. 도로 봉쇄가 방어 전략이 되고, 진입점은 위 규칙으로 적응한다.
  - `true`: 도로 셀을 `PlacementManager`에 footprint로 등록해 건설을 막는다. 이를 위해 `PlacementSource`에 `'road'` (제안)를 추가한다. 진입점이 항상 고정된다.

### 2.9 관련 문서

- `src/gsdk/docs/strategic/rival-city-defenders-plan.md`
- `src/gsdk/docs/strategic/city-combat-split.md`
- `src/gsdk/docs/ai-movement/yuka-navmesh-integration-design.md`
- `src/gsdk/docs/ai-movement/single-point-spawn-design.md` (미반영. 이 설계의 PlayerDefense 부분(§3.1, 군기 기준 40–50m 밀어내기)은 본 문서 §2로 대체한다. RivalAssault 부분은 유효하다.)
