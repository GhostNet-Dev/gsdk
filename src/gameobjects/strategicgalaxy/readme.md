# Strategic Galaxy Design Notes

이 폴더는 은하 전역의 행성 상태, 항로, 행성 내/행성간 영향력, 교역권, 시장권, 전략 함대 위치를 담당합니다.

`world/galaxy`는 행성 네트워크를 보여주는 visual 모듈로 두고, 실제 게임 상태와 시뮬레이션은 `gameobjects/strategicgalaxy`가 소유합니다.

## 배치 기준

전략 은하는 도시보다 크고 진영보다 지리적인 단위입니다.

- 행성은 도시가 배치되는 지리/자원 단위입니다.
- 항로는 행성간 교역, 물류, 함대 이동의 연결 단위입니다.
- 행성 영향력은 여러 도시와 진영 정책, 함대 주둔 결과를 합산한 상태입니다.
- `world/galaxy`는 이 상태를 받아 그릴 뿐, 정책과 계산을 소유하지 않습니다.

권장 분리:

```txt
gameobjects/strategicgalaxy/
  strategicgalaxytypes.ts       // 행성, 항로, 영향력, 시장권 타입
  strategicgalaxydefs.ts        // gameplay 행성 정의와 항로 정의
  planetprofiledefs.ts          // 행성 자원/환경/trait 정의
  strategicgalaxymanager.ts     // 턴 참가자, 행성/항로/영향력 갱신
  influencecalculator.ts        // 행성 내/행성간 영향력 계산
  trademarket.ts                // 교역권, 시장 포화, 가격 압력
  strategicfleetstate.ts        // 은하 전략 레벨의 함대 위치/임무 상태
  galaxyviewmodel.ts            // world/galaxy로 넘길 표시용 view model 생성

world/galaxy/
  // 렌더링, 선택 UI, 항로/행성 표시만 담당합니다.
```

## 핵심 방향

전략 은하 시스템은 다음 상태를 소유합니다.

```txt
- 행성별 gameplay 상태
- 행성별 특수 자원 산출
- 행성에 배치된 도시 ID 목록
- 행성별 faction influence
- 행성간 항로와 물류 상태
- 교역권과 시장 압력
- 전략 함대의 위치와 임무
```

`defaultgalaxymap.ts`에 들어 있는 `faction`, `stats`, `resource`, `links`는 현재 visual 샘플 데이터에 가깝습니다. 장기적으로는 gameplay 데이터는 이 폴더로 옮기고, `world/galaxy`는 `StrategicGalaxyManager`가 만든 view model만 받아 렌더링합니다.

## 데이터 소유권

권장 소유권:

```txt
gameobjects/strategicgalaxy
- planet gameplay state
- routes
- influence
- markets
- strategic fleet positions

gameobjects/faction
- faction policy
- faction goals
- faction relations

gameobjects/rivalcity
- city economy
- city construction
- city score

gameobjects/fleet
- tactical fleet runtime
- battle execution

world/galaxy
- visual graph
- labels
- selection UI
- view model rendering
```

의존 방향:

```txt
gameobjects/* -> world/galaxy view model -> world/galaxy rendering
```

`gameobjects`가 `world/galaxy`의 렌더링 클래스를 import하지 않는 것이 원칙입니다.

## 행성 정의

전략 행성 정의는 visual과 gameplay를 분리합니다.

```ts
export type StrategicPlanetDef = {
  id: string;
  name: string;
  defaultFactionId: string;
  profileId: string;
  routeIds: string[];
  citySlots: number;
  resourceBias: Partial<Record<CurrencyType, number>>;
  specialResources: StrategicPlanetSpecialResourceType[];
  baseStats: StrategicPlanetStats;
};

export type StrategicPlanetStats = {
  economy: number;
  industry: number;
  defense: number;
  population: number;
  logistics: number;
  marketScale: number;
};
```

Visual 전용 정보는 별도 projection에 둡니다.

```ts
export type GalaxyPlanetVisualDef = {
  planetId: string;
  radius: number;
  assetKey: string;
  ring?: {
    textureKey: string;
    tiltX?: number;
    tiltY?: number;
  };
  position?: [number, number, number];
};
```

이렇게 분리하면 같은 전략 행성 상태를 다른 UI나 다른 씬에서도 재사용할 수 있습니다.

## 행성 상태

행성 상태는 저장 가능한 순수 데이터입니다.

```ts
export type StrategicPlanetState = {
  id: string;
  factionInfluence: Record<string, number>;
  controllingFactionId?: string;
  contested: boolean;
  cityIds: string[];
  stationedFleetIds: string[];
  specialResources: StrategicPlanetSpecialResourceBag;
  market: PlanetMarketState;
  stability: number;
  blockadeLevel: number;
  lastProcessedTurn: number;
};

export type PlanetMarketState = {
  demand: Partial<Record<CurrencyType, number>>;
  supply: Partial<Record<CurrencyType, number>>;
  saturation: Partial<Record<CurrencyType, number>>;
  pricePressure: Partial<Record<CurrencyType, number>>;
};
```

저장할 대상:

- 행성별 faction influence
- 장악/경합 상태
- 배치된 도시 ID
- 주둔 함대 ID
- 행성 특수 자원량
- 시장 수요/공급/포화
- 봉쇄, 안정도, 마지막 처리 턴

저장하지 않을 대상:

- 행성 mesh
- label sprite
- ring material
- UI 선택 상태
- 임시 pathfinding 캐시

## 항로와 물류

항로는 행성간 교역과 함대 이동의 기본 연결입니다.

```ts
export type StrategicRouteState = {
  id: string;
  fromPlanetId: string;
  toPlanetId: string;
  distance: number;
  controllingFactionId?: string;
  traffic: number;
  security: number;
  blockadeLevel: number;
  tradeValue: number;
};
```

항로 계산:

```txt
traffic
- 연결된 행성의 economy와 marketScale에 따라 증가

security
- 주둔 함대, faction defense 정책, 인접 적대 진영에 따라 변경

blockadeLevel
- 적대 함대 임무, 전쟁 상태, 경합 행성 상태로 증가

tradeValue
- 양쪽 행성의 수요/공급 차이와 특수 자원 가치로 계산
```

## 행성 특수 자원

행성 특수 자원은 행성 환경과 항로 경쟁의 핵심 보상입니다.

```ts
export type StrategicPlanetSpecialResourceType =
  | "helium3"
  | "iceCrystal"
  | "rareEarth"
  | "gateInfluence"
  | "darkMatter"
  | "shipyardContract"
  | "bioCrystal"
  | "photonFuel"
  | "gravityOre"
  | "industrialPatent";
```

기존 galaxy map의 `stats.resource`는 다음처럼 gameplay 자원으로 매핑할 수 있습니다.

```txt
Sirius: 헬륨-3 -> helium3
Orion: 빙정 광물 -> iceCrystal
Vega: 희토류 -> rareEarth
Atlas: 중앙 관문 -> gateInfluence
Hades: 중력 채굴 -> gravityOre
Nyx: 암흑물질 -> darkMatter
Hephaestus: 조선 공업 -> shipyardContract
Eden: 생명수정 -> bioCrystal
Helios: 광자 연료 -> photonFuel
```

## 행성 내 경쟁

한 행성에 여러 도시가 있으면 local influence 경쟁이 발생합니다.

```txt
localInfluence =
  도시 총점
  + 행성 trait에 맞는 분야 점수
  + 행성 특수 자원 누적량
  + 같은 행성 도시 대비 상대 성장률
  + 소속 진영 정책 보너스
```

행성 내 경쟁 결과:

- 행성 특수 자원 배분 비율이 바뀝니다.
- 행성 시장 가격 압력이 바뀝니다.
- faction influence가 갱신됩니다.
- controllingFactionId가 바뀔 수 있습니다.

## 행성간 경쟁

행성간 경쟁은 항로와 faction influence를 기반으로 계산합니다.

```txt
galacticInfluence =
  localInfluence
  + 연결 항로 tradeValue
  + routeControl 보너스
  + 행성 특수 자원 가치
  + 진영 네트워크 보너스
  + 주둔 함대 보정
```

예:

```txt
Atlas
- 중앙 관문 행성
- 여러 항로가 연결되어 gateInfluence 가치가 높음
- marketDominance와 routeControl 정책이 강하게 작동

Hephaestus
- 조선 공업 행성
- shipyardContract가 산업과 함대 readiness에 영향을 줌
- 주변 행성의 물류 경쟁에 영향을 줌

Hades
- 방어와 중력 채굴이 강한 요새 행성
- gravityOre와 높은 defense로 후반 prestige와 봉쇄 저항에 강함
```

## Faction 연동

`FactionManager`는 전략 은하의 결과를 보고 정책과 공동 목표를 고릅니다.

전략 은하가 faction에 제공하는 정보:

```txt
- factionInfluence
- controlledPlanetIds
- contestedPlanetIds
- routeControl
- market region score
- planet special resource output
- hostile neighbor pressure
```

faction이 전략 은하에 제공하는 정보:

```txt
- 진영 정책
- 행성 장악 목표
- 교역로 강화 목표
- 봉쇄/호위/증원 같은 전략 함대 임무
- 도시 지원/징발 정책
```

## Rival City 연동

`RivalCityManager`는 도시별 생산과 건설을 계산하고, 전략 은하 시스템은 그 결과를 행성에 반영합니다.

입력:

```txt
- cityId
- planetId
- factionId
- city score
- city resource output
- city special resource output
- active policies
```

출력:

```txt
- planet localInfluence contribution
- planet market supply/demand contribution
- planet special resource share
- route trade pressure
```

## Fleet 연동

`gameobjects/fleet`에는 이미 전술 함대와 전투 월드가 존재합니다. 전략 은하는 전투 월드의 렌더링 객체를 직접 소유하지 않고, 전략 함대 상태만 관리합니다.

`StrategicFleetState`는 이 모듈이 소유하는 canonical 타입이다. `FactionManager`와 `FleetWorld`는 이 타입을 import해서 사용한다.

```ts
// strategicgalaxy/strategicfleetstate.ts 에 정의
export type StrategicFleetState = {
  id: string;
  factionId: FactionId;
  currentPlanetId: string;
  targetPlanetId?: string;
  routeId?: string;          // 이동 중일 때 사용 중인 항로
  mission: "patrol" | "escort" | "blockade" | "reinforce" | "raid";
  strength: number;
  readiness: number;
  etaTurns?: number;         // 목표 행성까지 남은 턴 수
  linkedFleetWorldId?: string; // 전술 전투 런타임과 연결된 FleetWorld ID
};
```

전투가 필요해질 때만 전략 함대 상태를 `FleetWorld` 설정으로 투영합니다.

```txt
StrategicFleetState
-> FleetWorldFleetOptions
-> FleetWorld tactical battle
-> battle result
-> StrategicFleetState / StrategicPlanetState 갱신
```

## World/Galaxy View Model

`world/galaxy`는 다음 형태의 view model을 받아 그리는 구조가 좋습니다.

```ts
export type GalaxyPlanetViewModel = {
  id: string;
  name: string;
  factionId: string;
  factionLabel: string;
  economy: number;
  industry: number;
  defense: number;
  population: number;
  resourceLabel: string;
  controllingFactionId?: string;
  contested: boolean;
  influence: Record<string, number>;
  fleetStrength: number;
  links: string[];
  visual: GalaxyPlanetVisualDef;
};
```

이 view model은 `StrategicGalaxyManager` 또는 별도 projection 함수가 만듭니다. `world/galaxy`는 이 값을 표시만 합니다.

## 턴 처리

전략 은하 시스템은 도시와 진영, 함대 결과를 모아 행성 상태를 갱신합니다.

```txt
1. 이전 턴의 faction policy와 city output을 읽는다.
2. 행성별 market supply/demand를 갱신한다.
3. 도시별 localInfluence contribution을 계산한다.
4. factionInfluence와 controllingFactionId를 갱신한다.
5. 항로 traffic, tradeValue, security, blockade를 갱신한다.
6. 전략 함대 이동과 임무 효과를 처리한다.
7. galaxy view model 갱신 이벤트를 발행한다.
```

권장 이벤트:

```txt
StrategicGalaxyUpdated
PlanetStateChanged
RouteStateChanged
StrategicFleetStateChanged
GalaxyViewModelUpdated
```

## 1차 구현 목표

```txt
1. `strategicgalaxytypes.ts`를 만든다.
2. `strategicgalaxydefs.ts`에 Atlas, Hephaestus, Eden 같은 행성 2~3개를 gameplay 데이터로 정의한다.
3. `StrategicPlanetState`와 `StrategicRouteState` export/import 계약을 만든다.
4. `RivalCityManager`의 도시 output을 받아 localInfluence를 계산한다.
5. `FactionManager`의 factionId와 정책을 받아 factionInfluence를 계산한다.
6. `world/galaxy`로 넘길 view model 타입을 정의한다.
7. 실제 렌더링 연결은 view model 이벤트만 먼저 발행하고 후속 단계로 둔다.
```
