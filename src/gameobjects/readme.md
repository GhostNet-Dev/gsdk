# Game Objects Design Notes

이 폴더는 게임 전체의 상태 진행을 조율하는 상위 게임 오브젝트를 둔다.
현재 설계의 중심은 턴 진행, 자원 반영, 턴 로그 표시 흐름이며, 장기적으로는 경쟁 도시, 진영, 전략 은하, 함대 전략 같은 은하 전역 시뮬레이션까지 포함한다.

## 목표

- 턴제와 실시간 모드를 함께 지원할 수 있도록 턴 처리를 독립된 흐름으로 둔다.
- 각 기능 모듈은 필요한 경우 턴 참여자로 등록하고, 한 턴에 해야 할 일을 직접 처리한다.
- 자원 증감은 `WalletManager`를 직접 호출하기보다 `ResourceManager`를 거쳐 일관되게 처리한다.
- 턴 중 발생한 일은 `TurnReport`에 모으고, UI는 이 보고서를 구독해서 표시한다.
- 도시, 행성, 진영, 함대처럼 저장 가능한 gameplay 상태는 `gameobjects` 계층에서 소유한다.
- 렌더링, 입력, 선택 UI, 배치 가이드 같은 표현 계층은 gameplay 상태와 분리한다.

## 주요 구성 요소

### GameManager

`GameManager`는 게임 상태 흐름의 조립 지점이다.

- `ResourceManager`를 생성한다.
- `TurnManager`를 생성한다.
- `TurnLogPanel`을 생성한다.
- `BuildingManager` 같은 게임 기능 매니저를 생성한다.
- 경쟁 도시, 진영, 전략 은하 같은 상위 시뮬레이션 매니저를 조립할 수 있다.
- 다음 턴 요청이 들어오면 `EventTypes.TurnNext` 이벤트를 보낸다.

`GameManager`는 가능하면 자원 계산이나 턴 처리의 세부 로직을 직접 들고 있지 않는다.
대신 이벤트를 통해 각 책임자에게 일을 넘긴다.

#### GameManager 초기화 순서

`GameManager.initialize()`는 다음 순서로 매니저를 생성하고 조립한다. 의존 방향이 단방향이 되도록 아래에서 위 방향으로 생성한다.

```txt
1. StrategicGalaxyManager 생성
   - 행성/항로 정의를 로드한다.
   - city placement seed 목록을 준비한다.

2. FactionManager 생성
   - 진영 정의를 로드한다.
   - StrategicGalaxyManager에서 초기 행성 상태를 읽어 faction influence 초기값을 설정한다.

3. RivalCityManager 생성
   - StrategicGalaxyManager에서 city placement seed를 받아 도시 상태를 초기화한다.
   - FactionManager에서 진영 정의를 읽어 도시별 초기 factionId를 설정한다.

4. BuildingManager 생성
   - 플레이어 도시의 건물과 자원 상태를 초기화한다.
   - playerCityPlanetId와 playerCityFactionId를 설정한다.

5. TurnManager에 참여자 등록
   - FactionPreTurnParticipant  (turnOrder: 50)
   - BuildingManager            (turnOrder: 100)
   - RivalCityManager           (turnOrder: 150)
   - StrategicGalaxyManager     (turnOrder: 200)
   - StrategicFleetManager      (turnOrder: 220)
   - FactionPostTurnParticipant (turnOrder: 250)
```

세이브 로드 시에는 각 매니저의 직렬화 상태를 순서대로 복원한 뒤 TurnManager에 재등록한다.

### RivalCity

`rivalcity`는 플레이어 도시와 직접 전투하지 않는 경쟁 도시 경제 시뮬레이션을 담당한다.

- 도시 성향, 시작 자원, 선호 건물, 도시 정책을 데이터로 정의한다.
- 도시별 자원, 건물, 건설 큐, 도시 특수 자원을 저장 가능한 상태로 관리한다.
- `ITurnParticipant`로 등록되어 매 턴 생산, 건설, 정책 선택, 점수 계산을 수행한다.
- `factionId`와 `planetId`를 참조하지만, 진영 정책이나 행성 상태를 직접 소유하지 않는다.
- 자세한 설계는 `rivalcity/readme.md`에 둔다.

### Faction

`faction`은 은하 전역의 진영 정책, 관계, 공동 목표, 집단행동을 담당한다.

- Alliance, Empire, Guild, Neutral 같은 진영 정의를 관리한다.
- 진영별 정책, 지원, 징발, 외교 관계, 공동 목표를 계산한다.
- 여러 도시와 행성, 함대를 묶는 상위 의사결정 단위다.
- 경쟁 도시에는 생산/정책 보정치를 제공하고, 전략 은하에는 행성 장악 목표나 교역로 목표를 제공한다.
- 자세한 설계는 `faction/readme.md`에 둔다.

### StrategicGalaxy

`strategicgalaxy`는 은하 전역의 행성 상태, 항로, 행성 내/행성간 영향력, 교역권, 시장권, 전략 함대 위치를 담당한다.

- 행성별 gameplay 상태와 행성 특수 자원을 관리한다.
- 행성에 배치된 도시 ID, 행성별 진영 영향력, 장악/경합 상태를 계산한다.
- 항로의 교역 가치, 보안도, 봉쇄, 물류 상태를 계산한다.
- 경쟁 도시의 output과 진영 정책을 받아 행성/항로 상태를 갱신한다.
- 자세한 설계는 `strategicgalaxy/readme.md`에 둔다.

### Fleet

`fleet`은 함대와 전투 실행 흐름을 담당한다.

- 전술 전투, 편대, 명령, 함선 상태, 전투 AI를 관리한다.
- 전략 은하 시스템에서는 함대의 현재 행성, 목표 행성, 임무, 전력, 준비도 같은 전략 상태를 참조할 수 있다.
- 실제 전투가 필요할 때 전략 함대 상태를 전술 전투 런타임으로 투영한다.

### TurnManager

`TurnManager`는 턴 진행의 실행자다.

- `RegisterTurnParticipant` 이벤트로 턴 참여자를 등록한다.
- `DeregisterTurnParticipant` 이벤트로 턴 참여자를 해제한다.
- `TurnNext` 이벤트를 받으면 다음 턴을 실행한다.
- 턴마다 `TurnReport`를 새로 만들고, 모든 턴 참여자에게 `TurnContext`를 전달한다.
- 턴 중 발생한 자원 변경 이벤트를 보고서 로그로 변환한다.
- 턴 종료 시 `TurnEnded` 이벤트를 보낸다.

턴 참여자는 `turnOrder`와 `turnId`를 가진다.
`TurnManager`는 `turnOrder` 기준으로 실행 순서를 정하고, 값이 같으면 `turnId`로 정렬한다.

### TurnContext

`TurnContext`는 턴 참여자에게 전달되는 실행 컨텍스트다.

```ts
interface TurnContext {
  turn: number;
  eventCtrl: IEventController;
  report: TurnReport;
  log: TurnLogger;
  shared: TurnSharedModifiers;
}
```

`shared`는 같은 턴 안에서 참여자 간 데이터를 전달하는 슬롯이다. 앞선 참여자가 값을 채우면 뒤에 오는 참여자가 읽는다. 이전 턴의 결과는 각 매니저 내부 상태에서 직접 읽는다.

```ts
interface TurnSharedModifiers {
  // Faction pre-turn(50)이 채운다 → BuildingManager, RivalCityManager가 읽는다
  factionModifiers: Record<FactionId, FactionTurnModifier>;
  // BuildingManager(100), RivalCityManager(150)가 채운다 → StrategicGalaxyManager가 읽는다
  cityOutputs: Record<string, CityTurnOutput>;
  // StrategicGalaxyManager(200)가 채운다 → StrategicFleetManager, Faction post-turn이 읽는다
  planetOutputs: Record<string, PlanetTurnOutput>;
}

interface FactionTurnModifier {
  factionId: FactionId;
  resourceBias: Partial<Record<CurrencyType, number>>;
  cityPolicyBias: Partial<Record<RivalPolicyId, number>>;
  influenceMultiplier: number;
}

// 플레이어 도시와 경쟁 도시가 공통으로 사용하는 출력 타입
interface CityTurnOutput {
  cityId: string;
  planetId: string;
  factionId: FactionId;
  isPlayer: boolean;
  score: CityScore;
  resourceOutput: Partial<Record<CurrencyType, number>>;
  specialResourceOutput: RivalSpecialResourceBag;
  activePolicies: string[];
}

interface PlanetTurnOutput {
  planetId: string;
  factionInfluence: Record<FactionId, number>;
  controllingFactionId?: FactionId;
  contested: boolean;
  resourceBonus: Partial<Record<CurrencyType, number>>;
  marketPressure: Partial<Record<CurrencyType, number>>;
  allocatedSpecialResources: Record<string, StrategicPlanetSpecialResourceBag>;
}
```

턴 참여자는 `ctx.log.add(...)`를 통해 자신이 처리한 일을 보고서에 남길 수 있다.

예:

```ts
ctx.log.add({
  source: "building",
  kind: "construction",
  message: "목재소 건설이 완료되었습니다.",
});
```

### ITurnParticipant

턴이 필요한 모듈은 별도 processor를 두지 않고 이 인터페이스를 구현한다.

```ts
interface ITurnParticipant {
  readonly turnId: string;
  readonly turnOrder: number;
  advanceTurn(ctx: TurnContext): void | Promise<void>;
}
```

예를 들어 `BuildingManager`는 턴제 건설 진행을 위해 `ITurnParticipant`를 구현한다.
경쟁 도시 성장, 진영 정책, 전략 은하 갱신, 함대 전략 처리 같은 모듈도 같은 방식으로 등록할 수 있다.

권장 턴 순서 예:

```txt
50:  Faction pre-turn    // 진영 정책과 지원/징발 계획
100: BuildingManager     // 플레이어 건설과 생산
150: RivalCityManager    // 경쟁 도시 성장
200: StrategicGalaxy     // 행성/항로/시장/영향력 계산
220: StrategicFleet      // 전략 함대 이동과 임무 처리
250: Faction post-turn   // 진영 점수와 공동 목표 갱신
```

### ResourceManager

`ResourceManager`는 게임 자원 변경의 단일 입구다.

- `ResourceChangeRequested` 이벤트를 받는다.
- 기존 wallet key 이벤트도 받아서 호환한다.
- `WalletManager`에 실제 증감을 반영한다.
- 반영 결과를 `ResourceAmountChanged` 이벤트로 다시 알린다.

자원을 얻거나 사용하는 모듈은 직접 `wallet.add(...)`, `wallet.subtract(...)`를 호출하기보다 다음 이벤트를 보내는 것을 권장한다.

```ts
eventCtrl.SendEventMessage(EventTypes.ResourceChangeRequested, {
  type: CurrencyType.Wood,
  amount: 100,
  source: "building",
  reason: "production",
});
```

차감은 `amount`를 음수로 보낸다.

```ts
eventCtrl.SendEventMessage(EventTypes.ResourceChangeRequested, {
  type: CurrencyType.Wood,
  amount: -30,
  source: "building",
  reason: "cost",
});
```

### 플레이어 도시 연동

플레이어 도시는 `BuildingManager`가 관리하는 경제 단위로, 경쟁 도시와 동일한 전략 시스템에 참여한다.

- `BuildingManager`는 플레이어 도시의 `planetId`와 `factionId`를 가진다.
- 턴 100에서 건물 생산/건설을 처리한 뒤 `ctx.shared.cityOutputs`에 플레이어 도시 출력을 기록한다.
- `StrategicGalaxyManager`는 경쟁 도시와 동일한 방식으로 플레이어 도시 출력을 행성 영향력 계산에 반영한다.
- 플레이어가 속한 진영의 `FactionTurnModifier`는 플레이어 도시에도 적용된다.

```ts
// BuildingManager가 turnOrder 100 처리 후 shared에 기록하는 예
ctx.shared.cityOutputs["player"] = {
  cityId: "player",
  planetId: playerCityPlanetId,
  factionId: playerCityFactionId,
  isPlayer: true,
  score: buildingManager.computeScore(),
  resourceOutput: buildingManager.getResourceOutput(),
  specialResourceOutput: {},
  activePolicies: [],
};
```

플레이어 진영 소속은 게임 시작 시 선택하거나 시나리오 고정값으로 결정한다. 진영 미소속일 경우 `factionId: "neutral"`로 취급한다.

### GameSaveState

전체 게임 상태는 단일 직렬화 계약으로 저장하고 복원한다. 각 매니저는 자기 도메인 상태만 직렬화하며, `GameManager`가 이를 조립한다.

```ts
export type GameSaveState = {
  version: number;
  turn: number;
  seed: number;
  difficulty: "easy" | "normal" | "hard";
  playerCityPlanetId: string;
  playerCityFactionId: FactionId;
  factions: FactionState[];
  rivalCities: RivalCityState[];
  planets: StrategicPlanetState[];
  routes: StrategicRouteState[];
  strategicFleets: StrategicFleetState[];
  playerCity: PlayerCityState;
};
```

`version` 필드로 저장 포맷 변경 시 마이그레이션을 관리한다.

### TurnReport

`TurnReport`는 한 턴 동안 발생한 일을 모은 결과물이다.

```ts
interface TurnReport {
  turn: number;
  entries: TurnLogEntry[];
  totals: {
    resources: Partial<Record<CurrencyType, number>>;
  };
}
```

현재는 로그 목록과 자원 증감 합계를 가진다.
이후에는 유닛 생산, 경쟁 도시 성장, 진영 정책, 행성 영향력, 연구 완료 같은 요약도 `totals` 또는 별도 필드로 확장할 수 있다.

### TurnLogPanel

`TurnLogPanel`은 턴 진행 중 메시지 창을 띄우는 UI다.

- `TurnReportUpdated` 이벤트를 받으면 패널을 열고 로그를 갱신한다.
- `TurnEnded` 이벤트를 받으면 완료 상태로 전환한다.
- 턴이 끝나기 전에는 닫기 버튼을 비활성화한다.

UI는 자원 변경이나 건물 처리 로직을 직접 알 필요가 없다.
오직 `TurnReport`만 표시한다.

## 이벤트 흐름

### 다음 턴 실행

1. UI 또는 게임 로직이 `GameManager.nextTurn()`을 호출한다.
2. `GameManager`가 `EventTypes.TurnNext` 이벤트를 보낸다.
3. `TurnManager`가 새 턴 번호를 만들고 `TurnReport`를 초기화한다.
4. `TurnManager`가 `TurnReportUpdated` 이벤트를 보내 메시지 창을 연다.
5. 등록된 `ITurnParticipant`들이 순서대로 `advanceTurn(ctx)`를 실행한다.
6. 각 참여자는 필요한 일을 처리하고 `ctx.log.add(...)`로 로그를 남긴다.
7. 모든 참여자가 끝나면 `TurnManager`가 `TurnEnded` 이벤트를 보낸다.
8. `TurnLogPanel`은 완료 상태로 바뀌고 사용자가 닫을 수 있다.

### 전략 시뮬레이션 실행

전략 시뮬레이션은 여러 턴 참여자가 같은 턴 안에서 순서대로 협력하는 방식으로 처리한다.

1. `Faction` pre-turn 단계가 이번 턴 진영 정책, 지원, 징발, 공동 목표를 결정한다.
2. `BuildingManager`가 플레이어 도시의 건설과 생산을 처리한다.
3. `RivalCityManager`가 경쟁 도시별 생산, 건설, 도시 정책, 도시 점수를 처리한다.
4. `StrategicGalaxyManager`가 도시 output과 진영 정책을 모아 행성 영향력, 항로, 시장권을 갱신한다.
5. 전략 함대 처리자가 함대 이동, 주둔, 봉쇄, 호위 같은 임무를 처리한다.
6. `Faction` post-turn 단계가 진영 점수, 목표 달성, 관계 변화를 갱신한다.
7. 각 단계는 필요한 경우 `TurnReport`에 로그를 남긴다.

### 자원 획득 또는 사용

1. 생산, 보상, 비용 처리 모듈이 `ResourceChangeRequested` 이벤트를 보낸다.
2. `ResourceManager`가 요청을 검증한다.
3. `ResourceManager`가 `WalletManager`에 실제 자원 증감을 반영한다.
4. 성공하면 `ResourceAmountChanged` 이벤트를 보낸다.
5. 턴 진행 중이면 `TurnManager`가 이 이벤트를 받아 `TurnReport`에 자원 로그를 추가한다.
6. `TurnManager`가 `TurnReportUpdated` 이벤트를 보낸다.
7. `TurnLogPanel`이 갱신된 로그를 표시한다.

## 현재 BuildingManager 흐름

`BuildingManager`는 현재 턴 참여자로 등록된다.

- `BuildingMode.Turn`일 때만 `advanceTurn(ctx)`에서 건설 턴을 진행한다.
- 건설 중인 작업의 `remainingTurns`를 줄인다.
- 남은 턴이 있으면 건설 진행 로그를 남긴다.
- 완료되면 `finishBuild(...)`를 실행하고 건설 완료 로그를 남긴다.
- 건물이 시민 수를 제공하면 기존 `EventTypes.People` 이벤트를 보낸다.
- `ResourceManager`가 해당 이벤트를 받아 wallet 반영과 자원 변경 이벤트 발행을 처리한다.

## 이벤트 타입

현재 턴과 자원 흐름에 사용하는 주요 이벤트는 다음과 같다.

- `TurnNext`: 다음 턴 실행 요청
- `TurnEnded`: 턴 실행 완료 알림
- `TurnReportUpdated`: 턴 보고서 갱신 알림
- `RegisterTurnParticipant`: 턴 참여자 등록
- `DeregisterTurnParticipant`: 턴 참여자 해제
- `ResourceChangeRequested`: 자원 변경 요청
- `ResourceAmountChanged`: 자원 변경 완료 알림

전략 시뮬레이션이 구현되면 다음 계열의 이벤트를 추가할 수 있다.

- `FactionStateChanged`: 진영 정책, 관계, 목표 상태 갱신
- `RivalCityStateChanged`: 경쟁 도시 상태 갱신
- `StrategicGalaxyUpdated`: 행성/항로/시장권 상태 갱신
- `StrategicFleetStateChanged`: 전략 함대 상태 갱신

## 설계 원칙

- 턴 참여자는 자기 도메인의 처리만 담당한다.
- `TurnManager`는 실행 순서와 보고서 생성을 담당한다.
- `ResourceManager`는 자원 변경의 단일 입구 역할을 한다.
- `WalletManager`는 실제 보유량 저장소로 남긴다.
- `RivalCityManager`는 도시 경제 상태만 소유하고, 진영 정책이나 행성 상태는 참조만 한다.
- `FactionManager`는 여러 도시, 행성, 함대를 묶는 집단 의사결정을 담당한다.
- `StrategicGalaxyManager`는 행성, 항로, 시장권, 영향력 같은 은하 전략 상태를 담당한다.
- `fleet` 계층은 함대 전투와 전술 실행을 담당하고, 전략 상태와 런타임 전투는 분리한다.
- 저장 가능한 gameplay 상태에는 렌더링 객체, UI 상태, 입력 상태를 넣지 않는다.
- UI는 도메인 로직을 직접 호출하지 않고 보고서 이벤트만 구독한다.
- 로그 생성은 실제 처리와 분리한다. 실제 변경은 먼저 수행하고, 성공한 결과만 로그로 남긴다.

## 앞으로 정리할 부분

- 업그레이드 비용 차감도 `ResourceChangeRequested`를 통해 처리하도록 통일한다.
- 생산 건물, 병사 생성, 시민 성장, 경쟁 도시, 진영, 전략 은하 모듈을 각각 `ITurnParticipant`로 등록한다.
- 턴 로그의 `kind`별 아이콘이나 색상을 UI에 추가한다.
- `TurnReport.totals`에 자원 외 요약 정보를 추가한다.
- 턴 실행 중 오류가 발생했을 때 계속 진행할지 중단할지 정책을 정한다.
- `FactionState`, `RivalCityState`, `StrategicPlanetState`, `StrategicFleetState`의 세이브/로드 계약을 정리한다.
