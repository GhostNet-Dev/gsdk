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
  name?: string;
  factionId: FactionId;
  currentPlanetId: string;
  targetPlanetId?: string;
  routeId?: string;          // 이동 중일 때 사용 중인 항로
  mission: "idle" | "patrol" | "escort" | "blockade" | "reinforce" | "raid" | "attack" | "repair";
  strength: number;
  readiness: number;
  hullRatio: number;
  supply: number;
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

## Strategic Galaxy Mode

`strategicgalaxy` 모드는 은하 지도를 보면서 행성, 항로, 진영 영향력, 전략 함대 상태를 확인하고 명령을 내리는 작전 화면입니다.

핵심 목표:

```txt
- 우주 맵에서 행성과 항로를 보여준다.
- 행성을 선택하면 상세 정보를 보여준다.
- 행성/항로/함대 상태를 보고 공격, 이동, 정비, 방어, 봉쇄 명령을 내린다.
- 명령 결과를 턴 처리에서 계산하고 view model 갱신 이벤트로 UI를 갱신한다.
- 전술 전투가 필요할 때만 gameobjects/fleet 런타임으로 진입한다.
```

### 우주 맵 표시

`world/galaxy`는 전략 은하 view model을 받아 시각화합니다.

필요한 표시 요소:

```txt
- 행성 노드
- 행성 이름과 진영 색상
- 선택된 행성 focus ring
- 인접 행성 강조
- 항로 연결선
- 전선/경합 항로 강조
- 봉쇄 항로 표시
- 교역 가치 또는 traffic 표시
- 행성별 주둔 함대 아이콘
- 이동 중인 함대의 route progress 표시
- 위험도, 요충지, 특수 자원 badge
```

표현 책임은 `world/galaxy`에 두되, 어떤 행성이 경합 상태인지, 어떤 항로가 봉쇄 상태인지, 어떤 함대가 주둔 중인지는 `StrategicGalaxyManager`가 만든 view model에서 받아옵니다.

### 행성 선택과 상세 정보

행성을 선택하면 상세 패널을 열고 다음 정보를 표시합니다.

```txt
개요
- 행성 이름
- 설명
- 현재 장악 진영
- 경합 여부
- 경제력, 산업력, 방어력, 인구
- 안정도와 봉쇄 수치
- 특수 자원

진영
- faction influence 비율
- 장악/경합 상태
- 인접 적대 진영 압박
- 최근 영향력 변화

함대
- 주둔 함대 목록
- 이동 중인 아군/적군 함대
- 함대 전력, 준비도, hullRatio, supply
- 실행 가능한 함대 명령

항로
- 연결된 행성
- traffic
- security
- blockadeLevel
- tradeValue
- 이동 가능 여부

시장
- 수요
- 공급
- 포화도
- 가격 압력
- 특수 자원 배분

로그
- 최근 턴 변화
- 전투 결과
- 봉쇄/정비/이동 완료 기록
```

권장 상세 view model:

```ts
export type StrategicPlanetDetailViewModel = {
  planet: GalaxyPlanetViewModel;
  stability: number;
  blockadeLevel: number;
  influence: Record<FactionId, number>;
  stationedFleets: StrategicFleetViewModel[];
  incomingFleets: StrategicFleetViewModel[];
  routes: StrategicRouteViewModel[];
  market: PlanetMarketState;
  recentLogs: StrategicGalaxyLogEntry[];
  availableCommands: StrategicPlanetCommandViewModel[];
};

export type StrategicFleetViewModel = {
  id: string;
  name: string;
  factionId: FactionId;
  currentPlanetId: string;
  targetPlanetId?: string;
  mission: StrategicFleetState["mission"];
  strength: number;
  readiness: number;
  hullRatio: number;
  supply: number;
  etaTurns?: number;
  canReceiveOrders: boolean;
};

export type StrategicRouteViewModel = {
  id: string;
  fromPlanetId: string;
  toPlanetId: string;
  traffic: number;
  security: number;
  blockadeLevel: number;
  tradeValue: number;
  passable: boolean;
};

export type StrategicPlanetCommandViewModel = {
  id: string;
  label: string;
  kind: "move" | "attack" | "defend" | "patrol" | "blockade" | "escort" | "reinforce" | "repair";
  enabled: boolean;
  disabledReason?: string;
  preview?: string;
};

export type StrategicGalaxyLogEntry = {
  turn: number;
  source: "planet" | "route" | "fleet" | "faction" | "market";
  message: string;
};
```

### 행성 명령

행성 상세 패널에서는 현재 선택 상태에 따라 가능한 명령만 보여줍니다.

기본 명령:

```txt
이동
- 선택한 아군 함대를 이 행성으로 이동시킨다.
- 항로 연결, ETA, 위험도를 표시한다.

공격
- 적 함대 또는 적대 행성 방어군을 공격한다.
- 예상 승률, 예상 손실, 전투 발생 조건을 표시한다.

방어 배치
- 함대를 행성 방어 임무로 전환한다.
- 행성 defense와 security에 보정치를 준다.

초계
- 주변 항로 security를 높인다.
- 매복과 약탈 위험을 낮춘다.

봉쇄
- 적 행성의 tradeValue, supply, stability에 압박을 준다.
- 전쟁 또는 적대 관계일 때만 허용한다.

호위
- 특정 교역 항로 또는 이동 중인 아군 함대를 보호한다.

증원
- 경합 행성 또는 방어가 약한 아군 행성으로 함대를 보낸다.

정비
- 조선소, 산업 행성, 아군 기지에서 hull, readiness, supply를 회복한다.

전술 전투 진입
- 교전 조건이 충족되면 FleetWorldOptions를 만들어 gameobjects/fleet 전투로 진입한다.
```

명령은 UI 상태가 아니라 저장 가능한 전략 명령으로 관리합니다.

```ts
export type StrategicFleetOrder =
  | StrategicFleetMoveOrder
  | StrategicFleetAttackOrder
  | StrategicFleetMaintenanceOrder
  | StrategicFleetMissionOrder;

export type StrategicFleetMoveOrder = {
  type: "move";
  fleetId: string;
  fromPlanetId: string;
  toPlanetId: string;
  routeIds: string[];
  etaTurns: number;
};

export type StrategicFleetAttackOrder = {
  type: "attack";
  fleetId: string;
  targetPlanetId?: string;
  targetFleetId?: string;
  estimatedWinRate: number;
  riskLevel: number;
};

export type StrategicFleetMaintenanceOrder = {
  type: "maintenance";
  fleetId: string;
  planetId: string;
  kind: "repairHull" | "restoreReadiness" | "resupply" | "refit" | "merge" | "split";
  cost: Partial<Record<CurrencyType, number>>;
  durationTurns: number;
};

export type StrategicFleetMissionOrder = {
  type: "mission";
  fleetId: string;
  mission: StrategicFleetState["mission"];
  planetId?: string;
  routeId?: string;
};
```

### 공격 명령 흐름

공격 명령은 바로 전술 전투로 들어가지 않고 전략 명령으로 먼저 저장합니다.

```txt
1. 아군 함대를 선택한다.
2. 목표 행성 또는 적 함대를 선택한다.
3. 항로 연결 여부를 확인한다.
4. ETA, 위험도, 예상 승률, 예상 손실을 표시한다.
5. 공격 명령을 확정한다.
6. StrategicFleetState.mission을 "attack"으로 설정한다.
7. 턴 진행 중 이동과 교전 조건을 계산한다.
8. 전투가 필요하면 FleetWorldOptions를 만든다.
9. gameobjects/fleet 전술 전투를 실행한다.
10. battle result를 StrategicFleetState와 StrategicPlanetState에 반영한다.
```

공격 가능 조건:

```txt
- 선택된 아군 함대가 있다.
- 목표가 적대 진영, 전쟁 상태, 또는 공격 가능한 중립 목표다.
- 함대 readiness가 최소 기준 이상이다.
- 목표까지 이동 가능한 항로가 있다.
- 함대가 정비 중이거나 이미 다른 고정 임무를 수행 중이지 않다.
- 봉쇄나 route security 때문에 이동 불가 상태가 아니다.
```

### 함대 정비

함대 정비는 전략 모드에서 중요한 회복/준비도 관리 기능입니다.

정비로 회복할 수 있는 값:

```txt
- hullRatio
- readiness
- supply
- 무기 재장전 상태
- 손상 함선 수
- 함대 편성 효율
```

정비 가능 조건:

```txt
- 현재 행성이 아군 또는 정비 가능한 중립 행성이다.
- 행성 industry가 충분하거나 shipyardContract 같은 특수 자원이 있다.
- 행성이 심한 봉쇄 상태가 아니다.
- 필요한 자원 또는 진영 treasury가 충분하다.
- 함대가 전투 중이거나 이동 중이 아니다.
```

정비 명령 종류:

```txt
repairHull
- hullRatio를 회복한다.

restoreReadiness
- readiness를 회복한다.

resupply
- supply를 회복한다.

refit
- 함대의 기본 편대, doctrine, 함선 구성을 조정한다.

merge
- 같은 행성의 아군 함대를 합친다.

split
- 함대를 여러 임무 단위로 나눈다.
```

### 이동과 항로

전략 은하에서 함대 이동은 항로 기반입니다.

```txt
- 연결된 행성으로만 이동한다.
- 긴 이동은 여러 route를 통과하는 path로 계산한다.
- route distance, security, blockadeLevel로 ETA와 위험도를 계산한다.
- 적대 항로를 통과하면 매복, 지연, 소모, 전투가 발생할 수 있다.
- 이동 중인 함대는 currentPlanetId와 routeId, targetPlanetId를 함께 가진다.
- 도착하면 routeId를 비우고 currentPlanetId를 갱신한다.
```

경로 미리보기에는 다음 정보를 표시합니다.

```txt
- 도착 예정 턴
- 통과 항로 목록
- 평균 security
- 봉쇄 위험
- 예상 supply 소모
- 적 함대 조우 가능성
```

### 예측과 미리보기

전략 명령은 확정 전에 결과를 예측해서 보여주는 것이 좋습니다.

```txt
공격 미리보기
- 예상 승률
- 예상 손실
- 전투 발생 위치
- 승리 시 행성 영향력 변화
- 패배 시 readiness 손실

이동 미리보기
- ETA
- route 위험도
- supply 소모
- 도착 후 가능한 임무

정비 미리보기
- 비용
- 소요 턴
- 완료 후 hullRatio/readiness/supply

봉쇄 미리보기
- 대상 행성 tradeValue 감소
- stability 압박
- 적 supply 감소
- 외교 관계 악화 가능성
```

예:

```txt
Atlas 공격
- 도착: 2턴 후
- 예상 승률: 64%
- 위험: Hades 항로 봉쇄 +18%
- 승리 시: Atlas contested 해제 가능
- 패배 시: Alpha Fleet readiness -40%
```

### 권장 UI 구조

행성 상세 패널은 탭 구조를 권장합니다.

```txt
개요
- 행성 기본 정보, 진영, 자원, 주요 스탯

진영
- influence 비율, 장악/경합 상태, 관계

함대
- 주둔 함대, 이동 중인 함대, 선택/공격/정비 명령

항로
- 연결 행성, traffic, security, blockade, tradeValue

시장
- 수요, 공급, 가격 압력, 특수 자원

로그
- 최근 턴 변화, 전투 결과, 봉쇄/정비 완료 기록
```

1차 UI는 `개요`와 `함대` 탭만 구현해도 충분합니다. 이후 전투, 교역, 진영 시스템이 붙을 때 나머지 탭을 확장합니다.

## 턴 처리

전략 은하 시스템은 도시와 진영, 함대 결과를 모아 행성 상태를 갱신합니다.

```txt
1. 이전 턴의 faction policy와 city output을 읽는다.
2. 행성별 market supply/demand를 갱신한다.
3. 도시별 localInfluence contribution을 계산한다.
4. factionInfluence와 controllingFactionId를 갱신한다.
5. 항로 traffic, tradeValue, security, blockade를 갱신한다.
6. 전략 함대 이동 ETA와 route progress를 처리한다.
7. 정비, 보급, refit 진행도를 처리한다.
8. 초계, 호위, 봉쇄, 증원 같은 전략 임무 효과를 적용한다.
9. 공격 명령과 적대 함대 조우를 보고 전투 발생 조건을 확인한다.
10. 필요한 경우 FleetWorld 전술 전투 입력 데이터를 만든다.
11. 전투 결과가 있으면 StrategicFleetState와 StrategicPlanetState에 반영한다.
12. galaxy view model 갱신 이벤트를 발행한다.
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
7. strategicgalaxy mode에서 우주 맵을 표시하고 행성 선택 이벤트를 연결한다.
8. 선택 행성 상세 패널에 개요와 함대 탭을 표시한다.
9. `StrategicFleetState`와 주둔 함대 목록을 view model에 포함한다.
10. 이동 명령과 정비 명령을 먼저 구현한다.
11. 공격 명령은 예상 승률/위험도 preview부터 구현한다.
12. 전투 발생 시 `gameobjects/fleet`의 `FleetWorldOptions`로 투영하는 adapter를 추가한다.
```
