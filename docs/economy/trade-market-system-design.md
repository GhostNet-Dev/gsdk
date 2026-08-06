# 전략 은하 무역 및 시장 경제 시스템 설계 (Trade & Market System Design)

## 1. 개요 (Overview)

본 문서는 게임 내 미시 경제(플레이어의 지갑, 자원)와 거시 경제(행성의 시장 규모, 수요와 공급)가 어떻게 상호작용하는지, 그리고 이를 기반으로 플레이어가 어떻게 무역(Trade)을 수행할 수 있는지에 대한 설계 원칙과 구현 방향을 정의합니다.

### 1.1. 턴 파이프라인

매 턴마다 아래 순서로 시장이 갱신됩니다.

```
advanceTurn()
  └─ 각 행성별
       ├─ 도시 자원 생산량 수집 (CityTurnOutput)
       ├─ updateMarketFromCityOutputs()   ← 공급/수요/포화도/가격 압력 계산
       ├─ 항로 tradeValue / traffic 갱신
       └─ PlanetTurnOutput 생성 (marketPressure 포함)
```

> 관련 파일: `strategicgalaxymanager.ts` → `trademarket.ts`

---

## 2. 미시 경제와 거시 경제의 분리

게임의 경제는 두 가지 계층으로 나뉘어 시뮬레이션됩니다.

* **미시 경제 (Micro Economy):** 플레이어와 AI 경쟁 도시가 실제로 소유하고 소비하는 구체적인 재화량입니다. (`wallet.ts`의 `CurrencyType` 기반)
* **거시 경제 (Macro Economy):** 행성 자체가 가지는 경제적 잠재력 및 환경 변수입니다. (`strategicgalaxytypes.ts`의 `StrategicPlanetStats` 및 `PlanetMarketState`)

### 2.1. 행성의 핵심 경제 지표

| 지표 | 필드 | 설명 |
|------|------|------|
| 기본 자원 보너스 | `resourceBias` | 행성의 천연 자원 매장량 및 비옥도. 특정 자원의 생산량을 배수로 증폭합니다. (예: 식량 ×1.5) |
| 시장 규모 | `marketScale` | 행성이 내부적으로 소화할 수 있는 자원의 기본 수요(Demand) 한계치. 행성의 '그릇 크기'. |
| 경제력 | `economy` | 항로의 물류량(`traffic`)과 교역 가치(`tradeValue`)를 결정하는 인프라 지표. |
| 항로 상태 | `StrategicRouteState` | 행성 간 실제 교역 활성도. 아래 항목 참조. |

### 2.2. 항로 상태 (StrategicRouteState)

행성과 행성을 잇는 각 항로는 독립적인 상태를 가집니다.

```
traffic    = 10 + (두 행성 경제력 평균 / 100) × 40
tradeValue = 15 + (두 행성 경제력 평균 / 100) × 50 − blockadeLevel × 5
security   = 기본값 70 − blockadeLevel × 5
```

* **봉쇄(Blockade):** 적 함대가 항로를 봉쇄하면 `blockadeLevel`이 증가하여 `tradeValue`와 `security`가 감소합니다.
* 봉쇄가 해제되면 다음 턴에 자동으로 회복됩니다.

> 관련 파일: `strategicgalaxymanager.ts` (updateRoutes), `strategicfleetmanager.ts`

---

## 3. 가격 압력 (Price Pressure) 계산 원리

매 턴마다 해당 행성에 위치한 **모든 도시(플레이어 + AI 경쟁 도시)** 의 자원 생산량이 합산되어 행성의 **공급(Supply)** 이 됩니다.

`resourceBias`는 행성 정의에서 **생산량 배수**로 취급합니다. 예를 들어 `[CurrencyType.Food]: 1.5`는 식량 생산량 +50%입니다.

> 현재 구현 참고: `strategicgalaxydefs.ts`, `galaxyviewmodel.ts`는 `resourceBias`를 배수로 해석합니다. 반면 `rivalcityeconomy.ts`의 `applyBiases()`는 `1 + planetBonus` 형태로 적용하고 있어, 구현 단계에서 배수 의미로 통일해야 합니다.

### 3.1. 정확한 계산 공식

수요는 공급량에 비례시키지 않습니다. 공급량에 수요가 비례하면 `supply / demand`가 사실상 상수로 고정되어, 실제 공급 증감이 가격에 거의 반영되지 않기 때문입니다.

```typescript
const BASE_DEMAND: Record<TradeableCurrencyType, number> = {
  [CurrencyType.Wood]: 80,
  [CurrencyType.Water]: 70,
  [CurrencyType.Electric]: 50,
  [CurrencyType.Food]: 90,
  [CurrencyType.Materials]: 60,
  [CurrencyType.Gems]: 12,
};
```

```
// 수요 (Demand)
demand[k]       = BASE_DEMAND[k] × (marketScale / 100)

// 포화도 (Saturation) — 상한 2.0 고정
saturation[k]   = demand[k] > 0 ? min(2.0, supply[k] / demand[k]) : 0

// 가격 압력 (PricePressure) — 범위: −0.20 ~ +0.15
pricePressure[k] =
  saturation[k] > 1.0 → max(-0.20, −(saturation[k] − 1) × 0.2)
  saturation[k] ≤ 1.0 → min(+0.15,  (1 − saturation[k]) × 0.15)
```

* `supply[k] = 0`이면 `saturation[k] = 0`, `pricePressure[k] = +0.15`입니다.
* `supply[k] = demand[k]`이면 `saturation[k] = 1`, `pricePressure[k] = 0`입니다.
* 포화도는 최대 2.0으로 제한하고, 가격 압력은 −20% ~ +15%로 제한합니다.

> 관련 파일: `trademarket.ts` (updateMarketFromCityOutputs, computePricePressure)

### 3.2. 가격 압력 예시

| 상황 | 포화도 | 가격 압력 | 의미 |
|------|--------|-----------|------|
| 극단적 희소 | 0.0 | +15% | 자원 없음, 최고가 |
| 부족 | 0.5 | +7.5% | 수요 대비 공급 부족 |
| 균형점 | 1.0 | 0% | 수급 균형 |
| 공급 과잉 | 1.2 | −4% | 잉여 누적 시작 |
| 최대 공급 과잉 | 2.0 | −20% | 포화 상태, 최저가 |

### 3.3. AI 경쟁 도시의 시장 영향

플레이어 도시뿐만 아니라 **AI 경쟁 도시(Rival Cities)** 도 행성 공급에 기여합니다.

* 의도한 계산은 각 건물 생산량에 `cityBias × factionBias × planetResourceBias` 계수를 적용하는 것입니다.
* 따라서 AI 도시가 많은 행성일수록 포화도가 높아지고 가격이 하락할 수 있습니다.
* 플레이어는 AI 도시 수와 해당 행성의 `resourceBias`를 고려하여 생산 전략을 수립해야 합니다.

> 관련 파일: `rivalcityeconomy.ts` (applyBiases), `rivalcitymanager.ts`

---

## 4. 거래 가능 자원 목록

모든 `CurrencyType`이 무역소에서 거래 가능한 것은 아닙니다.

| 자원 | 거래 가능 | 비고 |
|------|-----------|------|
| Gold | ❌ | 거래 기준 통화. 자원 거래의 결제 수단으로만 사용 |
| Wood | ✅ | |
| Water | ✅ | |
| Electric | ✅ | |
| Food | ✅ | |
| Materials | ✅ | |
| Gems | ✅ | |
| People | ❌ | 인구, 거래 불가 |
| Points | ❌ | 게임 점수, 거래 불가 |
| Exp | ❌ | 경험치, 거래 불가 |

### 4.1. Strict 타입

구현에서는 `CurrencyType` 전체를 직접 받지 말고, 거래 가능한 자원 타입을 별도로 제한합니다.

```typescript
type TradeableCurrencyType = Exclude<
  CurrencyType,
  CurrencyType.Gold | CurrencyType.People | CurrencyType.Points | CurrencyType.Exp
>;

const TRADEABLE_CURRENCY_TYPES = [
  CurrencyType.Wood,
  CurrencyType.Water,
  CurrencyType.Electric,
  CurrencyType.Food,
  CurrencyType.Materials,
  CurrencyType.Gems,
] as const satisfies readonly TradeableCurrencyType[];
```

---

## 5. 무역소(Trade View) UI 구현 계획

위의 시장 경제 시뮬레이션 결과를 플레이어가 직접 체감하고 이용할 수 있도록 무역 UI를 추가합니다.

### 5.1. 거래 가격 산출 공식

```typescript
const BASE_PRICE: Record<TradeableCurrencyType, number> = {
  [CurrencyType.Wood]: 3,
  [CurrencyType.Water]: 4,
  [CurrencyType.Electric]: 8,
  [CurrencyType.Food]: 5,
  [CurrencyType.Materials]: 7,
  [CurrencyType.Gems]: 40,
};
```

```
unitPrice = BASE_PRICE[resourceType] × (1 + pricePressure)
totalGold = Math.floor(unitPrice × quantity)

매각(Sell): 플레이어가 totalGold 획득, resourceType quantity 감소
구매(Buy):  플레이어가 totalGold 지불, resourceType quantity 증가
```

* `BASE_PRICE`는 자원별로 고정된 기준가입니다.
* 거래 수량은 `Number.isInteger(quantity) && quantity > 0`만 허용합니다.
* 매수/매도 실행 직전에 `WalletManager` 상태를 재검증합니다.
* 검증 실패 시 어떤 재화도 변경하지 않습니다.
* 공급 과잉 시 단위 가격 하락 → 매각 손해, 구매 이득
* 공급 부족 시 단위 가격 상승 → 매각 이득, 구매 손해

### 5.2. 트랜잭션 계약

`TradeView`는 지갑을 직접 변경하지 않습니다. 가격 산출, 검증, 지갑 변경은 `TradeService` 또는 동등한 application service가 원자적으로 처리합니다.

```typescript
type TradeAction = 'buy' | 'sell';

interface TradeRequest {
  action: TradeAction;
  resource: TradeableCurrencyType;
  quantity: number;
  planetId: StrategicPlanetId;
}

interface TradeQuote {
  unitPrice: number;
  totalGold: number;
  pricePressure: number;
}

type TradeResult =
  | { ok: true; quote: TradeQuote }
  | { ok: false; reason: string };
```

권장 실행 순서:

1. `TradeRequest`의 `resource`, `quantity`, `planetId`를 검증합니다.
2. 현재 `PlanetMarketState.pricePressure[resource]`와 `BASE_PRICE`로 `TradeQuote`를 계산합니다.
3. 매도는 보유 자원 수량, 매수는 골드 잔액을 `WalletManager`에서 재검증합니다.
4. 검증이 모두 성공하면 한 함수 안에서 차감과 지급을 순서대로 수행합니다.
5. 성공/실패 결과를 `TradeResult`로 반환하고, 실패 시 지갑 상태는 그대로 유지합니다.

v1에서는 거래 직후 행성의 `supply/demand`를 즉시 변경하지 않습니다. 가격 변동은 다음 턴 시장 갱신 결과부터 반영합니다.

### 5.3. 상호작용 연동

v1 무역소는 `SimcityState`의 ring menu에서 엽니다. `SimcityState`가 이미 `soulDlg`, `wallet`, `galaxyManager`를 모두 보유하고 있으므로 별도 `OpenTradeMarket` 이벤트나 Market 건물 커맨드를 추가하지 않습니다.

```
SimcityState ring menu [무역소]
  └─ openTradeMarket()
       ├─ galaxyManager.getPlayerCityPlacement()로 현재 행성 확인
       ├─ galaxyManager.getPlanetMarketState()로 marketState 조회
       ├─ TradeService(wallet, getMarketState) 생성
       └─ soulDlg.openTrade({ planetId, marketState, wallet, quoteTrade, onTrade })
```

플레이어 도시 배치나 행성 시장 상태를 찾을 수 없으면 알림을 표시하고 다이얼로그를 열지 않습니다. Market 건물 선택 패널 연동은 추후 확장으로 남깁니다.

### 5.4. TradeView 컴포넌트 (`souldialog/views/tradeview.ts`)

**Props 인터페이스:**

```typescript
type TradeViewProps = {
  planetId: StrategicPlanetId;
  marketState: PlanetMarketState;  // pricePressure 포함
  wallet: Readonly<Wallet>;
  quoteTrade: (request: TradeRequest) => TradeResult;
  onTrade: (request: TradeRequest) => TradeResult;
};
```

`TradeView`는 `TRADEABLE_CURRENCY_TYPES`만 순회합니다. `Gold`, `People`, `Points`, `Exp`는 행 목록에 노출하지 않습니다.

**화면 구성 (행(row) 목록 방식):**

```
┌─────────────────────────────────────────────────────────────┐
│ 아이콘 │ 자원명    │ 시세      │ 보유량 │  수량  │ [매각] [구매] │
│  🪵   │ Wood     │ +12%     │  240  │ [100] │ [매각] [구매] │
│  💧   │ Water    │  −8%     │   80  │  [50] │ [매각] [구매] │
│  ⚡   │ Electric │  +3%     │   30  │  [30] │ [매각]  구매  │  ← 골드 부족 시 구매 비활성
│  🌾   │ Food     │ −20%     │    0  │   [0] │  매각  [구매] │  ← 보유량 0 시 매각 비활성
└─────────────────────────────────────────────────────────────┘
```

**버튼 비활성화 조건:**

| 상황 | 매각 버튼 | 구매 버튼 |
|------|-----------|-----------|
| 해당 자원 보유량 = 0 | ❌ 비활성 | — |
| 골드 잔액 < 구매 비용 | — | ❌ 비활성 |
| 수량 입력값 = 0 | ❌ 비활성 | ❌ 비활성 |
| 수량 입력값이 정수가 아님 | ❌ 비활성 | ❌ 비활성 |

**수량 입력:** 숫자 직접 입력 또는 최대값 버튼 제공

> 구현 참고 패턴: `shopview.ts` (행 목록 + 아이콘), `inventoryview.ts` (필터 + 수량 관리)

### 5.5. 시스템 등록

| 단계 | 파일 | 작업 내용 |
|------|------|-----------|
| 1 | `souldlgtypes.ts` | `DialogType`에 `'trade'` 추가 |
| 2 | `dlgmanager.ts` | `titleFor('trade')` → `'무역소'` 반환 케이스 추가 |
| 3 | `souldlgfab.ts` | `manager.registry.register('trade', () => new TradeView())` 추가 |
| 4 | `views/tradeview.ts` | `IDialogView<TradeViewProps>` 구현 (mount / update / unmount) |
| 5 | `SimcityState` | ring menu에 `[무역소]` 항목 추가 |
| 6 | `SimcityState` | 현재 행성, marketState, wallet snapshot, trade service를 조립해 `soulDlg.openTrade(props)` 호출 |

현재 `DialogRegistry`는 props를 factory에 전달하지 않습니다. 따라서 아래 형태가 올바릅니다.

```typescript
manager.registry.register('trade', () => new TradeView());
manager.open('trade', tradeProps, { wide: true, icon: 'trade' });
```

`TradeView`는 생성자에서 props를 받지 않고 `mount(ctx, props)`에서 props를 받습니다.

### 5.6. 항로와 봉쇄의 v1 범위

v1 무역 가격은 `BASE_PRICE`와 행성별 `pricePressure`만 사용합니다. 항로의 `tradeValue`, `traffic`, `security`, `blockadeLevel`은 가격 공식에 직접 반영하지 않습니다.

봉쇄와 항로 상태는 이후 확장 지점으로 남깁니다.

* 봉쇄 중인 행성/항로에서 거래 가능 여부 제한
* `tradeValue` 기반 매수/매도 수수료
* `traffic` 기반 턴당 최대 거래량
* `security` 기반 거래 실패 또는 약탈 위험

---

## 6. 현재 구현 상태

| 설계 요소 | 구현 | 관련 파일 |
|-----------|------|-----------|
| CurrencyType / WalletManager | ✅ | `inventory/wallet.ts` |
| PlanetMarketState 타입 정의 | ✅ | `strategicgalaxytypes.ts` |
| StrategicRouteState 타입 정의 | ✅ | `strategicgalaxytypes.ts` |
| resourceBias, marketScale 행성 정의 | ✅ | `strategicgalaxydefs.ts` |
| `resourceBias` 배수 의미 통일 | ✅ | `rivalcityeconomy.ts`, `buildingmanager.ts` |
| updateMarketFromCityOutputs() | ✅ | `BASE_DEMAND × marketScale` 공식 반영 |
| computePricePressure() | ✅ | `trademarket.ts` |
| advanceTurn() 시장 갱신 통합 | ✅ | `strategicgalaxymanager.ts` |
| 항로 tradeValue / traffic 갱신 | ✅ | `strategicgalaxymanager.ts` |
| 함대 봉쇄 → tradeValue 감소 | ✅ | `strategicfleetmanager.ts` |
| AI 경쟁 도시 생산량 반영 (applyBiases) | ✅ | `rivalcityeconomy.ts` |
| TradeableCurrencyType / BASE_PRICE / BASE_DEMAND | ✅ | `trademarket.ts` |
| TradeService 또는 동등한 거래 application service | ✅ | `tradeservice.ts` |
| ring menu `[무역소]` 항목 | ✅ | `simcitystate.ts` |
| `'trade'` DialogType 등록 | ✅ | `souldlgtypes.ts` |
| dlgmanager / registry 등록 | ✅ | `dlgmanager.ts`, `souldlgfab.ts` |
| TradeView 컴포넌트 구현 | ✅ | `views/tradeview.ts` |

---

## 7. 구현 검증 계획

구현 후 아래 항목을 검증합니다.

| 검증 항목 | 기대 결과 |
|-----------|-----------|
| `supply = 0` | `saturation = 0`, `pricePressure = +15%` |
| `supply = demand` | `saturation = 1`, `pricePressure = 0%` |
| 공급 과잉 | `pricePressure`가 최저 `-20%`에서 멈춤 |
| 공급 부족 | `pricePressure`가 최고 `+15%`에서 멈춤 |
| 거래 목록 | `Gold`, `People`, `Points`, `Exp`는 노출되지 않음 |
| 보유량 부족 매도 | 실패하고 지갑 변경 없음 |
| 골드 부족 매수 | 실패하고 지갑 변경 없음 |
| `qty <= 0` 또는 소수 수량 | 실패하고 지갑 변경 없음 |
| ring menu | `[무역소]` 항목이 표시되고 클릭 가능 |
| TradeView 열기 | 미등록 다이얼로그 오류 없이 열림 |

코드 구현 후에는 repo의 기존 빌드 명령으로 빌드를 확인합니다.

```
npm run build
```

> 루트 앱 기준 `npm run build`로 빌드를 확인합니다. `src/gsdk` 단독 빌드는 기존 agent/QR 선택 의존성 누락이 해소된 뒤 별도로 확인합니다.

---

## 8. 결론 및 전략적 의의

플레이어는 단순히 자원을 많이 생산(`resourceBias` 활용)하는 1차원적 플레이를 넘어, 다음과 같은 고차원적 경제 전략을 수립하게 됩니다.

1. **생산 특화 행성 파악:** `resourceBias`가 높은 행성에 해당 자원 생산 도시를 집중 배치
2. **시장 포화 회피:** 행성의 `marketScale` 한계를 의식하며 공급 과잉(가격 하락)을 방지
3. **AI 경쟁 도시 모니터링:** AI 도시가 같은 자원을 대량 생산하면 포화도가 상승 → 타 자원으로 전환
4. **항로 봉쇄 전략:** v1 이후 확장에서 `tradeValue`, 거래량, 수수료, 거래 가능 여부를 압박
5. **무역소 타이밍 거래:** `pricePressure`가 양수(+)일 때 매각, 음수(−)일 때 구매하여 시세 차익 획득
