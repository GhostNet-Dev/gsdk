# Rival City Design Notes

이 폴더는 플레이어 도시와 직접 전투하지 않는 경쟁 도시 시뮬레이션을 담당합니다.

경쟁 도시는 유닛을 보내 공격하는 적이 아니라, 플레이어와 같은 세계 안에서 건물을 짓고 자원을 수확하며 성장하는 경제 경쟁자입니다. 따라서 핵심 로직은 월드 오브젝트나 클릭 가능한 상호작용 객체가 아니라, 턴마다 상태를 갱신하는 게임 오브젝트로 다룹니다.

## 배치 기준

현재 단계에서는 `gameobjects/rivalcity`에 배치합니다.

- 경쟁 도시는 턴 진행, 자원 계산, 건설 결정, 점수 계산처럼 순수 게임 상태를 다룹니다.
- `TurnManager`의 `ITurnParticipant`로 등록되어 매 턴 독립적으로 성장합니다.
- `THREE.Object3D`, 마우스 선택, 배치 가이드, UI 패널 같은 런타임 표현은 직접 들고 있지 않습니다.
- 나중에 경쟁 도시의 영역이나 건물을 맵 위에 보여주고 클릭하게 만들 경우, 표현 계층만 `interactives/rivalcity`로 분리합니다.

권장 분리:

```txt
gameobjects/rivalcity/
  rivalcitymanager.ts       // 턴 참가자, 경쟁 도시 전체 진행
  rivalcitytypes.ts         // 저장 가능한 상태 타입
  rivalcitydefs.ts          // 도시 성향, 정책, 특수 자원 데이터 정의
  rivalcityrules.ts         // 성장 규칙과 보정 계산
  rivalcityplanner.ts       // 다음 건설/투자 결정을 고르는 AI
  rivalcityeconomy.ts       // 자원 생산, 소비, 보정 계산

gameobjects/faction/
  // 진영 정책, 관계, 공동 목표, 집단행동을 담당합니다.

gameobjects/strategicgalaxy/
  // 행성 상태, 항로, 행성 내/행성간 영향력, 전략 함대 위치를 담당합니다.

gameobjects/fleet/
  // 실제 함대와 전술 전투 실행을 담당합니다.

world/galaxy/
  // 은하 맵 visual, 선택 UI, 표시용 view model 렌더링만 담당합니다.

interactives/rivalcity/     // 필요해졌을 때만 추가
  rivalcityview.ts          // 맵 위 경쟁 도시 표시
  rivalbuildingmarker.ts    // 선택 가능한 경쟁 건물 마커
```

## 핵심 방향

`TurnManager`는 턴 순서와 리포트 생성을 담당하고, 경쟁 도시는 별도의 턴 참가자로 동작합니다.

```ts
export class RivalCityManager implements ITurnParticipant {
  readonly turnId = "rival-city";
  readonly turnOrder = 150;

  advanceTurn(ctx: TurnContext) {
    this.produceResources();
    this.advanceBuildQueue();
    this.chooseNextPlans();
    this.updateScores();
    this.writeTurnLogs(ctx);
  }
}
```

권장 턴 순서:

```txt
50:  Faction pre-turn    // 진영 정책과 지원/징발 계획
100: BuildingManager       // 플레이어 건설과 생산
150: RivalCityManager      // 경쟁 도시 성장
200: StrategicGalaxy       // 행성/항로/시장/영향력 계산
220: StrategicFleet        // 전략 함대 이동과 임무 처리
250: Faction post-turn     // 진영 점수와 공동 목표 갱신
```

경쟁 도시는 플레이어의 `ResourceManager`를 사용하지 않습니다. `ResourceManager`는 플레이어 지갑에 실제 자원을 반영하는 입구이므로, 경쟁 도시가 같은 이벤트를 보내면 플레이어 자원이 변할 수 있습니다. 경쟁 도시는 자기 내부 `resources`를 가지고 계산합니다.

## 도메인 경계

`rivalcity`는 도시 경제 시뮬레이션만 소유합니다.

```txt
rivalcity가 소유하는 것
- 도시 정의와 도시 성향
- 도시별 자원, 건물, 건설 큐
- 도시 정책과 도시 특수 자원
- 도시 점수와 도시 성장 로그

rivalcity가 참조하는 것
- factionId: `gameobjects/faction`에서 정의한 진영
- planetId: `gameobjects/strategicgalaxy`에서 정의한 행성
- 행성/항로/시장 보정치: `StrategicGalaxyManager`가 계산한 결과
- 진영 정책/지원/징발 보정치: `FactionManager`가 계산한 결과

rivalcity가 소유하지 않는 것
- 진영 정책과 외교 관계
- 행성 상태와 항로 상태
- 은하 맵 visual
- 함대 전투 런타임
```

요약하면 도시는 경제 단위, 행성은 지리/자원 단위, 진영은 의사결정 단위, 함대는 군사 실행 단위, `world/galaxy`는 표시 단위입니다.

## 정의 파일 기반 구성

경쟁 도시는 `buildingDefs`처럼 데이터 테이블로 정의합니다. 매니저 내부에 도시별 규칙을 하드코딩하지 않고, `RivalCityManager`는 정의 파일을 읽어 초기 상태와 성장 보정치를 만듭니다.

추천 정의 파일:

```txt
rivalcitytypes.ts
- 공통 타입

rivalcitydefs.ts
- 도시 성향, 시작 자원, 선호 건물, 정책 가중치
```

도시 정의는 기존 `buildingDefs`의 건물 키 또는 `BuildingProperty.id`를 참조합니다. 이렇게 하면 경쟁 도시용 건물 데이터를 따로 복제하지 않아도 됩니다.

```ts
export type RivalCityDef = {
  id: string;
  name: string;
  desc: string;
  archetype: RivalArchetypeId;
  startingResources: RivalResourceBag;
  startingSpecialResources?: RivalSpecialResourceBag;
  startingBuildings: string[];
  openingBuildOrder?: string[];
  preferredBuildings: string[];
  avoidedBuildings?: string[];
  resourceBias: Partial<Record<CurrencyType, number>>;
  specialResourceBias?: Partial<Record<RivalSpecialResourceType, number>>;
  policyWeights: Partial<Record<RivalPolicyId, number>>;
  scoreWeights: RivalScoreWeights;
};
```

예:

```ts
export const rivalCityDefs: Record<string, RivalCityDef> = {
  ForestGuild: {
    id: "forest_guild",
    name: "Forest Guild",
    desc: "숲과 목재 생산에 강한 경쟁 도시입니다.",
    archetype: "forest",
    startingResources: {
      [CurrencyType.Wood]: 120,
      [CurrencyType.Food]: 60,
      [CurrencyType.Gold]: 30,
    },
    startingSpecialResources: {
      rareWood: 2,
    },
    startingBuildings: ["cc", "lumbermill"],
    openingBuildOrder: ["lumbermill", "supply", "watermill", "market"],
    preferredBuildings: ["lumbermill", "watermill", "supply", "home_b"],
    avoidedBuildings: ["blacksmith"],
    resourceBias: {
      [CurrencyType.Wood]: 1.35,
      [CurrencyType.Food]: 1.15,
      [CurrencyType.Gold]: 0.85,
    },
    specialResourceBias: {
      rareWood: 1.5,
    },
    policyWeights: {
      resourceExpansion: 8,
      housingBoom: 4,
      marketDominance: 2,
      researchInvestment: 1,
    },
    scoreWeights: {
      production: 1.4,
      economy: 0.9,
      population: 1.1,
      research: 0.7,
      prestige: 1.0,
    },
  },
};
```

정책과 특수 자원도 같은 방식으로 정의합니다.

```ts
export const rivalSpecialResourceDefs = {
  rareWood: {
    id: "rareWood",
    name: "희귀 목재",
    desc: "목재 계열 건물의 가치와 생산량을 높입니다.",
  },
  crystal: {
    id: "crystal",
    name: "수정",
    desc: "고급 건물과 연구 점수를 높입니다.",
  },
  tradeInfluence: {
    id: "tradeInfluence",
    name: "무역 영향력",
    desc: "골드 생산과 시장 점수에 영향을 줍니다.",
  },
};
```

## 턴 처리 흐름

한 턴에서 경쟁 도시는 다음 순서로 처리합니다.

```txt
1. 완성된 건물의 생산량을 계산한다.
2. 도시 성향과 특성에 따른 생산 보정치를 적용한다.
3. `StrategicGalaxyManager`와 `FactionManager`가 제공한 외부 보정치를 적용한다.
4. 건설 큐의 남은 턴을 줄인다.
5. 완료된 건물을 도시 건물 목록에 추가한다.
6. 현재 자원, 건물 구성, 전략, 점수 차이, 행성 상황을 보고 다음 계획을 선택한다.
7. 비용을 낼 수 있으면 새 건설 또는 투자 작업을 큐에 넣는다.
8. 도시 점수, 생산력, 영향력, 특수 자원 상태를 갱신한다.
9. `TurnReport`에 경쟁 도시 로그를 남긴다.
```

## 저장 가능한 상태

경쟁 도시 상태는 순수 데이터로 저장합니다.

```ts
export type RivalCityState = {
  id: string;
  name: string;
  status: "active" | "bankrupt" | "assimilated";
  planetId: string;
  factionId: string;
  archetypeId: string;
  strategy: RivalStrategyId;
  turn: number;
  resources: RivalResourceBag;
  specialResources: RivalSpecialResourceBag;
  allocatedPlanetSpecialResources: StrategicPlanetSpecialResourceBag;
  buildings: RivalBuildingState[];
  buildQueue: RivalBuildTask[];
  policies: RivalPolicyState[];
  score: RivalScore;
  traits: RivalTraitState[];
  localInfluence: number;
  galacticInfluence: number;
  discoveredByPlayer: boolean;
};

export type RivalBuildingState = {
  id: string;
  buildingId: string;
  level: number;
  builtTurn: number;
};

export type RivalBuildTask = {
  id: string;
  buildingId: string;
  remainingTurns: number;
  source: "planned" | "policy" | "event";
};
```

`StrategicPlanetSpecialResourceBag`는 `gameobjects/strategicgalaxy`의 타입입니다. 경쟁 도시는 행성 특수 자원의 전체 상태를 소유하지 않고, 해당 도시가 이번 턴 배분받은 몫만 기록합니다.

저장할 대상:

- 경쟁 도시별 자원량
- 특수 자원량
- 행성 특수 자원량
- 건물 목록
- 건설 큐
- 도시 성향과 정책
- 소속 행성 ID
- 소속 진영 ID
- 점수
- 행성 내 영향력과 은하 영향력
- 난이도, seed, 마지막 처리 턴

저장하지 않을 대상:

- `THREE.Object3D`
- UI 선택 상태
- 턴 로그
- 임시 계산 캐시
- 월드 표현용 마커

## 도시 성향

경쟁 도시가 모두 같은 방식으로 성장하면 숫자만 다른 복제 도시가 됩니다. 도시마다 성향을 두면 플레이어가 경쟁자를 읽고 대응할 수 있습니다.

```ts
export type RivalArchetype = {
  id: string;
  name: string;
  description: string;
  preferredBuildings: string[];
  avoidedBuildings?: string[];
  resourceBias: Partial<Record<CurrencyType, number>>;
  specialResourceBias?: Partial<Record<RivalSpecialResourceType, number>>;
  policyWeights: Partial<Record<RivalPolicyId, number>>;
  scoreWeights: RivalScoreWeights;
};
```

예시 성향:

```txt
Forest Guild
- 나무 생산이 강함
- 제재소, 물레방아, 주거 건물을 선호
- 희귀 목재 특수 자원을 생산
- 중후반에는 건물 업그레이드보다 생산량 확장에 집중

Mountain Syndicate
- 자재와 보석 생산이 강함
- 광산과 대장간을 선호
- 수정, 철광석 같은 특수 자원을 보유
- 건설 속도는 느리지만 건물 가치 점수가 높음

Harbor League
- 식량과 골드 흐름이 안정적
- 시장, 물레방아, 고급 주택을 선호
- 무역권 특수 자원을 축적
- 시장 가격 변화나 교역 보너스 이벤트에 강함

Scholar Enclave
- 원자재 생산은 약하지만 연구와 효율 보너스가 높음
- 대장간, 성당, 특수 연구 시설을 선호
- 지식 특수 자원을 생산
- 같은 건물 수로 더 높은 효율을 냄

Frontier Commune
- 성장 속도는 빠르지만 장기 점수 효율은 낮음
- 보급고, 기본 자원 건물을 빠르게 확장
- 시민 결속 특수 자원을 생산
- 초반 경쟁 압박을 만드는 역할에 적합
```

## Faction/Strategic Galaxy 연동

하나의 행성에는 여러 도시가 있을 수 있고, 같은 도시 성향이 여러 행성에 존재할 수도 있습니다. 하지만 도시 배치와 행성 정의는 `rivalcity`가 소유하지 않습니다.

```txt
도시 정의
- `gameobjects/rivalcity/rivalcitydefs.ts`
- Forest Guild, Harbor League 같은 도시 성향을 정의합니다.

도시 배치
- `gameobjects/strategicgalaxy`
- 어떤 planetId에 어떤 cityDefId/factionId 도시가 존재하는지 정의합니다.

행성 정의
- `gameobjects/strategicgalaxy`
- 행성 자원, 항로, 행성 특수 자원, citySlots, 시장 규모를 정의합니다.

진영 정의
- `gameobjects/faction`
- Alliance, Empire, Guild, Neutral 같은 집단 정책과 관계를 정의합니다.
```

`RivalCityManager`는 시작 시 `StrategicGalaxyManager`가 제공한 city seed 또는 city placement를 받아 도시 상태를 만듭니다.

```ts
export type RivalCitySeed = {
  id: string;
  cityDefId: string;
  planetId: string;
  factionId: string;
  name?: string;
  initialRank?: number;
  startingInfluence?: number;
};
```

초기 상태 생성은 다음 순서로 처리합니다.

```txt
1. `StrategicGalaxyManager`에서 도시 배치를 읽는다.
2. `cityDefId`로 `RivalCityDef`를 찾는다.
3. `planetId`는 행성 보정치를 조회하는 참조로 저장한다.
4. `factionId`는 진영 정책과 지원/징발 보정치를 조회하는 참조로 저장한다.
5. 도시 시작 자원과 도시 성향 보정치를 적용해 `RivalCityState`를 만든다.
```

## 성장 보정 합성

최종 생산량과 의사결정 점수는 도시 성향을 기본으로 하고, 행성/진영 보정치는 외부 도메인에서 계산된 값을 받아 합성합니다.

```txt
최종 생산량 =
  건물 기본 생산량
  x 도시 성향 보정
  x 도시 정책 보정
  x StrategicGalaxyManager가 제공한 행성/항로 보정
  x FactionManager가 제공한 진영 정책 보정
  x 난이도 보정
```

예:

```txt
Mountain Syndicate + Hephaestus + Empire
- 도시 성향: Materials와 고가치 산업 건물 선호
- 행성 보정: Hephaestus의 산업/조선 공업 보너스
- 진영 보정: Empire의 industrial mandate와 tribute 정책
- 결과: 자재와 고가치 산업 건물 경쟁에 강함

Harbor League + Atlas + Guild
- 도시 성향: Gold와 tradeInfluence 선호
- 행성 보정: Atlas의 중앙 관문과 물류 보너스
- 진영 보정: Guild의 trade compact
- 결과: 무역 영향력과 경제 점수 경쟁에 강함

Scholar Enclave + Athena + Alliance
- 도시 성향: knowledge와 researchInvestment 선호
- 행성 보정: 정보 네트워크와 안정성
- 진영 보정: Alliance의 mutual aid
- 결과: 연구 정책과 후반 배율 경쟁에 강함
```

## 특수 자원

특수 자원은 플레이어의 기본 재화와 분리합니다. 경쟁 도시의 개성을 살리고, 도시별 정책이나 이벤트를 발동하는 데 사용합니다.

```ts
export type RivalSpecialResourceType =
  | "rareWood"
  | "crystal"
  | "tradeInfluence"
  | "knowledge"
  | "civicTrust";

export type RivalSpecialResourceBag = Partial<Record<RivalSpecialResourceType, number>>;
```

특수 자원 예시:

```txt
rareWood
- 숲 계열 경쟁 도시가 생산
- 건물 업그레이드 비용 감소, 목재 생산 점수 증가

crystal
- 산악/광산 계열 경쟁 도시가 생산
- 고가치 건물, 연구 시설, 보석 점수에 사용

tradeInfluence
- 시장/항구 계열 경쟁 도시가 생산
- 골드 생산량 증가, 시장 가격 영향력 증가

knowledge
- 연구 계열 경쟁 도시가 생산
- 생산 효율 상승, 정책 해금, 후반 점수 배율 증가

civicTrust
- 인구/공동체 계열 경쟁 도시가 생산
- 시민 수 점수 증가, 건설 큐 안정성 증가
```

행성 특수 자원은 `gameobjects/strategicgalaxy`가 소유합니다. `rivalcity`는 행성 특수 자원의 정의나 산출량을 직접 계산하지 않고, 특정 도시가 배분받은 share나 보정치만 입력으로 받습니다.

특수 자원은 다음 방식으로 획득합니다.

```txt
- 특정 건물이 턴마다 소량 생산
- 도시 성향 보너스로 기본 생산량에 추가
- 정책이 발동될 때 일시적으로 증가
- 특정 건물 조합을 갖추면 보너스 생산
```

예:

```txt
제재소 3개 이상 + 물레방아 1개 이상:
Forest Guild가 rareWood +1 / turn 획득

광산 2개 이상 + 대장간 1개 이상:
Mountain Syndicate가 crystal +1 / 2 turns 획득

시장 2개 이상 + 고급 주택 2개 이상:
Harbor League가 tradeInfluence +2 / turn 획득
```

## 성장 정책

성장 정책은 경쟁 도시가 이번 시기에 무엇을 우선하는지를 나타냅니다.

```ts
export type RivalPolicyId =
  | "resourceExpansion"
  | "housingBoom"
  | "industrialFocus"
  | "marketDominance"
  | "researchInvestment"
  | "landmarkRace";

export type RivalPolicyDef = {
  id: RivalPolicyId;
  name: string;
  durationTurns: number;
  requirements?: RivalPolicyRequirement;
  effects: RivalPolicyEffect[];
};
```

정책 예시:

```txt
resourceExpansion
- 자원 건물 건설 확률 증가
- 나무, 자재, 식량 생산량 증가
- 시장/연구 건물 선호도 감소

housingBoom
- 주거 건물 건설 확률 증가
- 시민 점수 증가
- 식량 소비 증가

industrialFocus
- 광산, 대장간, 고가치 건물 선호
- 자재와 보석 점수 증가
- 건설 비용 증가

marketDominance
- 시장 건물 선호
- 골드 생산 증가
- tradeInfluence 생산

researchInvestment
- 연구 건물 선호
- knowledge 생산
- 즉시 점수는 낮지만 후반 배율 증가

landmarkRace
- 특정 고급 건물 또는 랜드마크를 빠르게 완성하려 함
- 성공 시 큰 점수 보너스
- 실패하거나 자원이 부족하면 성장 정체 가능
```

## 건설 계획 AI

처음부터 복잡한 AI보다 점수 기반 선택이 좋습니다.

```txt
candidateScore =
  basePriority
  + archetypePreference
  + planetPreference
  + factionPreference
  + resourceNeedScore
  + scoreGapPressure
  + policyBonus
  + localCompetitionPressure
  - missingCostPenalty
  - duplicatePenalty
```

계획 기준:

- 부족한 자원을 생산하는 건물의 점수를 올립니다.
- 도시 성향이 선호하는 건물의 점수를 올립니다.
- 행성 특성이 밀어주는 건물의 점수를 올립니다.
- 진영 정책이 요구하는 건물의 점수를 올립니다.
- 현재 정책과 맞는 건물의 점수를 올립니다.
- 이미 같은 건물이 너무 많으면 점수를 낮춥니다.
- 플레이어보다 뒤처진 점수 분야를 보완하는 건물의 점수를 올립니다.
- 같은 행성의 경쟁 도시가 앞서가는 분야를 견제하는 건물의 점수를 올립니다.
- 도시 규모(인구/자본)가 일정 수준을 초과하면, 같은 행성의 빈 슬롯이나 인접 행성으로 새로운 거점을 개척(Expansion)하려는 계획의 점수를 대폭 올립니다.

예:

```txt
Forest Guild
- 나무가 충분하면 주거 또는 시장으로 확장
- 나무가 부족하면 제재소 우선
- rareWood가 충분하면 고급 건물 업그레이드 시도

Mountain Syndicate
- 자재가 충분하면 광산, 대장간, 고가치 건물 우선
- 골드가 부족하면 시장을 보조적으로 건설
- crystal이 쌓이면 랜드마크 정책 후보 증가
```

## 점수 모델

경쟁 도시는 단일 총점뿐 아니라 분야별 점수를 가집니다.

```ts
export type RivalScore = {
  total: number;
  economy: number;
  production: number;
  population: number;
  research: number;
  prestige: number;
  localInfluence: number;
  galacticInfluence: number;
};
```

점수 계산 예:

```txt
economy    = 골드 생산량 + 시장 건물 가치 + tradeInfluence 보너스
production = 나무/자재/식량 생산량 + 자원 건물 가치
population = 시민 수 제공 건물 + civicTrust 보너스
research   = 연구 건물 레벨 + knowledge 보너스
prestige   = 고급 건물, 랜드마크, 특수 자원 누적량
localInfluence = 같은 행성 도시들 사이의 영향력
galacticInfluence = 연결 행성과 전체 은하권에서의 영향력
```

도시 성향은 점수 가중치를 다르게 가집니다.

```txt
Forest Guild:
- production 가중치 높음
- economy와 prestige는 보통

Harbor League:
- economy 가중치 높음
- population과 prestige도 높음

Scholar Enclave:
- research 가중치 높음
- 초반 total은 낮지만 후반 배율이 높음
```

## 플레이어와의 경쟁 방식

전투가 없으므로 경쟁은 비교, 선점, 시장 압박, 목표 경주로 표현합니다.

초기 구현에서는 추상 경쟁을 권장합니다.

```txt
추상 경쟁
- 경쟁 도시는 자기 내부 자원만 계산한다.
- 플레이어의 실제 환경 자원 노드는 건드리지 않는다.
- 구현이 단순하고 저장/복원이 안정적이다.
```

후속 확장으로 공유 자원 경쟁을 추가할 수 있습니다.

```txt
공유 자원 경쟁
- 경쟁 도시가 특정 숲, 광산, 수원 권역을 선점한다.
- 선점된 권역은 플레이어 생산량에 보정치를 줄 수 있다.
- UI에서 왜 생산량이 바뀌었는지 설명해야 한다.
```

추천 단계:

```txt
1차: 내부 자원만 쓰는 추상 경쟁
2차: 시장 가격, 점수 경쟁, 랜드마크 경주
3차: 맵 위 권역 표시
4차: 공유 자원 선점과 고갈
5차: 비전투 상호작용 (교역로 개설, 사보타주 파견, 문화적 압박)
```

## Strategic Galaxy에 제공하는 결과

행성 내 경쟁과 행성간 경쟁은 `gameobjects/strategicgalaxy`가 계산합니다. `rivalcity`는 각 도시의 경제 결과를 제공하고, 전략 은하 시스템이 이를 행성 영향력과 교역권 계산에 반영합니다.

도시가 제공하는 출력:

```txt
- cityId
- planetId
- factionId
- city score
- resource output
- special resource output
- active city policies
- local competition contribution
```

전략 은하가 돌려주는 입력:

```txt
- planet resource/logistics bonus
- market saturation/price pressure
- allocated planet special resources
- localInfluence rank
- galacticInfluence pressure
- contested planet pressure
```

예:

```txt
Harbor League + Atlas + Guild
- rivalcity: 골드 생산, tradeInfluence, 시장 건물 점수를 제공
- strategicgalaxy: Atlas의 gateInfluence 배분과 항로 시장 보정을 계산
- faction: Guild trade compact로 시장 정책을 보정

Mountain Syndicate + Hephaestus + Empire
- rivalcity: 자재 생산, crystal, 산업 건물 점수를 제공
- strategicgalaxy: Hephaestus의 shipyardContract와 산업 항로 가치를 계산
- faction: Empire industrial mandate로 자재와 징발 정책을 보정
```

## 턴 로그

기존 `TurnLogKind`에는 `"enemy"`가 있지만, 경쟁 도시에는 `"rival"` 또는 `"competitor"`가 더 명확합니다.

권장 변경:

```ts
export type TurnLogKind =
  | "system"
  | "construction"
  | "resource"
  | "population"
  | "unit"
  | "enemy"
  | "rival"
  | "research";
```

로그 예:

```txt
Forest Guild가 제재소 건설을 시작했습니다.
Mountain Syndicate가 crystal 1을 생산했습니다.
Harbor League의 골드 생산량이 플레이어 도시를 앞질렀습니다.
Scholar Enclave가 연구 투자 정책을 시작했습니다.
Frontier Commune이 고급 주택을 완성했습니다.
```

## 난이도와 공정성

경쟁 도시가 플레이어보다 빠르게 성장하면 불공정하게 느껴질 수 있으므로, 보정치는 눈에 보이는 규칙으로 설명 가능해야 합니다.

권장 원칙:

- 숨겨진 무한 자원보다 성향, 정책, 특수 자원으로 강점을 표현합니다.
- 경쟁 도시도 건설 시간과 비용을 가집니다.
- 난이도는 생산량, 계획 정확도, 정책 발동 빈도, 시작 자원으로 조절합니다.
- 플레이어가 로그와 요약 UI를 보고 경쟁 도시의 성장을 이해할 수 있어야 합니다.

난이도 예:

```txt
easy
- 경쟁 도시 생산량 80%
- 정책 발동 빈도 낮음
- 특수 자원 획득량 낮음

normal
- 경쟁 도시 생산량 100%
- 성향에 맞는 합리적 건설

hard
- 경쟁 도시 생산량 115%
- 특수 자원 활용 적극적
- 플레이어가 앞선 분야를 따라잡는 계획 가중치 증가
```

## 1차 구현 목표

첫 구현은 작게 시작합니다.

```txt
1. `RivalCityManager`를 `ITurnParticipant`로 등록한다.
2. `rivalcitydefs.ts`에 경쟁 도시 2~3개를 데이터로 정의한다.
3. `strategicgalaxy`가 제공하는 city seed에서 `planetId`, `factionId`를 받아 도시 상태를 만든다.
4. 각 도시가 내부 자원을 생산하고 건설 큐를 진행한다.
5. 도시 성향, 행성 보정, 진영 보정에 따라 다음 건물을 선택한다.
6. 도시 특수 자원 2~3개를 먼저 적용한다.
7. 턴 로그에 도시 성장과 도시 정책 변화를 출력한다.
8. 저장/로드용 순수 상태 export/import 계약을 만든다.
```

초기 추천 경쟁 도시:

```txt
Forest Guild
- 강점: Wood, Food, rareWood
- 약점: Gold, Research
- 플레이 감각: 초반 생산량 압박

Mountain Syndicate
- 강점: Materials, Gems, crystal
- 약점: Food, 건설 속도
- 플레이 감각: 느리지만 고가치 건물로 후반 추격

Harbor League
- 강점: Gold, Food, tradeInfluence
- 약점: Materials
- 플레이 감각: 시장과 경제 점수 경쟁
```

초기 연동 시나리오:

```txt
Forest Guild + Eden + Alliance
- 도시 강점: Wood, Food, rareWood
- 행성 보정: Food, People, bioCrystal
- 진영 보정: mutual aid, 안정 성장
- 플레이 감각: 안정적인 인구 성장과 생산량 압박

Mountain Syndicate + Hephaestus + Empire
- 도시 강점: Materials, Gems, crystal
- 행성 보정: shipyardContract, 산업 건물
- 진영 보정: industrial mandate, tribute
- 플레이 감각: 느리지만 강한 후반 산업 경쟁

Harbor League + Atlas + Guild
- 도시 강점: Gold, Food, tradeInfluence
- 행성 보정: gateInfluence, 물류
- 진영 보정: trade compact
- 플레이 감각: 시장과 은하 교역권 경쟁
```

## 향후 확장

- 경쟁 도시별 외교 상태
- 경쟁 도시끼리의 순위 경쟁
- 행성별 도시 순위와 영향력 경쟁
- 행성간 교역로와 물류 점수
- 랜드마크 선점 이벤트
- 시장 가격 시스템과 연결
- 플레이어가 경쟁 도시의 성장 정책을 정찰하는 UI
- 특정 특수 자원을 교역하거나 차단하는 이벤트
- 월드 맵 위 경쟁 도시 영역 표시
- 갤럭시 맵에서 행성별 경쟁 상황 표시
- 공유 자원 권역 선점
