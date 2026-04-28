# 라이벌 도시 공방 양방향 전투 설계

## 1. 개요

라이벌 도시의 군사력은 `RivalCityDef.armyDeck`으로 정의한다. 같은 덱을 두 전투 모드에서 재사용하되, 전투에서의 역할만 달라진다.

| 시나리오 | 모드 | `armyDeck` 역할 |
| --- | --- | --- |
| 플레이어가 라이벌 도시 공격 | `CityCombatMode.RivalAssault` | 라이벌 도시 core 주변을 지키는 방어군 |
| 라이벌 도시가 플레이어 도시 공격 | `CityCombatMode.PlayerDefense` | 플레이어 도시를 침공하는 공격군 |

`defenderDeck`이라는 이름은 PlayerDefense에서 공격군으로도 쓰일 때 의미가 어긋나므로 사용하지 않는다.

## 2. 설계 목표

- 도시 아키타입에 맞는 병력 구성으로 라이벌 도시의 개성을 전투에 반영한다.
- 기존 `MonsterId`, `Monsters`, `TargetRegistrySystem`, 웨이브 루프를 최대한 재사용한다.
- `RivalAssault`에서 방어군이 자기 도시 건물을 공격하지 않도록 팀 id를 라이벌 도시 faction으로 등록한다.
- `PlayerDefense`는 공격자 도시를 명시적으로 추적해, 어떤 라이벌이 침공했는지 전투 데이터에 반영한다.

## 3. 데이터 구조

### `RivalCityDef.armyDeck`

```typescript
export interface RivalCityDef {
  id: RivalCityDefId;
  name: string;
  desc: string;
  archetype: RivalArchetypeId;
  // ...
  armyDeck?: readonly (readonly MonsterId[])[];
}
```

`armyDeck`은 `CityCombatState.currentWaves`와 같은 웨이브 배열 형태다. 별도 변환 없이 전투 상태에 전달할 수 있다.

### 도시별 기본 `armyDeck`

| 도시 | 컨셉 | 웨이브 |
| --- | --- | --- |
| Forest Guild | 숲/자연 수호자 | `Snake`, `Bilby`, `Crab` -> `Birdmon`, `Snake`, `Bilby` |
| Mountain Syndicate | 산악 중장병 | `Viking`, `Golem`, `Viking` -> `Golem`, `Viking`, `Minotaur` |
| Harbor League | 항구 기동대 | `DashZombie`, `Crab`, `DashZombie` -> `Crab`, `DashZombie`, `Zombie` |
| Scholar Enclave | 마법/소환/자동화 | `ToadMage`, `Skeleton`, `ToadMage` -> `Skeleton`, `ToadMage`, `Builder` |
| Frontier Commune | 혼성 민병대 | `Zombie`, `Viking`, `Skeleton` -> `Viking`, `Zombie`, `DashZombie` |
| Native Enclave | 야생 전사 | `Bilby`, `WereWolf`, `Snake` -> `WereWolf`, `Bilby`, `Minotaur` |

## 4. 전투 흐름

### RivalAssault

1. `RivalCityViewState`가 `CityCombatContextStore.set({ mode: RivalAssault, selection })`으로 전투에 진입한다.
2. `CityCombatState.resolveWaves()`가 `selection.cityId`의 `RivalCityManager.getArmyDeck(cityId)`를 우선 사용한다.
3. 라이벌 도시 snapshot을 렌더링하고, 플레이어와 아군을 도시 외곽 진입 지점에 배치한다.
4. `monsters.Enable = true` 후 1웨이브를 즉시 core 주변 반경 12에 소환한다.
5. 방어군이 전멸하면 3초 후 다음 웨이브를 core 주변 반경 16, 20...에 소환한다.
6. 승리 조건은 core 파괴뿐이다. 방어군 전멸은 승리 조건이 아니다.

방어군 소환 옵션은 다음 규칙을 따른다.

```typescript
this.monsters.CreateMonster(monsterId, {
  respawn: false,
  teamId: snapshot.summary.factionId,
}, pos);
```

이 팀 설정이 핵심이다. 기본 `TargetTeamId.Monster`로 두면 타깃 시스템이 라이벌 도시 구조물을 적으로 판단할 수 있다. 라이벌 faction 팀으로 등록하면 플레이어와 플레이어 아군만 적이 되고, 라이벌 도시 건물은 아군으로 남는다.

### PlayerDefense

1. `SimcityState.enterCityDefense()`가 플레이어 도시 placement를 읽는다.
2. 같은 행성의 active 라이벌 도시 중 `score.total`이 가장 높은 도시를 `RivalCityManager.getMostThreateningCity()`로 선택한다.
3. `CityCombatContextStore`에 `attackerCityId`를 저장한다.
4. `CityCombatState.resolveWaves()`는 `attackerCityId`의 `armyDeck`을 우선 사용한다.
5. 공격 도시가 없거나 덱이 비어 있으면 행성 `combatWaves`, 마지막으로 `FallbackWaves`를 사용한다.
6. 모든 웨이브를 처치하면 승리, 플레이어 사망 또는 플레이어 core 파괴 시 패배다.

침공군은 기존처럼 기본 `TargetTeamId.Monster`로 등록한다.

## 5. 구현 변경점

| 파일 | 변경 |
| --- | --- |
| `rivalcitytypes.ts` | `RivalCityDef.armyDeck` 추가 |
| `rivalcitydefs.ts` | 6개 도시별 `armyDeck` 추가 |
| `rivalcitymanager.ts` | `getArmyDeck()`, `getMostThreateningCity()` 추가 |
| `citycombatcontextstore.ts` | `attackerCityId?: string` 추가 |
| `citycombatstate.ts` | 모드별 웨이브 선택, RivalAssault 방어 웨이브, 팀 기반 몬스터 소환 |
| `simcitystate.ts` | PlayerDefense 진입 시 공격자 도시 결정 |
| `monsters.ts` | `CreateMonster` 옵션에 `teamId` 추가 |

## 6. 예외 처리

- `RivalAssault`에서 selection 또는 snapshot 생성이 실패하면 기존처럼 Galaxy로 fallback한다.
- `PlayerDefense`에서 플레이어 도시 placement가 없으면 `attackerCityId` 없이 전투에 들어가며, fallback 웨이브를 사용한다.
- 한 웨이브에서 몬스터 생성이 실패하거나 활성 타깃이 0개면 전투가 멈추지 않도록 해당 웨이브는 처치 완료로 간주한다.
- 전투 결과에 따른 라이벌 도시 점령, 동화, 플레이어 건물 영구 파괴는 이번 범위에 포함하지 않는다.

## 7. 검증

- 코드 수정 후 `npm run build`를 실행한다.
- 수동 확인 항목:
  - Rival city 공격 시 방어군이 core 주변에 소환된다.
  - RivalAssault 방어군이 자기 도시 core나 건물을 공격하지 않는다.
  - 방어군 전멸 후 다음 웨이브가 나오지만, 방어군 전멸만으로 승리하지 않는다.
  - PlayerDefense에서 가장 높은 점수의 같은 행성 라이벌 도시 덱이 침공군으로 사용된다.
  - 공격 도시가 없을 때 행성 `combatWaves` 또는 `FallbackWaves`가 사용된다.
