# 함대 관리 및 정비 시스템 설계 (Fleet Management System Design)

## 1. 개요 (Overview)

본 문서는 플레이어가 소유한 함대(Fleet)를 점검하고 정비 명령을 발행하는 **함대 관리 화면(`FleetManagementState`)**의 설계 가이드입니다.

v1은 현재 저장 모델인 `StrategicFleetState`에 맞춰 **행성 주둔 함대 단위**로 동작합니다. 개별 함선 슬롯, 함선별 장비, 영속 함선 인벤토리는 `StrategicShipState` 또는 `ShipInventory` 같은 후속 데이터 모델을 추가한 뒤 확장합니다.

이 시스템은 게임의 전략적 루프에서 다음 역할을 수행합니다:
- **자원 소모처:** 전투로 소모된 함선을 수리하거나 새 함선을 구매함으로써 경제 시스템의 핵심 배출구 역할을 합니다.
- **전략적 준비:** 다음 전투(도시 공방전 또는 은하전)를 위해 아군 유닛의 구성을 최적화합니다.
- **성장 체감:** 더 강력한 함선을 획득하고 업그레이드함으로써 플레이어에게 성취감을 제공합니다.

---

## 2. 상태 전환 및 라우팅 (Routing)

`FleetManagementState`는 독립적인 게임 모드로 작동하며, 다음과 같은 진입/복귀 경로를 가집니다.

### 2.1 v1 진입 경로
- **은하 지도(`GalaxyMapState`) 우주정거장 클릭:** 특정 행성 궤도의 우주정거장 mesh를 클릭하면 해당 행성의 함대 관리 화면으로 진입합니다.
- **은하 지도 행성 명령:** `GalaxyMapUI` 요약 탭의 `[함대 관리]` 명령으로도 같은 화면에 진입합니다. 버튼은 항상 클릭 가능하지만, 우주정거장이 없는 행성에서는 Toast로 안내하고 모드 전환은 하지 않습니다.

### 2.2 복귀 경로
- **Context 기반 복귀:** `FleetManagementContextStore`에 저장된 `returnModeId`를 참조하여 이전 화면으로 복귀합니다. v1에서는 `GameModeId.Galaxy`로 돌아가며, `CitySceneSessionStore.setGalaxyReturnFocus({ planetId })`로 진입 행성 focus를 복원합니다.

```typescript
interface FleetManagementContext {
  planetId: StrategicPlanetId;
  returnModeId: GameModeId;
  initialFleetId?: string;
}
```

`SimcityState`의 조선소/항만 진입과 `CityWalkState` 내부 상호작용은 v2 확장으로 둡니다.

---

## 3. 핵심 기능 (Core Features)

### 3.1 함대 구성 및 배치 (Fleet Organization)
- **주둔 함대 목록:** `FleetManagementContext.planetId`에 현재 주둔 중인 `StrategicFleetState` 목록을 표시합니다.
- **함대 상세:** 선택한 함대의 `strength`, `mission`, `hullRatio`, `readiness`, `supply`, `etaTurns`를 표시합니다.
- **개별 함선 영역:** v1에서는 개별 함선 영속 데이터가 없으므로 안내 placeholder를 표시합니다. 실제 함선 슬롯/장비 UI는 후속 `StrategicShipState`/`ShipInventory` 도입 후 연결합니다.

### 3.2 수리 시스템 (Repair & Maintenance)

수리는 `StrategicFleetMaintenanceOrder`를 `EventTypes.StrategicFleetOrderRequested`로 발행하여 `StrategicFleetManager`에 전달하는 방식으로 처리합니다.

현재 `StrategicFleetManager` 구현은 `durationTurns`를 정비 큐로 누적하지 않고, 다음 `advanceTurn()`에서 정비 효과를 즉시 적용합니다. 턴 지연 정비를 구현하려면 별도의 pending maintenance 상태가 필요합니다.

지원하는 정비 종류 (`StrategicFleetMaintenanceKind`):

| Kind | 설명 |
|---|---|
| `RepairHull` | 손상된 함선 외장(hullRatio) 수리 |
| `RestoreReadiness` | 전투 준비도(readiness) 회복 |
| `Resupply` | 보급품(supply) 재적재 |
| `Refit` | 무기·모듈 교체 개조 |
| `Merge` | 두 함대를 하나로 합병 |
| `Split` | 함대를 두 개로 분리 |

- **상태 확인:** `StrategicFleetState.hullRatio`, `readiness`, `supply` 수치를 읽어 함대 상태를 시각화합니다.
- **정비 실행:** `WalletManager.subtractMany(cost)`로 비용을 원자 차감한 뒤 `StrategicFleetMaintenanceOrder`를 발행합니다. 비용 타입은 `CostVector`(`Partial<Record<CurrencyType, number>>`)를 사용합니다.
- **일괄 수리:** 개별 함선 데이터가 도입된 뒤 확장합니다. v1은 선택 함대 단위 정비만 제공합니다.

### 3.3 함선 건조 및 폐기 (Shipyard)
v1 화면에는 건조/폐기를 표시하지 않습니다. 후속 구현에서는 `ControllableDefinition` 기반 함선 기종을 strict union으로 제한하고, 구매는 `StrategicFleetState` 또는 `StrategicShipState` 생성, 판매는 `WalletManager.addMany()` 회수로 처리합니다.

현재 정의된 후보 기종:
- `ship.scout` (정찰함)
- `ship.fighter` (전투기)
- `ally.escort` (호위함)

### 3.4 강화 및 개조 (Refit & Upgrade)
- **v1 개조:** `StrategicFleetMaintenanceKind.Refit`은 함대 `strength`를 증가시키고 `readiness`를 일부 낮추는 전략 단위 효과로 처리합니다.
- **v2 개별 개조:** 무기 슬롯, 엔진, 장갑, 레이더 같은 개별 함선 모듈은 `StrategicShipState`가 생긴 뒤 추가합니다.

---

## 4. 기술 아키텍처 (Technical Architecture)

### 4.1 계층 분리 원칙

함대 시스템은 **전략 계층**과 **전술 계층**이 엄격히 분리되어 있습니다. `FleetManagementState`는 전략 계층만 다룹니다.

```
전략 계층 (gameobjects/strategicgalaxy/)
  StrategicGalaxyManager  — 함대 상태의 Source of Truth
  StrategicFleetState     — 저장 가능한 canonical 상태
    id, factionId, currentPlanetId, mission
    strength, readiness, hullRatio, supply
  StrategicFleetMaintenanceOrder — 수리/개조 명령
  StrategicFleetManager   — advanceTurn() 시 명령 처리

전술 계층 (gameobjects/fleet/)  ← FleetManagementState와 무관
  Fleet, FleetWorld       — 전투 중에만 생성/소멸
  FighterShipRuntime      — 전술 런타임 (저장 대상 아님)
```

### 4.2 클래스 구조
- `FleetManagementState`: 메인 상태 클래스. v1에서는 DOM UI를 오케스트레이션하고 전략 함대 정비 명령을 발행합니다.
- `StrategicGalaxyManager`: 함대 데이터의 Source of Truth. `StrategicFleetState` 목록을 소유하고 함선 상태를 유지합니다.
- `FleetDockRenderer`: 수리창(Dock) 배경 및 함선 프리뷰 모델 렌더러. v2 개별 함선 프리뷰에서 신규 구현합니다.

### 4.3 데이터 흐름 (Data Flow)
1. `Init()` 시 `StrategicGalaxyManager`로부터 플레이어의 `StrategicFleetState` 목록을 가져옵니다.
2. 선택한 함대의 전략 상태를 상세 패널에 표시합니다.
3. UI에서 '수리' 클릭 시:
   - `WalletManager.subtractMany(cost)`로 비용 차감
   - `StrategicFleetMaintenanceOrder`를 `StrategicFleetManager`에 발행
   - 현재 구현에서는 다음 전략 턴 `advanceTurn()`에서 정비 효과 반영
4. 변경된 `StrategicFleetState`는 다음 전투(`CityCombatState`) 진입 시 `FleetWorldFleetOptions`로 변환되어 전술 런타임에 투영됩니다.

---

## 5. UI/UX 디자인 (UX Specification)

### 5.1 구현 기술
- **순수 DOM 방식** (React/Vue 없음). 화면 전용 scoped CSS를 사용하고, Bootstrap은 기존 공통 스타일이 필요한 경우에만 보조적으로 사용합니다.
- 기존 `FleetPanel`, `ShipDetailPanel` (`src/gsdk/src/ux/fleet/`) 패턴을 참고하여 구현.
- UI는 `FleetManagementPanelController` 계약 인터페이스를 통해 로직과 분리합니다.

### 5.2 시각적 구성
- **좌측 목록:** 현재 행성에 주둔 중인 함대 카드 목록. `hullRatio`, `readiness`, `supply` 미니 상태 바 포함.
- **상세 정보 (Right):** 선택한 함대의 전략 스탯과 정비 액션 표시.
- **개별 함선 영역:** v1에서는 후속 데이터 모델 안내 placeholder를 표시합니다.
- **액션 영역:** [외장 수리], [준비도 회복], [보급], [개조], [돌아가기] 버튼 배치.

### 5.3 Squad 시스템과의 경계

`squad-management-system.md`는 병영/지상 유닛의 대기 병력과 부대 편성을 다룹니다. `FleetManagementState`는 우주 함대/함선 정비를 담당하며, 두 시스템은 v1에서 병합하지 않습니다.

추후 수송선, 상륙전, 지상군 탑재가 필요하면 함대의 cargo 또는 attachment 모델로 `Squad`를 참조합니다.

---

## 6. 검증 및 테스트 항목

- **트랜잭션 안전성:** `WalletManager.subtractMany(cost)` 실패 시 정비 명령이 발행되지 않고 지갑 상태가 유지되는지 확인.
- **정비 명령 처리:** 다음 전략 턴 처리 후 `StrategicFleetState.hullRatio`, `readiness`, `supply`, `strength`가 정비 종류에 맞게 갱신되는지 확인.
- **데이터 영속성:** 관리 화면에서 변경한 함대 구성(`StrategicFleetState`)이 실제 전투 씬(`CityCombatState`) 진입 시 `FleetWorldFleetOptions`로 올바르게 변환되는지 확인.
- **복귀 경로:** `FleetManagementContextStore.returnModeId`를 통해 올바른 이전 화면(은하 또는 도시)으로 복귀하는지 확인.
- **GalaxyMap 진입점:** 우주정거장 클릭 및 정거장 보유 행성의 `[함대 관리]` 명령이 동일한 context로 진입하는지 확인.
- **정거장 없음 안내:** 정거장이 없는 행성의 `[함대 관리]` 클릭 시 Toast가 표시되고 `FleetManagementState`로 전환되지 않는지 확인.
- **리소스 정리:** 화면을 나갈 때 DOM UI와 이벤트 리스너가 완전히 해제되는지 확인.
