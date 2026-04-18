# Faction Design Notes

이 폴더는 은하 전역의 진영 정책, 관계, 공동 목표, 집단행동을 담당합니다.

진영은 개별 도시의 경제 성향이나 행성의 환경 조건이 아니라, 여러 도시와 행성, 함대를 묶어 움직이게 하는 의사결정 단위입니다. 예를 들어 Alliance는 뒤처진 도시를 지원하고, Empire는 산업 징발과 전략 거점 장악을 밀어붙이며, Guild는 교역망과 시장 영향력을 우선합니다.

## 배치 기준

진영 정책은 `rivalcity` 아래에 두지 않고 `gameobjects/faction`에 분리합니다.

- 진영은 경쟁 도시뿐 아니라 행성 영향력, 교역권, 함대 운용, 외교 관계에 모두 영향을 줄 수 있습니다.
- `world/galaxy`는 시각화 모듈이므로 진영 정책의 원천이 되지 않습니다.
- `rivalcity`는 도시 경제 단위이고, 진영은 여러 도시의 집단행동을 결정하는 상위 단위입니다.
- 기존 `fleet` 시스템은 함대 전투와 전술 실행을 담당하므로, 진영은 전략 레벨의 함대 임무와 배치 의사결정만 가집니다.

권장 분리:

```txt
gameobjects/faction/
  factiontypes.ts           // 진영 상태, 정책, 관계, 목표 타입
  factiondefs.ts            // 진영별 성향, 정책 가중치, 색상/표시명 정의
  factionmanager.ts         // 턴 참가자, 진영 정책과 집단행동 처리
  factionpolicyplanner.ts   // 현재 상황에 맞는 진영 정책 선택
  factionrelations.ts       // 진영 관계, 동맹, 경쟁, 전쟁 상태 계산
  factiongoals.ts           // 공동 목표, 행성 장악, 교역권, 군사 목표

gameobjects/rivalcity/
  // 도시는 factionId를 참조하지만 진영 정책을 소유하지 않습니다.

gameobjects/strategicgalaxy/
  // 행성, 항로, 영향력, 시장권 상태를 소유합니다.

gameobjects/fleet/
  // 실제 함대와 전투 실행을 담당합니다.
```

## 핵심 방향

진영 시스템은 턴마다 두 단계로 동작하는 것이 좋습니다.

```txt
pre-turn
- 이번 턴 진영 정책을 선택한다.
- 도시 지원, 징발, 교역, 함대 임무 같은 계획을 만든다.
- `RivalCityManager`, `StrategicGalaxyManager`, `StrategicFleetManager`가 사용할 보정치를 제공한다.
- 정책 선택의 근거 데이터는 이전 턴에 StrategicGalaxyManager가 기록한 행성 상태와 진영 영향력이다.
  같은 턴의 Galaxy 갱신 결과는 post-turn(250)에서 반영된다.

post-turn
- 도시와 행성, 함대의 결과를 모아 진영 점수를 갱신한다.
- 공동 목표 달성 여부를 판단한다.
- 진영 관계와 다음 턴 압박을 갱신한다.
```

`TurnManager`가 단일 순서 실행만 제공하므로, 구현은 두 가지 중 하나를 선택합니다.

```txt
선택 1: pre/post 참가자 분리
- FactionPreTurnParticipant: turnOrder 50
- FactionPostTurnParticipant: turnOrder 250

선택 2: 다른 매니저가 결과 이벤트를 보내고 FactionManager가 다음 턴에 반영
- 구현은 단순하지만 즉시성은 낮습니다.
```

추천 턴 순서:

```txt
50  Faction pre-turn
100 BuildingManager
150 RivalCityManager
200 StrategicGalaxyManager
220 StrategicFleetManager
250 Faction post-turn
```

## 진영 정의

진영 정의는 정책 성향과 집단행동 원칙을 담습니다.

```ts
export type FactionId = "alliance" | "empire" | "guild" | "neutral" | string;

export type FactionGovernance =
  | "federation"
  | "empire"
  | "guild"
  | "neutralBloc"
  | "corporate";

export type FactionRelation =
  | "ally"
  | "friendly"
  | "neutral"
  | "rival"
  | "hostile"
  | "war";

export type FactionDef = {
  id: FactionId;
  name: string;
  desc: string;
  governance: FactionGovernance;
  doctrine: FactionDoctrineId;
  resourceBias: Partial<Record<CurrencyType, number>>;
  policyBias: Partial<Record<FactionPolicyId, number>>;
  cityPolicyBias: Partial<Record<RivalPolicyId, number>>;
  scoreBias: Partial<FactionScoreWeights>;
  sharedResourcePolicy: "none" | "aidWeakCities" | "centralPool" | "tribute";
  expansionPolicy: "balanced" | "wide" | "tall" | "strategicHub";
  cooperationLevel: number;
  defaultRelations: Partial<Record<FactionId, FactionRelation>>;
};
```

예:

```ts
export const factionDefs: Record<string, FactionDef> = {
  alliance: {
    id: "alliance",
    name: "Alliance",
    desc: "균형 성장과 상호 지원을 중시하는 연합입니다.",
    governance: "federation",
    doctrine: "stabilityAndRecovery",
    resourceBias: {
      [CurrencyType.Food]: 1.1,
      [CurrencyType.Water]: 1.1,
    },
    policyBias: {
      reconstruction: 1.3,
      mutualAid: 1.25,
    },
    cityPolicyBias: {
      housingBoom: 1.15,
      researchInvestment: 1.05,
    },
    scoreBias: {
      population: 1.15,
      research: 1.05,
    },
    sharedResourcePolicy: "aidWeakCities",
    expansionPolicy: "balanced",
    cooperationLevel: 0.8,
    defaultRelations: {
      empire: "rival",
      guild: "friendly",
      neutral: "neutral",
    },
  },

  empire: {
    id: "empire",
    name: "Empire",
    desc: "산업 집중과 거점 장악을 중시하는 제국입니다.",
    governance: "empire",
    doctrine: "industrialCommand",
    resourceBias: {
      [CurrencyType.Materials]: 1.2,
      [CurrencyType.Gems]: 1.1,
    },
    policyBias: {
      imperialMandate: 1.35,
      strategicFortification: 1.2,
    },
    cityPolicyBias: {
      industrialFocus: 1.3,
      landmarkRace: 1.1,
    },
    scoreBias: {
      production: 1.2,
      prestige: 1.15,
    },
    sharedResourcePolicy: "tribute",
    expansionPolicy: "strategicHub",
    cooperationLevel: 0.55,
    defaultRelations: {
      alliance: "rival",
      guild: "neutral",
      neutral: "rival",
    },
  },
};
```

## 진영 상태

진영 상태는 저장 가능한 순수 데이터로 유지합니다.

```ts
export type FactionState = {
  id: FactionId;
  treasury: FactionResourceBag;
  activePolicies: ActiveFactionPolicy[];
  goals: FactionGoalState[];
  relations: Partial<Record<FactionId, FactionRelation>>;
  controlledPlanetIds: string[];
  contestedPlanetIds: string[];
  memberCityIds: string[];
  fleetIds: string[];
  score: FactionScore;
  lastProcessedTurn: number;
  playerReputation: number;
};

export type FactionScore = {
  total: number;
  economy: number;
  industry: number;
  research: number;
  diplomacy: number;
  military: number;
  influence: number;
};
```

### playerReputation

`playerReputation`은 플레이어가 해당 진영에 얼마나 기여했는지를 나타내는 수치다.

획득 조건:

```txt
- 플레이어 도시가 해당 진영의 행성에서 localInfluence 1위를 달성하면 +보너스
- 플레이어 도시가 진영 정책 방향(resourceBias, policyBias)에 맞는 분야 점수를 키우면 턴마다 소량 증가
- 진영이 설정한 공동 목표 달성에 플레이어가 기여하면 +보너스
- 플레이어 도시가 파산하거나 다른 진영의 영향력을 높이면 감소
```

임계값과 효과:

```txt
0  ~ 20  중립 (진영 정책 보정 없음)
21 ~ 50  우호 (FactionTurnModifier influenceMultiplier +5%)
51 ~ 80  협력 (influenceMultiplier +12%, 진영 공동 목표 알림 해금)
81 ~ 100 핵심 (influenceMultiplier +20%, 진영 특수 정책 선택지 해금)
```

`playerReputation`은 `FactionRelation`과 별개로 관리한다. `FactionRelation`은 진영 간 외교 상태이고, `playerReputation`은 플레이어 개인의 기여 지수다.

저장할 대상:

- 진영 금고와 공유 자원
- 활성 진영 정책
- 공동 목표
- 진영 관계
- 소속 도시와 함대 ID
- 장악/경합 행성 ID
- 진영 점수와 마지막 처리 턴

저장하지 않을 대상:

- UI 배지, 색상 캐시
- `THREE.Object3D`
- 턴 로그
- 임시 평가 점수

## 집단행동

진영은 도시 하나의 생산 공식을 직접 대체하지 않고, 여러 도시의 결정을 보정하는 상위 정책으로 동작합니다.

예시 정책:

```txt
Alliance Reconstruction
- 같은 진영 도시 중 가장 뒤처진 도시의 건설 비용 감소
- population, defense, food 계열 점수 보정

Empire Industrial Mandate
- 모든 Empire 도시의 Materials 생산 증가
- Food 소비 증가
- 영향력 높은 도시가 행성 특수 자원 일부를 징발

Guild Trade Compact
- 연결된 Guild 도시마다 Gold 생산 보너스
- tradeInfluence와 gateInfluence 생산 증가
- marketDominance 정책 가중치 증가

Neutral Mediation Pact
- 주변 진영 경쟁 압박 감소
- 연구와 시장에 작은 보너스
- 위기 이벤트 저항 증가
```

공동 목표 예:

```txt
Control Central Hub
- Atlas 같은 관문 행성에서 localInfluence 1위를 달성한다.

Secure Industrial Chain
- Hephaestus, Ares, Hades 중 두 곳 이상에서 산업 점수 우위를 가진다.

Dominate Trade Route
- 연결된 세 행성의 marketInfluence 합계가 일정 수치를 넘는다.

Mobilize Border Fleet
- 경합 행성에 일정 전력 이상의 함대를 주둔시킨다.
```

## Rival City 연동

`RivalCityState`는 `factionId`를 참조합니다.

```ts
export type RivalCityState = {
  id: string;
  cityDefId: string;
  planetId: string;
  factionId: FactionId;
  // ...
};
```

진영은 도시의 타입을 복제하지 않습니다. 같은 도시 성향도 소속 진영에 따라 다르게 행동해야 합니다.

```txt
Harbor League + Atlas + Guild
- 시장 장악과 교역 영향력 집중

Harbor League + Hades + Empire
- 물류 통제와 산업 징발에 더 많이 기여

Harbor League + Eden + Alliance
- 식량/인구 안정화와 상호 지원에 기여
```

`RivalCityManager`는 다음 데이터를 진영 시스템에서 읽습니다.

```txt
- 현재 진영 정책
- 도시별 지원/징발 계획
- faction resource/policy bias
- 같은 진영 도시 협력 보너스
- 경쟁 진영 압박 보정치
```

## Strategic Galaxy 연동

`StrategicGalaxyManager`는 행성 상태와 항로, 영향력 계산의 소유자입니다. 진영 시스템은 행성 데이터를 직접 소유하지 않고, 행성별 영향력과 경합 상태를 입력으로 받아 정책과 목표를 고릅니다.

진영이 사용하는 전략 은하 정보:

```txt
- 진영별 planetInfluence
- controlledPlanetIds
- contestedPlanetIds
- routeControl
- marketRegionScore
- planet special resource output
- 인접 진영 압박
```

진영이 전략 은하에 제공하는 정보:

```txt
- 이번 턴 진영 정책
- 행성 장악 목표
- 교역로 강화 목표
- 경합 행성 압박 수치
- 함대 임무 요청
```

## Fleet 연동

기존 `gameobjects/fleet`는 실제 함대와 전투 실행을 담당합니다. 진영 시스템은 `FleetWorld`를 직접 만지지 않고 전략 임무를 생성합니다.

권장 흐름:

```txt
FactionManager
- 어떤 행성에 함대를 보내야 하는지 결정한다.

StrategicFleetManager 또는 Fleet strategic state
- 함대의 현재 행성, 목표 행성, 임무, 전력, 준비도를 갱신한다.

FleetWorld
- 실제 전투가 발생했을 때 전략 함대 상태를 전술 전투로 투영한다.
```

전략 함대 상태 타입은 `gameobjects/strategicgalaxy/strategicfleetstate.ts`에서 정의한다. `FactionManager`는 이 타입을 import해서 사용한다. 타입 정의와 필드 목록은 `strategicgalaxy/readme.md`를 참고한다.

## World/Galaxy와의 경계

`world/galaxy`는 visual 계층입니다.

해야 하는 일:

- 행성 네트워크 렌더링
- 진영 색상과 배지 표시
- 항로, 경합, 영향력 상태 표시
- 선택 UI와 상세 패널 표시
- `gameobjects`가 만든 view model을 그리기

하지 않아야 하는 일:

- 진영 정책 결정
- 행성 영향력 계산
- 교역/시장/함대 전략 처리
- 실제 저장 상태 소유

의존 방향:

```txt
gameobjects/faction
gameobjects/strategicgalaxy
gameobjects/rivalcity
gameobjects/fleet
        |
        v
world/galaxy
```

## 1차 구현 목표

```txt
1. `factiontypes.ts`와 `factiondefs.ts`를 만든다.
2. Alliance, Empire, Guild, Neutral 정의를 추가한다.
3. `FactionState` export/import 계약을 만든다.
4. `RivalCityState`와 행성 상태에서 factionId를 읽어 진영 멤버십을 구성한다.
5. pre-turn 정책 선택과 post-turn 점수 갱신을 최소 구현한다.
6. 도시 생산 보정과 행성 영향력 보정만 먼저 연결한다.
7. Fleet 연동은 전략 임무 타입만 정의하고 실제 전투 연결은 후속 단계로 둔다.
```
