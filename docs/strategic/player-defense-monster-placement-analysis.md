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
| 패배 판정 대상 | id가 `_cc`로 끝나거나 `:cc`를 포함하는 구조물, 없으면 첫 번째 플레이어 structure | CC가 없으면 임의 건물 하나가 파괴되어도 패배한다. targetRegistry가 없거나 구조물이 없으면 패배 조건이 사라진다. | 해결(§2.1, §2.4.2: CC 파괴만 패배, CC가 없으면 초기화 중단) |
| 타겟 탐지 거리 | `MonCtrl.aggroRange = 80`. 범위 안에 적이 없으면 `NearestHostilePolicy`가 `fallbackTargetId`(`TargetTeamId.Player`)를 반환하지만, `isValidTarget()`이 80m 초과로 다시 탈락시킨다. | 스폰 지점에서 80m 안에 아군·건물이 없으면 몬스터가 제자리에 머문다. 링 중심이 군기이므로 다른 건물까지는 80m를 넘을 수 있다. | 해결(§2.4.2: 진군 목표) |

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
- **도로 끝 진입점**: 진입점은 preset 도로 레이아웃(§2.3)에서 각 도로의 바깥쪽 끝, 즉 맵 가장자리 지점이다.
- **진군 목표와 패배 조건**: 몬스터의 최종 공성 목표는 플레이어 도시의 **CC(Command Center) 파괴**이며, CC가 파괴되면 플레이어가 패배한다. CC 외의 모든 건물도 공격·파괴할 수 있으므로, 도로를 건물로 막으면 몬스터는 그 건물을 부수고 CC를 향한 진군을 재개한다. 건물 배치는 진입 도로를 바꾸지 않는다.
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

- **중심점만 판정**: `isInsideRadialPathOpening()`은 나무 footprint가 아니라 배치 **중심점**만 검사한다. 중심이 도로 경계(6m) 바로 바깥인 나무는 footprint(`pine_tree` 1×1셀 = 4m)와 콜라이더가 도로 안으로 들어온다. 시각적으로는 문제없지만, 나무를 NavGrid 장애물로 등록하면 도로가 좁아지거나 끊긴다(§2.7).

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

// 좌표 규약(기존 isInsideRadialPathOpening과 동일): 방향 = (cos θ, 0, sin θ).
// 0° = +X, 90° = +Z, -90° = -Z. 위(+Y)에서 내려다보면 각도가 커질수록 시계 방향으로 돈다.
export type CityRoadPoint = { x: number; z: number }; // 도시 중심 기준 로컬 좌표(m)

export type CityRoadDef =
  | {
      kind: "radial";
      angleDeg: number;          // 도로 방향
      width: number;
      startRadius?: number;      // 기본 = layout.clearingRadius. clearingRadius 이하여야 함(빈터와 도로 사이 틈 금지)
    }                            // startRadius → 지면 끝까지 직선
  | {
      kind: "polyline";
      points: CityRoadPoint[];   // 첫 점: 중심에서 clearingRadius 이하(빈터 안), 마지막 점: 바깥쪽 끝
      width: number;
      extendToEdge?: boolean;    // 기본 true. false면 마지막 점이 지면 가장자리 허용 오차 안에 있어야 함
    };

export interface CityRoadLayoutDef {
  id: CityRoadLayoutId;
  clearingRadius: number;
  roads: CityRoadDef[];
  rotationDeg?: number;          // 레이아웃 전체 회전
  entryEdgeMargin?: number;      // 진입점을 지면 끝에서 안쪽으로 당기는 거리, 기본 16m
  entryZoneLength?: number;      // 진입점에서 도시 방향으로 항상 건설 금지인 구간 길이, 기본 30m (§2.8)
  blockConstruction?: boolean;   // 진입 구간 외 도로 위 건설 금지 여부, 기본 false (§2.8)
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
  - `PlayerDefenseState`는 반드시 `SimcityState`와 같은 방식, 즉 `CustomGround.obj`의 `Box3.setFromObject()` 중심과 범위를 사용한다. 다른 기준(CC 위치, `TOWN_CENTER` 등)을 쓰면 진입점이 실제 숲의 도로와 어긋난다.
- **숲 재생성 조건**: 숲은 `envManager`가 없을 때 한 번만 생성된다(§2.2). 같은 런타임에서 새 게임이나 로드로 플레이어 도시의 행성이 바뀌어 resolve 결과 `roadLayoutId`가 달라지면, 기존 숲은 이전 레이아웃의 도로를 유지한다. `SimcityState`는 숲 생성 시 사용한 `roadLayoutId`를 기억하고, 값이 바뀌면 기존 `envManager.dispose()` (제안)를 호출한 뒤 새 숲을 생성한다. `dispose()`는 해당 매니저가 등록한 렌더 오브젝트, 물리 콜라이더, 루프, `PlacementManager`의 environment footprint와 내부 인덱스를 모두 정리해야 한다. 단순히 참조만 버리거나 `detachFromScene()`만 호출하면 보이지 않는 이전 footprint가 남으므로 허용하지 않는다.

#### 2.3.3 도로 판정 일반화

숲 배치의 도로 판정을 레이아웃 기반으로 바꾼다.

- `isInsideRoadLayoutOpening(pos, layout, center, bounds, clearanceRadius = 0)` (제안): 다음 중 하나면 true를 반환한다. `clearanceRadius`는 나무처럼 footprint/콜라이더가 있는 오브젝트를 배치할 때 중심점뿐 아니라 실제 점유 영역이 도로에 침범하는지 보수적으로 판정하는 여유 반경이다.
  - 중심까지의 거리가 `clearingRadius + clearanceRadius` 이하다. 빈터 경계 밖 나무의 콜라이더가 빈터 안으로 들어오면 NavGrid mask(§2.7)가 walkable로 둔 셀이 물리적으로 막히기 때문이다.
  - 어떤 도로 선분까지의 수평 거리가 `width / 2 + clearanceRadius` 이하다.
- 선분 변환 규칙:
  - radial: `center + dir * startRadius` → 지면 bounds 경계까지의 한 선분.
  - polyline: 인접한 점 쌍마다 선분 하나. `extendToEdge`면 마지막 선분을 지면 경계까지 연장한다.
  - 바깥 끝 처리: radial과 `extendToEdge` polyline의 마지막 선분은 지면 경계에서 끝나는 선분이 아니라 **반직선(ray)**으로 판정한다. 선분 거리로 판정하면 끝점이 둥근 캡이 되어, 사선 도로가 경계와 만나는 곳에 작은 삼각형 틈이 생기고 도로 입구에 나무가 남을 수 있다. 현재 `isInsideRadialPathOpening()`의 `forward >= clearingRadius` 반무한 띠와 같은 결과를 내기 위해서도 필요하다. 시작 쪽 캡은 빈터 원 안에 있으므로 영향이 없다.
  - `rotationDeg`는 변환 전에 모든 방향과 점에 적용한다.
- 선분 목록은 레이아웃마다 한 번만 계산해 캐시한다. 숲 판정은 셀마다 호출되기 때문이다.
- 기존 `isInsideRadialPathOpening()`과 `RadialPathOpeningOptions`는 `radial5`, `clearanceRadius = 0`과 같은 결과를 내는 호환 래퍼로 남기고, 호출부 이전 후 제거한다.
- **clearanceRadius 정의**: 나무 콜라이더는 `getEnvironmentCollisionSize()` 기준으로 `size × gridSize × footprintScale × instanceScale` 크기의 박스이고, `instanceScale`은 `randomScaleRange` 안에서 무작위로 정해진다. 반면 `PlacementManager` footprint는 스케일을 반영하지 않은 4m다. 따라서 `clearanceRadius = (√(w² + d²) × gridSize / 2) × footprintScale × max(randomScaleRange[1], 1) × scale`로 정의한다. `pine_tree`(1×1, 최대 1.2배)는 약 3.4m다. 이 계산은 gsdk의 `resolveEnvironmentClearanceRadius(prop)` (제안) 한 곳에 두고, `EnvironmentManager`(플레이어 도시)와 `CitySceneService.placeNaturalRadialForest()`(NPC/라이벌 도시 뷰)가 같은 함수를 쓴다. 호출부마다 값이 다르면 같은 레이아웃에서도 화면마다 도로 폭이 달라진다.
- **시각 변화**: `clearanceRadius > 0`을 적용하면 나무 중심이 도로 중심선에서 `width / 2 + clearanceRadius`(radial5 기준 약 9.4m) 밖으로 밀려, 보이는 도로 폭이 12m에서 약 19m로 넓어진다. 나무 상태는 세이브되지 않고 매번 다시 생성되므로 세이브 호환 문제는 없다. 기존 시각 폭을 유지하려면 preset `width`를 줄이되, 그 경우 §2.4.1의 `usableHalfWidth`가 양수인지 다시 확인한다.
- `createRadialEnvironmentPattern()`과 `EnvironmentManager.populateGroundWithRadialPaths()`는 개별 옵션(`roadCount`, `roadWidth`, `roadAngleOffset`, `clearingRadius`) 대신 `CityRoadLayoutDef`를 받도록 바꾼다. 숲 생성 호출부는 환경 오브젝트의 실제 충돌 footprint를 감싸는 수평 반경을 `clearanceRadius`로 넘겨 나무 콜라이더가 도로 안으로 들어오지 않게 한다.

#### 2.3.4 진입점 계산

도로마다 진입점 `entry`와 진입 방향 `dir`(도시에서 바깥쪽 방향)을 계산한다.

| 도로 종류 | `entry` | `dir` |
| --- | --- | --- |
| radial | 도로 방향으로 지면 bounds 경계까지 간 지점에서 `entryEdgeMargin`만큼 안쪽 | 도로 방향 |
| polyline + `extendToEdge` | 마지막 선분을 지면 경계까지 연장한 지점에서 `entryEdgeMargin`만큼 안쪽 | 마지막 선분 방향 |
| polyline (`extendToEdge: false`) | 마지막 점. 지면 bounds 밖이면 bounds 안으로 클램프한 뒤 `entryEdgeMargin`을 적용한다. 가장자리 허용 오차 밖(맵 내부)에서 끝나면 제외한다. | 마지막 선분 방향 |

사각형 bounds에서 경계까지의 거리는 다음과 같이 구한다.

```typescript
const tX = Math.abs(dir.x) > 1e-6 ? (dir.x > 0 ? maxX - p.x : p.x - minX) / Math.abs(dir.x) : Infinity;
const tZ = Math.abs(dir.z) > 1e-6 ? (dir.z > 0 ? maxZ - p.z : p.z - minZ) / Math.abs(dir.z) : Infinity;
const edgeDist = Math.min(tX, tZ);           // p: 연장을 시작하는 점
const entry = p.clone().addScaledVector(dir, edgeDist - margin);
```

- 최종 진입점이 빈터 원 안에 들어오면(지면이 너무 작거나 클램프로 끌려 들어온 경우) 그 도로는 진입점으로 쓰지 않는다.
- `polyline.extendToEdge`의 기본값은 `true`다. 명시적으로 `false`인 경우 마지막 점이 지면 가장자리에서 `entryEdgeMargin` 이내인지 검증하고, 맵 내부에서 끝나는 polyline은 preset 오류로 제외한다. 따라서 모든 유효 진입점은 맵 가장자리 도로 끝이라는 요구사항을 만족한다.
- 이 계산은 `EnvironmentManager` 인스턴스와 NavGrid에 의존하지 않는 순수 함수 `computeRoadEntries(layout, center, bounds)` (제안)로 둔다. NavGrid 빌드 전에 호출할 수 있어야 한다(§2.5.1 초기화 순서).

### 2.4 웨이브 배치

#### 2.4.1 스폰 배치

- **도로 선택**: 전투 세션 시작(`initMode`) 시 유효한 진입 도로(§2.8 검증 통과)의 순서를 무작위로 정한다. 각 웨이브는 그 순서에 따라 도로 하나를 사용한다(웨이브마다 다른 방향에서 진입). 웨이브 수가 유효 도로 수보다 많으면 `roads[waveIndex % roads.length]`로 순환한다. 한 바퀴를 돌 때 다시 섞지 않는다. 한 웨이브를 여러 도로로 나누는 방식은 이후 확장 옵션으로 둔다.
- **대형**: 원형 링 대신 진입 도로를 따른 종대로 배치한다.
  - 위치 = `entry - dir * (row * RowSpacing) + perp * colOffset`
  - `perp`는 `dir`에 수직인 수평 벡터다. `usableHalfWidth = width / 2 - maxMonsterRadius - SpawnSideMargin`으로 실제 사용 가능한 반폭을 계산하고, `colOffset`은 `±usableHalfWidth` 안에서 균등 분배한다. `maxMonsterRadius`는 해당 웨이브의 `MonsterProperty.navigationRadius` (제안) 중 최댓값이며, 제안 `SpawnSideMargin`은 0.5m다. 모델을 생성해야만 알 수 있는 동적 bounds에 초기 검증을 의존하지 않는다.
  - `usableWidth = max(0, usableHalfWidth * 2)`로 두고, 열 수는 `min(DesiredCols, floor(usableWidth / ColSpacing) + 1)`로 계산한다. 도로의 실제 충돌 안전 폭을 넘는 열은 만들지 않는다.
  - 제안값: `DesiredCols` 3, `ColSpacing` 3m, `RowSpacing` 3m. 폭 12m 도로의 기하상 열 수가 더 크더라도 `DesiredCols`에 의해 최종 3열로 제한된다.
  - `usableHalfWidth <= 0`이면 해당 도로에는 그 웨이브를 배치할 수 없다. 열 수 계산에도 실제 충돌 반경을 반영하고, 한 열도 안전하게 만들 수 없으면 §2.6 폴백을 사용한다.
  - 종대가 마지막 선분 길이를 넘으면, 남은 행은 폴리라인을 따라 이전 선분 방향으로 이어 붙인다(도시 방향). radial 도로는 선분이 하나이므로 그대로 도로를 따라 이어진다.
- **스냅**: 각 위치를 `navGrid.snapToWalkable()`로 보정한다. 결과가 도로 폭 밖이면 §2.8의 슬라이드 규칙을 적용한다.
  - 스냅 결과는 셀 중심(4m 간격)으로 정렬되므로, 3m 간격 종대에서는 두 몬스터가 같은 셀에 스냅될 수 있다. 이미 사용한 셀에 스냅되면 도로를 따라 도시 반대 방향(`+dir`)으로 한 셀 밀어 다시 스냅한다. 그 셀이 도로 폭이나 지면 범위를 벗어나면 같은 셀 겹침을 허용한다.
- **팀**: `TargetTeamId.Monster`를 유지한다(faction 반영은 별도 과제).
- **진입 예고**: 웨이브를 스폰한 직후 진입 도로 방향을 알린다(예: `EventTypes.AlarmNormal`로 "북동쪽 도로에서 적 접근"). 몬스터는 도시까지 100m 이상을 이동하므로 플레이어가 방향을 알아야 대응할 수 있다. 미니맵 표시는 이후 확장으로 둔다.

#### 2.4.2 진군 목표

현재 몬스터는 `aggroRange`(80m) 안에서만 타겟을 잡는다(§1.7). 진입점은 지면 중심에서 최소 약 234m(`250 - 16`, 축 정렬 도로 기준. 사선 도로는 더 멀다), 빈터 경계에서도 130m 이상 떨어져 있다. 따라서 진입점에서 생성된 몬스터는 별도 목표가 없으면 움직이지 않는다. 몬스터에 진군 목표를 부여해 이를 해결한다.

- **목표**: 플레이어 도시의 CC를 파괴하는 것이다(§2.1). `resolvePlayerDefenseCoreTargetId()`는 target id의 `_cc`/`:cc` 문자열 규약 대신 `BuildingManager`에서 `building.property.id === buildingDefs.CommandCenter.id`인 건물을 찾아 그 건물의 target id를 반환한다. CC를 찾지 못했을 때 임의의 첫 번째 structure로 폴백하지 않는다.
- **진군 단계(도로 이동)**: 웨이브 스폰 시 각 몬스터에 해당 도로의 waypoint 목록(진입점 → 도로 중심선의 꺾임점들 → 빈터 경계 지점)을 부여한다(`MarchOrder` (제안)). 몬스터는 `aggroRange` 안에 적이 없는 동안 waypoint를 차례로 따라간다. 이 구간은 A* 대신 도로 기하를 그대로 쓰므로 숲 장애물이나 NavGrid 커버 범위와 무관하게 도로를 따른다.
- **공성 접근 단계(빈터 도달 후)**: 마지막 waypoint에 도달한 뒤에도 탐지 범위 안에 적이 없으면 CC를 전략 이동 목표로 삼아 NavGrid 경로로 접근한다. CC가 `aggroRange` 밖에 있어도 이동해야 하지만, 이를 일반 전투 타겟으로 등록하지 않는다. 일반 전투 타겟은 기존 `aggroRange` 규칙을 유지하고, CC 접근은 별도의 이동 목표로 처리한다.
- **전투 전환**: 진군 중 `aggroRange` 안에 적(아군 유닛, 건물)이 들어오면 일반 타겟팅으로 전환한다. 그 타겟을 잃으면 진군을 이어간다. 진군 단계에서 멈춘 waypoint부터 재개한다.
- **도로 위 건물**: 도로를 막은 건물은 진군 경로상 `aggroRange` 안에 들어오므로 일반 타겟팅으로 공격된다. 파괴되면 진군을 재개한다. 건물 때문에 진입 도로를 바꾸거나 제외하지 않는다(§2.8).
- **CC 파괴**: CC가 파괴되면 `PlayerDefenseState`가 즉시 패배를 확정한다. CC 외의 건물이 파괴되면 해당 전투 타겟만 해제하고 `MarchOrder`를 재개한다.
- **구현 위치와 상태 계약**: 진군 목표는 `ActorCombatController.update()`의 "일반 전투 타겟 없음" 분기에서 별도의 이동 목표로 실행한다. 현재처럼 즉시 `moveDirection`을 0으로 만드는 대신 `MarchOrder`가 있으면 아래 우선순위를 적용한다. 범위 밖 타겟 탐지 자체(`aggroRange` 확대)는 맵 전체 탐지가 되므로 사용하지 않는다. `MarchOrder`가 없는 몬스터(다른 모드, 일반 필드 몬스터)의 동작은 바뀌지 않아야 한다.
  1. 유효한 일반 전투 타겟이 있으면 `MonsterAdvancePhase.Combat`으로 전투한다.
  2. 일반 타겟이 없고 남은 도로 waypoint가 있으면 `MonsterAdvancePhase.RoadMarch`로 이동한다.
  3. 도로 waypoint를 모두 통과했으면 `MonsterAdvancePhase.SiegeApproach`로 CC에 접근한다.
  4. 전투 타겟을 잃으면 중단했던 도로 waypoint 또는 CC 접근 단계로 복귀한다.

```typescript
// (제안)
export enum MonsterAdvancePhase {
  RoadMarch = "road-march",
  SiegeApproach = "siege-approach",
  Combat = "combat",
}

export interface MarchOrder {
  waypoints: readonly THREE.Vector3[];
  siegeTargetId: string; // PlayerDefense의 CC target id
}

export interface CityCombatMonsterSpawnPlan {
  position: THREE.Vector3;
  marchOrder?: MarchOrder;
}
```

`MarchOrder`는 일반 타겟과 구분되는 전략 이동 명령이다. `siegeTargetId`가 `aggroRange` 밖에 있다는 이유로 `isValidTarget()`에서 폐기되어서는 안 되며, 공격 가능한 거리 안에 들어왔을 때만 일반 전투 타겟으로 승격한다.

- `resolveWaveSpawnPlans()`는 웨이브 원소와 같은 순서·길이의 plan을 반환한다.
- `BaseCityCombat.spawnCombatWave()`는 `CreateMonster(monsterId, { ..., marchOrder }, position)` 형태로 명령을 전달하고, `MonsterSpawnOptions`와 `IMonsterCtrl`이 이를 명시적으로 지원한다.
- 재사용 또는 respawn되는 몬스터에 이전 전투의 명령이 남지 않도록 `resetForSpawn()`에서 기존 `MarchOrder`, waypoint index, `MonsterAdvancePhase`를 먼저 초기화한 뒤 새 명령을 설정한다. 전달된 waypoint는 몬스터별로 복제해 공유 배열의 변경을 막는다.

### 2.5 구조 변경

| 대상 | 변경 |
| --- | --- |
| `cityroadtypes.ts`, `cityroaddefs.ts` (제안, gsdk) | `CityRoadLayoutDef`, preset 목록, `PlanetProfileRoadLayouts`, `resolveCityRoadLayout()`, `computeRoadEntries()`를 정의한다. |
| `StrategicPlanetCityPlacement`, `RivalCityDef` | 선택 필드 `roadLayoutId?: CityRoadLayoutId`를 추가한다. |
| `StrategicPlanetDef` | 선택 필드 `playerCityRoadLayoutId?: CityRoadLayoutId`를 추가한다. |
| `StrategicCityPlacement`, `StrategicPlayerCityPlacement`, `StrategicGalaxyManager` | 런타임 배치에 resolve 결과 `roadLayoutId`를 싣는다. |
| `CityCombatContext` | 선택 필드 `roadLayoutId?: CityRoadLayoutId`를 추가한다. |
| `radialenvironmentpattern.ts` | 도로 판정을 `isInsideRoadLayoutOpening()`으로 일반화한다. `createRadialEnvironmentPattern()`은 개별 도로 옵션 대신 레이아웃과 환경 오브젝트의 `clearanceRadius`를 입력으로 받는다. 기존 판정 함수는 호환 래퍼로 남긴다. |
| `EnvironmentManager` | `populateGroundWithRadialPaths()`가 개별 도로 옵션 대신 `CityRoadLayoutDef`를 받고 실제 충돌 footprint 기반 `clearanceRadius`를 적용한다. 살아 있고 고갈되지 않은 환경 장애물만 반환하는 `getActiveObstacleFootprints()`와, 자신이 등록한 렌더·콜라이더·루프·placement footprint를 모두 정리하는 `dispose()`를 추가한다. |
| `SimcityState` | 숲 배치 리터럴을 `resolveCityRoadLayout()` 결과로 교체하고, `enterCityDefense()`에서 `roadLayoutId`를 컨텍스트에 저장한다. |
| `CitySceneService` | `NATURAL_FOREST_ROAD_*`, `NATURAL_FOREST_CLEARING_RADIUS` 상수를 `resolveCityRoadLayout()` 결과로 교체한다. 밀도 관련 상수는 유지한다. |
| `BaseCityCombat` | 위치와 선택적 진군 명령을 함께 반환하는 훅 `resolveWaveSpawnPlans(wave, spawnWaveNumber): CityCombatMonsterSpawnPlan[]` (제안)를 추가한다. 기본 구현은 현재 원형 링 위치와 `marchOrder: undefined`를 반환한다. `spawnCombatWave()`는 plan별로 몬스터를 생성하고 진군 명령을 전달한다. `RivalAssault`의 동작은 바뀌지 않는다. |
| `BaseCityCombat.resolveNavGridArea()` | 현재는 `resolveWaveSpawnParams()` 기반 링만 포함한다. 모드가 제공하는 진입점을 포함하도록 훅 `resolveNavGridExtraPoints()` (제안)를 추가한다. PlayerDefense에서는 이 링도 군기(`spawnPos`)가 아니라 CC 기준이어야 한다(아래 `PlayerDefenseState` 행). |
| `BaseCityCombat.collectNavGridObstacles()` | 모드별 추가 장애물 훅 `resolveNavGridExtraObstacles()` (제안)를 호출한다. 숲 데이터 출처가 모드마다 다르므로 base에서 숲을 직접 읽지 않는다. PlayerDefense는 `EnvironmentManager.getActiveObstacleFootprints()`, RivalAssault는 `NpcEnvironmentRenderer`/`snapshot.environment`가 출처다. RivalAssault는 이 설계 범위에서 훅을 구현하지 않는다. |
| `navtypes.ts`, `navgridservice.ts` | `NavObstacleSource.EnvironmentTree` (제안), 장애물별 `inflateWorld`, source별 `NavGridObstacleCellMask` (제안)를 지원한다. 도로·빈터 mask는 environment source에만 적용하며 structure 셀을 walkable로 되돌리지 않는다(§2.7). |
| `PlayerDefenseState.resolveNavGridExtraObstacles()` (제안) | 고갈되지 않은 숲 footprint를 `NavObstacleSource.EnvironmentTree`, `inflateWorld: 0` 장애물로 반환하고 도로·빈터 셀 mask를 제공한다. |
| `MonsterProperty` 및 몬스터 정의 | 스폰·도로 검증 전에 사용할 양수 `navigationRadius` (제안)를 정의한다. 실제 `MonsterCtrl` 충돌체의 수평 반경 이상이어야 하며, 개발 검증에서 누락·과소값을 검사한다. |
| `MonsterSpawnOptions`, `IMonsterCtrl`, `ActorCombatController`, `MonsterCtrl` | `MarchOrder` 전달·설정 계약과 `MonsterAdvancePhase`를 추가한다. 일반 전투 타겟이 없을 때 도로 waypoint → CC 접근 순으로 이동하고, 일반 전투 후 중단 지점에서 재개한다(§2.4.2). |
| `PlacementSource`, `PlacementManager` | 진입 구간(`entryZoneLength`) 셀은 항상, 나머지 도로 셀은 `blockConstruction`이 true일 때 footprint로 등록한다. 이를 위해 `PlacementSource`에 `'road'` (제안)를 추가한다(§2.8). `validatePlacement()`/`isFootprintOccupied()`는 source 필터 없이 검사하므로 등록만으로 건설이 막힌다. |
| `CustomGround` | `updateEnvironmentOccupancyOverlay()`는 현재 `'environment'` footprint만 표시한다. `'road'` footprint도 다른 색으로 표시해, 진입 구간이나 `blockConstruction` 도로에서 건설이 막힌 이유를 플레이어가 볼 수 있게 한다. |
| `PlayerDefenseState` | `BuildingManager`의 Command Center 정의로 CC target을 식별하고, CC만 방어 핵심으로 인정해 파괴 시 패배시킨다. 레이아웃 조회 → 진입점 계산 → 검증(§2.8) → 종대 배치로 위 훅을 오버라이드한다. `resolveWaveSpawnParams()`도 오버라이드해 center를 CC 위치로, 반지름을 `clearingRadius + RingFallbackMargin` (제안) 이상으로 바꾼다. 이 값은 NavGrid 영역 계산(`resolveNavGridArea()`)과 §2.6 링 폴백에 공통으로 쓰인다. `spawnPos`(군기 → CC+오프셋 → 기본값)는 아군 소환에만 사용하며, 몬스터 위치·NavGrid 영역 계산 경로에서는 참조하지 않는다. |

#### 2.5.1 목표 초기화 순서

§1.6.1의 현재 순서와 비교하면, 진입점 좌표 계산이 NavGrid 빌드 앞에 오고 검증은 빌드 뒤에 온다. NavGrid 영역에 진입점이 포함되어야 하고, 진입점 검증에는 NavGrid가 필요하기 때문이다.

1. `resetForInit()`: `resolveWaves()`로 웨이브를 결정한다(변경 없음).
2. `initMode()`:
   1. 스카이박스, 지평선, `refreshBuildingColliders()` (변경 없음)
   2. CC target을 방어 핵심으로 결정한다. CC를 찾지 못하면 경고와 사용자 알림을 남기고 초기화를 중단한 뒤 `returnModeId`로 돌아간다. 임의의 첫 번째 structure로 폴백하지 않는다.
   3. `spawnPos` 결정 → `startAllies()`: 군기 우선이며, 이 값은 아군 소환에만 사용한다.
   4. 레이아웃 조회(`ctx.roadLayoutId`) → `CustomGround.obj`의 bounds 중심과 범위(§2.3.2)로 `computeRoadEntries()`를 호출해 **기하 진입점**과 도로 waypoint를 계산한다(NavGrid 불필요).
   5. `buildCombatNavGrid()`: `resolveNavGridExtraPoints()`로 4의 진입점을 영역에 포함하고, environment 전용 도로 mask와 `resolveNavGridExtraObstacles()`로 숲 장애물을 등록한다.
   6. 가장 큰 웨이브의 종대 길이와 몬스터 충돌 반경을 기준으로 §2.8 검증과 슬라이드를 수행한다 → 모든 웨이브에 안전한 유효 도로 목록 확정 → 도로 순서 무작위화.
   7. `spawnCombatWave()` → `resolveWaveSpawnPlans()`로 종대 위치와 `MarchOrder`를 함께 결정 → 각 몬스터 생성 시 명령 전달(§2.4.2) → 진입 예고.

### 2.6 폴백

| 상황 | 동작 |
| --- | --- |
| CC가 없거나 살아 있는 target으로 등록되지 않음 | 방어전 초기화를 중단하고 경고 및 사용자 알림을 남긴 뒤 `returnModeId`로 돌아간다. 임의 건물이나 `DefaultCityCombatSpawnPosition`으로 전투를 계속하지 않는다. |
| 지면(`CustomGround`)이 없거나 bounds가 비어 있음 | 원형 링 배치를 사용한다. 단, 중심은 군기가 아니라 방어 핵심 건물(CC) 위치로 하고, 반지름은 `clearingRadius`보다 크게 잡아 빈터 안쪽(건물 사이)에서 스폰되지 않게 한다(`PlayerDefenseState.resolveWaveSpawnParams()` 오버라이드, §2.5). 경고 로그를 남긴다. |
| 레이아웃에 도로가 없거나 계산된 진입점이 없음 | 위와 같다. |
| 모든 도로가 §2.8 검증에 실패함 | 위와 같다. 진입 구간은 건설 금지이므로(§2.8) 건물 배치로는 도로가 검증에 실패하지 않는다. 이 경우는 지형이나 preset 데이터 문제다. |
| NavGrid가 없거나 준비되지 않음 | 기하 진입점을 그대로 사용하고(검증과 슬라이드 생략), 진군은 waypoint만 따른다. 공성 접근 단계에서는 CC까지 직선 이동으로 대체한다. 경고 로그를 남긴다. |
| `roadLayoutId`가 정의에 없는 값 | 경고 로그를 남기고 resolver 우선순위의 다음 단계로 내려간다. |

### 2.7 고려 사항

- **NavGrid 규모**: 지면 bounds 전체를 덮으면 셀 수가 크게 늘어난다. `planeWidth: 500`, `gridSize` 4m 기준으로 약 125×125 셀이다. 빌드 비용(blocked 셀 집합 구성)과 A* 탐색 비용을 측정해야 한다. 도로 구간은 waypoint 진군(§2.4.2)으로 이동하므로 A*는 주로 빈터 안 CC 접근 단계와 진입점 검증에만 쓰인다.
- **숲 장애물(마스크 규칙)**: 현재 나무는 NavGrid 장애물로 등록되지 않으므로 A* 경로가 숲을 가로지를 수 있다. 그러나 나무 footprint를 그대로 장애물로 등록하면 도로가 끊길 수 있다.
  - 현재 숲 판정은 나무 중심만 보므로 footprint가 도로 안으로 들어온다(§2.2). 목표 구현에서는 §2.3.3의 `clearanceRadius`로 물리 침범을 먼저 방지한다.
  - NavGrid는 장애물 bounds를 `inflateWorld`(기본 1.2m)만큼 부풀리고(`NavGridService.getObstacleCells()`), 대각 이동 시 모서리 통과를 막는다(`getNeighbors()`).
  - 그 결과 12m 도로(3셀)의 실효 폭이 1셀 이하로 줄고, 축과 나란하지 않은 도로(-18°, 54° 등)는 계단형 셀 사이에서 연결이 끊길 수 있다.
  - 따라서 다음 마스크 규칙을 쓴다. `NavObstacleSource.EnvironmentTree` 장애물은 `inflateWorld: 0`으로 래스터화한다. 셀 중심이 `isInsideRoadLayoutOpening()`을 만족하는 도로·빈터 셀은 environment source에 대해서만 제외하고, 그 밖의 셀은 고갈되지 않은 나무 footprint가 덮을 때 blocked로 둔다.
  - structure obstacle은 기존 inflate를 유지한다. `NavGridObstacleCellMask`는 적용할 `source`를 필수로 가지며, environment mask가 같은 셀의 structure block을 해제해서는 안 된다. NavGrid는 source별 obstacle 셀을 먼저 만든 뒤 마지막에 합집합한다.
  - `EnvironmentManager.getActiveObstacleFootprints()`는 `isDepleted`인 나무를 제외한 복사본을 반환한다. `PlayerDefenseState`가 `EnvironmentManager`의 private 상태나 `PlacementManager` footprint만으로 고갈 여부를 추측하지 않는다.

```typescript
// (제안)
export interface NavGridObstacle {
  // 기존 필드 생략
  source: NavObstacleSource;
  inflateWorld?: number; // 미지정 시 build 기본값, EnvironmentTree는 0
}

export interface NavGridObstacleCellMask {
  source: NavObstacleSource;
  walkableCells: readonly NavGridCell[];
}

export interface NavGridBuildOptions {
  // 기존 필드 생략
  obstacleCellMasks?: readonly NavGridObstacleCellMask[];
}
```

mask는 obstacle을 셀로 변환하는 단계에서 같은 `source`에만 적용한다. 모든 source를 합친 뒤 셀을 강제로 walkable로 바꾸는 후처리 방식은 structure 장애물까지 지울 수 있으므로 사용하지 않는다.

- **물리 콜라이더와 실효 도로 폭**: 방어전에서는 숲이 씬에 남아 있으므로(§2.2) 나무 콜라이더도 유효하다. NavGrid mask만으로 물리 충돌을 무시할 수 없으므로 다음 두 조건을 모두 보장한다.
  - 숲 생성 시 §2.3.3의 `clearanceRadius`를 적용해 나무의 실제 충돌 footprint가 도로 경계를 침범하지 않게 한다.
  - 종대 생성 시 §2.4.1의 `usableHalfWidth`를 사용해 몬스터 충돌 반경이 도로 경계를 넘지 않게 한다. 이 두 조건을 만족하지 못하는 도로는 유효 진입 도로로 사용하지 않는다.
- **진군 시간**: 도로 끝에서 도시까지 130m 이상을 이동한다. 웨이브 간격(`waveDelay`)이나 "이전 웨이브 전멸 후 다음 웨이브" 규칙이 템포에 맞는지 조정이 필요하다. 폴리라인 도로는 경로가 더 길어질 수 있다.
- **CC와 빈터 중심의 관계**: 빈터와 도로의 중심은 지면 bounds 중심이고, 플레이어 건물 위치와는 무관하다. 건물이 빈터 중심에서 한쪽으로 치우치면 도로마다 도시까지의 진군 거리가 크게 달라진다. build range가 빈터 안으로 제한되는지 확인하고, 아니라면 도로별 진군 거리를 측정 항목에 넣는다.
- **preset 검증**: 새 preset을 추가할 때 다음을 확인하는 개발용 검사(디버그 시각화 또는 단위 테스트)를 두는 것을 권장한다.
  - 도로 선분이 서로 겹치거나 빈터 원을 가로지르지 않는다.
  - radial `startRadius`와 polyline 첫 점이 `clearingRadius` 이하다. 빈터 밖에서 시작하면 그 사이에 숲이 생성되어 도로가 빈터와 끊기고, 도로 waypoint 진군이 나무 콜라이더에 막힌다.
  - radial 도로와 `extendToEdge` polyline의 진입점이 지면 안에 생기며, `extendToEdge: false` polyline의 마지막 점은 지면 가장자리 허용 오차 안에 있다.
  - 각 `MonsterProperty.navigationRadius`가 실제 몬스터 충돌체의 수평 반경 이상인 양수다.
  - 가장 큰 몬스터의 충돌 반경을 적용한 `usableHalfWidth`가 양수다.
  - 최대 웨이브의 종대 깊이가 `entryZoneLength` 이하다.
  - 위 마스크 규칙으로 만든 NavGrid에서 각 진입점부터 빈터 경계까지 경로가 존재한다(사선 도로의 셀 연결 확인).

### 2.8 도로 상태 변화와 적응형 진입점

도로 기하는 고정이지만, 도로 상태는 다음 이유로 바뀐다.

- **건물**: `PlacementManager.validatePlacement()`는 footprint 겹침과 build range만 검사한다. 도로는 footprint로 등록되지 않으므로, build range가 넓어지면 도로 위나 도로 끝에도 건물을 지을 수 있다.
- **벌목**: 나무는 `harvest()`로 `currentAmount`가 0이 되면 `isDepleted`가 되어 렌더와 콜라이더에서 빠진다. `regenerationRate`에 따른 턴당 회복은 고갈 전 나무에만 적용된다(`Tree.advanceTurn()`은 `isDepleted`면 바로 반환한다). 따라서 고갈된 나무는 되살아나지 않고, 벌목지는 **영구적인** 숲 통로가 된다. 나무 footprint는 등록이 유지되므로 벌목지에 건물을 지을 수는 없다.

모든 건물은 파괴 가능하고 몬스터는 도로를 막은 건물을 부수며 진군한다(§2.1, §2.4.2). 따라서 건물은 진입 도로의 유효성에 영향을 주지 않는다. 검증은 건물이 진입점 자체나 종대 위치를 차지한 경우의 **스폰 위치 보정**만 다룬다.

- **계산 시점**: 기하 진입점은 NavGrid 빌드 전에 계산하고, 검증은 NavGrid 빌드 직후에 한다(§2.5.1). 전투 중에는 건물이 추가되지 않으므로 재검증하지 않는다. 검증은 한 번만 수행하는 대신 현재 `currentWaves` 전체에서 필요한 최대 몬스터 충돌 반경과 도로별 최대 종대 깊이를 사용한다. 따라서 뒤의 큰 웨이브도 처음 검증된 도로에 안전하게 배치할 수 있다.
- **도로별 검증**:
  1. 진입점 셀이 walkable인지 확인한다. 아니면 아래 슬라이드를 적용한다.
  2. 각 도로의 폭으로 만들 수 있는 안전 열 수를 먼저 계산한다. `currentWaves`의 각 웨이브에 필요한 행 수를 계산하고 그중 가장 긴 종대 깊이와 여유를 검증 범위로 사용한다.
  3. 진입 구간(진입점부터 도시 방향으로 `entryZoneLength`까지의 도로 구간)은 `blockConstruction`과 무관하게 항상 건설 금지다(아래 '진입 구간 건설 금지'). 따라서 이 구간에는 structure 장애물이 없어야 한다. 그래도 발견되면(이전 세이브 등) 경고 로그를 남기고 진입점과 종대를 그 장애물보다 **바깥쪽**(지면 경계 방향)에 둔다. 바깥쪽에 종대를 세울 여유가 없으면 건물 셀과의 겹침을 허용하고 스폰한다. 건물 때문에 도로를 제외하지 않는다.
  4. 경로 검증은 건물을 무시한 지형 연결성만 본다. 진입점에서 빈터 경계까지 waypoint 구간의 셀이 숲 마스크(§2.7) 기준으로 이어져 있는지 확인한다. structure 장애물은 진군 중 파괴될 대상이므로 이 검사에서 통과 가능으로 취급한다. 이 검사는 preset 데이터 오류(사선 도로 끊김 등)를 잡기 위한 것이다.
- **슬라이드**: 진입점과 종대의 각 위치에 공통으로 적용한다. 위치가 walkable이 아니거나 스냅 결과가 도로 폭 밖이면, 도로를 따라 한 셀씩 옮기며 다시 확인한다. 기본 방향은 도시 방향이지만, 3에 따라 건물 바깥쪽으로 밀어야 하는 경우에는 지면 경계 방향으로 옮긴다. 옆 방향 이동은 `usableHalfWidth` 안으로 제한해 숲 속 셀로 옮겨지지 않게 한다. 도로 방향 이동은 최대 `MaxEntrySlide` (제안, 최대 종대 깊이 + 2셀)까지만 허용하고, 이를 넘어야 하면 그 도로를 제외한다. 진입점이 빈터 쪽으로 끌려들어 가장자리 진입이 깨지는 것을 막기 위해서다.
- **제외**: 검증에 실패한 도로는 이번 전투에서 제외한다. 유효 도로가 0개면 §2.6 폴백을 사용한다.
- **벌목 공간**: 진입점으로 쓰지 않는다(진입점은 preset의 도로만 쓴다). 몬스터는 진군 단계에서 도로 waypoint를 따르므로 벌목 통로로 우회하지 않는다. CC 접근 단계(빈터 도달 후)의 A* 경로에는 NavGrid 숲 장애물에서 depleted 나무를 제외해 벌목지를 반영한다.
- **진입 구간 건설 금지**: 진입 구간(3에서 정의)은 레이아웃 적용 시점에 항상 `PlacementManager`에 `'road'` footprint로 등록한다. 건설은 방어전 밖(`SimcityState`)에서 일어나므로 구간 길이는 웨이브가 아니라 preset의 `entryZoneLength`로 고정한다. 검증 시 최대 종대 깊이가 `entryZoneLength`를 넘으면 경고 로그를 남긴다(preset 검증 항목, §2.7).
- **road footprint 셀 규칙**: 진입 구간과 `blockConstruction` 도로 모두 지면 그리드와 같은 4m 격자를 쓰고, 셀 중심이 `isInsideRoadLayoutOpening(clearanceRadius = 0)`의 도로 조건(빈터 제외)을 만족하는 셀마다 1×1 footprint를 등록한다. 나무는 `createAlignedPatternPosition()`으로 같은 격자의 셀 중심에 놓이고 clearance로 도로에서 떨어져 있으므로, 이 규칙이면 나무 footprint와 셀이 겹치지 않는다.
- **도로 위 건설 정책**: 진입 구간을 제외한 나머지 도로 구간은 preset의 `blockConstruction`으로 선택한다.
  - `false`(기본): 도로 위 건설을 허용한다. 도로를 막은 건물(벽, 포탑 등)은 몬스터가 부숴야 지나갈 수 있으므로 진군을 지연시키는 방어 수단이 된다. 진입 도로는 바뀌지 않는다.
  - `true`: 도로 셀을 `PlacementManager`에 footprint로 등록해 건설을 막는다. 이를 위해 `PlacementSource`에 `'road'` (제안)를 추가한다. footprint id에는 `roadLayoutId`와 셀 좌표를 포함하고, 레이아웃 교체나 새 게임/로드 시 이전 layout의 `'road'` footprint를 먼저 모두 해제한다.

### 2.9 관련 문서

- `src/gsdk/docs/strategic/rival-city-defenders-plan.md`
- `src/gsdk/docs/strategic/city-combat-split.md`
- `src/gsdk/docs/ai-movement/yuka-navmesh-integration-design.md`
- `src/gsdk/docs/ai-movement/single-point-spawn-design.md` (미반영. 이 설계의 PlayerDefense 부분(§3.1, 군기 기준 40–50m 밀어내기)은 본 문서 §2로 대체한다. RivalAssault 부분은 유효하다.)
